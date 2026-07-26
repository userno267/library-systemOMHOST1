import cron from "node-cron";
import db from "../db/db.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

// ─── Map recommender.py's "type" field to DB enum values ─────────────────────

function mapType(type) {
  if (type === "content-tfidf")   return "content";
  if (type === "tfidf-fallback")  return "fallback";
  if (type === "collaborative-ml") return "collaborative";
  return "popular";
}

// ─── Core: call ML service for one user, upsert into cache ──────────────────

async function runRecommenderForUser(userId) {
  if (!ML_SERVICE_URL) {
    throw new Error("ML_SERVICE_URL not configured");
  }

  const res = await fetch(`${ML_SERVICE_URL}/recommend/${userId}?top_n=10`, {
    method: "GET",
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ML service returned ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const recommendations = data.recommendations || [];

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

  console.log(`[RecommendationCron] Refreshing ${users.length} users...`);

  let success = 0;
  let failed = 0;

  const BATCH_SIZE = 5;
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((u) => runRecommenderForUser(u.id))
    );

    results.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        success++;
      } else {
        failed++;
        console.error(
          `[RecommendationCron] Failed for user ${batch[idx].id}:`,
          r.reason?.message
        );
      }
    });

    if (i + BATCH_SIZE < users.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
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

const REFRESH_DEBOUNCE_MINUTES = 15;

async function wasRecentlyRefreshed(userId) {
  const [rows] = await db.query(
    `SELECT 1 FROM recommendation_cache
     WHERE user_id = ?
       AND computed_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
     LIMIT 1`,
    [userId, REFRESH_DEBOUNCE_MINUTES]
  );
  return rows.length > 0;
}

// ─── Single-user refresh (call after borrow / return, or on login) ──────────

export async function refreshForUser(userId) {
  if (!ML_SERVICE_URL) return;

  try {
    if (await wasRecentlyRefreshed(userId)) {
      console.log(
        `[RecommendationCron] Skipping refresh for user ${userId} — cache is fresh (< ${REFRESH_DEBOUNCE_MINUTES}m old)`
      );
      return;
    }

    const result = await runRecommenderForUser(userId);
    console.log(
      `[RecommendationCron] Refreshed ${result.count} recs for user ${userId}`
    );
  } catch (err) {
    console.error(
      `[RecommendationCron] Failed to refresh user ${userId}:`,
      err.message
    );
  }
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export function startRecommendationCron() {
  cron.schedule("0 */6 * * *", refreshAllRecommendations, {
    timezone: "Asia/Manila",
  });

  console.log("[RecommendationCron] Scheduled — runs every 6 hours (Asia/Manila).");

  setTimeout(() => {
    console.log("[RecommendationCron] Running startup warm-up...");
    refreshAllRecommendations();
  }, 30_000);
}