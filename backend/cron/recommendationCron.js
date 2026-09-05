import cron from "node-cron";
import db from "../db/db.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

// ─── Global rate-limit queue ──────────────────────────────────────────────────
// Render free tier rejects concurrent requests with 429.
// This queue ensures all ML calls — from cron, login, and the controller —
// go out one at a time with a gap between them.

const ML_CALL_INTERVAL_MS = 2000; // min ms between ML HTTP calls
let mlCallQueue = Promise.resolve();  // chain all calls onto this

function queueMLCall(fn) {
  const next = mlCallQueue.then(
    () => new Promise((resolve) => setTimeout(resolve, ML_CALL_INTERVAL_MS))
  ).then(fn);

  // The queue only tracks the chain, not individual results.
  // Swallow errors here so a failed call doesn't break the chain.
  mlCallQueue = next.catch(() => {});

  return next;
}

// ─── Map recommender.py's "type" field to DB enum values ─────────────────────

function mapType(type) {
  if (type === "content-tfidf")    return "content";
  if (type === "tfidf-fallback")   return "fallback";
  if (type === "collaborative-ml") return "collaborative";
  return "popular";
}

// ─── Core: call ML service for one user, upsert into cache ──────────────────

async function runRecommenderForUser(userId) {
  if (!ML_SERVICE_URL) {
    throw new Error("ML_SERVICE_URL not configured");
  }

  console.log(`[RecommendationCron] 🌐 Calling ML service for user ${userId}...`);

  const res = await fetch(`${ML_SERVICE_URL}/recommend/${userId}?top_n=10`, {
    method: "GET",
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[RecommendationCron] ❌ ML service error for user ${userId}: ${res.status} — ${text.slice(0, 200)}`);
    throw new Error(`ML service returned ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const recommendations = data.recommendations || [];

  console.log(`[RecommendationCron] ✅ ML service returned ${recommendations.length} recs for user ${userId}`);

  if (!recommendations.length) {
    return { userId, count: 0 };
  }

  const now = new Date();
  const values = recommendations.map((r) => [
    userId,
    r.id,
    r.score ?? 0,
    mapType(r.type),
    now,
  ]);

  await db.query(
    `INSERT INTO recommendation_cache (user_id, book_id, score, reason, computed_at)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       score       = VALUES(score),
       reason      = VALUES(reason),
       computed_at = VALUES(computed_at)`,
    [values]
  );

  console.log(`[RecommendationCron] 💾 Cached ${recommendations.length} recs for user ${userId}`);

  return { userId, count: recommendations.length };
}

// ─── Batch: refresh all active users ─────────────────────────────────────────

async function refreshAllRecommendations() {
  console.log("[RecommendationCron] Starting full refresh...");

  if (!ML_SERVICE_URL) {
    console.warn("[RecommendationCron] ML_SERVICE_URL not set, skipping refresh.");
    return;
  }

  let users;
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT u.id
       FROM users u
       INNER JOIN borrows b ON b.user_id = u.id
       WHERE b.borrowed_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
         AND u.role = 'student'
       ORDER BY u.id`
    );
    users = rows;
  } catch (err) {
    console.error("[RecommendationCron] Failed to fetch active users:", err.message);
    return;
  }

  if (users.length === 0) {
    console.log("[RecommendationCron] No active users found, skipping.");
    return;
  }

  console.log(`[RecommendationCron] Refreshing ${users.length} users sequentially (rate-limited)...`);

  let success = 0;
  let failed = 0;

  // Sequential — one user at a time through the queue, no concurrent ML calls
  for (const user of users) {
    try {
      await queueMLCall(() => runRecommenderForUser(user.id));
      success++;
    } catch (err) {
      failed++;
      console.error(`[RecommendationCron] Failed for user ${user.id}:`, err.message);
    }
  }

  await db.query(
    `DELETE FROM recommendation_cache
     WHERE computed_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)`
  );

  console.log(
    `[RecommendationCron] Done — ✓ ${success} succeeded, ✗ ${failed} failed.`
  );
}

// ─── Debounce: skip refresh if this user's cache is still fresh ─────────────

const REFRESH_DEBOUNCE_MINUTES = 30; // raised from 15 to reduce ML calls further

async function wasRecentlyRefreshed(userId) {
  const [rows] = await db.query(
    `SELECT 1 FROM recommendation_cache
     WHERE user_id = ?
       AND computed_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
     LIMIT 1`,
    [userId, REFRESH_DEBOUNCE_MINUTES]
  );

  const fresh = rows.length > 0;
  console.log(`[RecommendationCron] 🔍 Cache freshness check for user ${userId}: ${fresh ? "FRESH (skip)" : "STALE (proceed)"}`);
  return fresh;
}

// ─── In-flight lock: one Promise per user so concurrent callers share one call ─

const inFlightRefresh = new Map();

// ─── Single-user refresh (call after borrow / return, or on login) ──────────

export async function refreshForUser(userId) {
  if (!ML_SERVICE_URL) {
    console.warn(`[RecommendationCron] ⚠️ ML_SERVICE_URL not set — skipping refresh for user ${userId}`);
    return;
  }

  if (inFlightRefresh.has(userId)) {
    console.log(
      `[RecommendationCron] 🔒 Refresh already in-flight for user ${userId} — returning existing promise`
    );
    return inFlightRefresh.get(userId);
  }

  console.log(`[RecommendationCron] 🚀 Starting refresh for user ${userId}...`);

  const promise = (async () => {
    try {
      if (await wasRecentlyRefreshed(userId)) {
        console.log(
          `[RecommendationCron] ⏭️  Skipping refresh for user ${userId} — cache is fresh (< ${REFRESH_DEBOUNCE_MINUTES}m old)`
        );
        return;
      }

      // Go through the shared queue so this doesn't fire on top of a batch
      await queueMLCall(() => runRecommenderForUser(userId));
      console.log(`[RecommendationCron] ✅ Refresh complete for user ${userId}`);
    } catch (err) {
      console.error(
        `[RecommendationCron] ❌ Failed to refresh user ${userId}:`,
        err.message
      );
    } finally {
      inFlightRefresh.delete(userId);
      console.log(`[RecommendationCron] 🔓 Lock released for user ${userId}`);
    }
  })();

  inFlightRefresh.set(userId, promise);
  return promise;
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export function startRecommendationCron() {
  cron.schedule("0 */6 * * *", refreshAllRecommendations, {
    timezone: "Asia/Manila",
  });

  console.log("[RecommendationCron] Scheduled — runs every 6 hours (Asia/Manila).");

  // Delay startup warm-up longer so the server is fully ready,
  // and so any login-triggered refreshes that happen right at boot
  // don't collide with the batch.
  setTimeout(() => {
    console.log("[RecommendationCron] Running startup warm-up...");
    refreshAllRecommendations();
  }, 60_000); // was 30s, now 60s
}