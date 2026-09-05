// backend/controllers/recommendationController.js

import db from "../db/db.js";
import { refreshForUser } from "../cron/recommendationCron.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;
const CACHE_STALE_HOURS = 7;

// ─── Helper: read from cache ──────────────────────────────────────────────────

async function getCachedRecommendations(userId) {
  const [rows] = await db.query(
    `SELECT book_id, score, reason, computed_at, title, author, cover_image, section, copies
     FROM (
       SELECT
         rc.book_id,
         rc.score,
         rc.reason,
         rc.computed_at,
         b.title,
         b.author,
         b.cover_image,
         b.section,
         b.copies,
         ROW_NUMBER() OVER (
           PARTITION BY rc.book_id
           ORDER BY rc.score DESC, rc.computed_at DESC
         ) AS rn
       FROM recommendation_cache rc
       INNER JOIN books b ON b.id = rc.book_id
       WHERE rc.user_id = ?
         AND rc.computed_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
     ) ranked
     WHERE rn = 1
     ORDER BY score DESC
     LIMIT 20`,
    [userId, CACHE_STALE_HOURS]
  );
  return rows;
}

// ─── Helper: call the ML service live over HTTP ──────────────────────────────

async function getLiveFallback(userId) {
  if (!ML_SERVICE_URL) {
    throw new Error("ML_SERVICE_URL not configured");
  }

  console.log(`[Recommendations] 🌐 getLiveFallback: calling ML service for user ${userId}...`);

  const res = await fetch(`${ML_SERVICE_URL}/recommend/${userId}?top_n=10`, {
    method: "GET",
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Recommendations] ❌ ML service responded ${res.status} for user ${userId}: ${text.slice(0, 300)}`);
    throw new Error(`ML service returned ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const recs = data.recommendations || [];

  console.log(`[Recommendations] ✅ getLiveFallback: got ${recs.length} recs for user ${userId}`);

  if (!recs.length) return [];

  return recs
    .map((r) => ({ ...r, book_id: r.id }))
    .filter((r) => r.title);
}

// ─── Main controller ──────────────────────────────────────────────────────────

export const getRecommendations = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(400).json({ message: "User ID required" });
  }

  console.log(`[Recommendations] 📥 Request from user ${userId}`);

  try {
    // 1️⃣  Cache hit — instant
    const cached = await getCachedRecommendations(userId);
    console.log(`[Recommendations] 🗄️  Cache check for user ${userId}: ${cached.length} rows found`);

    if (cached.length > 0) {
      console.log(`[Recommendations] ✅ Serving from cache for user ${userId}`);
      return res.json({
        recommendations: cached,
        source: "cache",
        cached_at: cached[0].computed_at,
      });
    }

    // 2️⃣  Cache miss — wait briefly in case login's background refreshForUser
    //     is already in-flight and will populate the cache for us.
    //     The in-flight lock in recommendationCron.js ensures only one ML call
    //     goes out even if both code paths reach the ML service simultaneously.
    console.log(`[Recommendations] ⏳ Cache miss for user ${userId} — waiting 2s in case background refresh is in-flight...`);
    await new Promise((r) => setTimeout(r, 2000));

    // Re-check cache after the wait
    const cachedAfterWait = await getCachedRecommendations(userId);
    console.log(`[Recommendations] 🗄️  Cache re-check after wait for user ${userId}: ${cachedAfterWait.length} rows found`);

    if (cachedAfterWait.length > 0) {
      console.log(`[Recommendations] ✅ Serving from cache (post-wait) for user ${userId}`);
      return res.json({
        recommendations: cachedAfterWait,
        source: "cache",
        cached_at: cachedAfterWait[0].computed_at,
      });
    }

    // 3️⃣  Still nothing — call ML service directly.
    //     The in-flight lock in refreshForUser will deduplicate this with any
    //     concurrent background refresh, so only one HTTP request goes out.
    console.log(`[Recommendations] 🔄 Still no cache — calling ML service directly for user ${userId}...`);

    let live = [];
    try {
      live = await getLiveFallback(userId);
    } catch (mlErr) {
      console.error(`[Recommendations] ❌ Live ML call failed for user ${userId}:`, mlErr.message);
    }

    if (live.length > 0) {
      console.log(`[Recommendations] ✅ Serving live ML results for user ${userId} (${live.length} recs) — seeding cache in background`);
      // Seed cache for next request — fire and forget, don't await
      refreshForUser(userId).catch((err) =>
        console.error(`[Recommendations] ⚠️ Background cache seed failed for user ${userId}:`, err.message)
      );
      return res.json({ recommendations: live, source: "live" });
    }

    // 4️⃣  Hard fallback — most borrowed books, zero ML
    console.warn(`[Recommendations] ⚠️ ML unavailable for user ${userId} — falling back to popular books`);

    const [popular] = await db.query(
      `SELECT
         b.id    AS book_id,
         b.title,
         b.author,
         b.cover_image,
         b.section,
         b.copies,
         COUNT(br.id) AS score,
         'popular'    AS reason
       FROM books b
       LEFT JOIN borrows br ON br.book_id = b.id
       GROUP BY b.id
       ORDER BY score DESC
       LIMIT 20`
    );

    console.log(`[Recommendations] 📚 Serving ${popular.length} popular books as fallback for user ${userId}`);
    return res.json({ recommendations: popular, source: "popular_fallback" });

  } catch (err) {
    console.error(`[Recommendations] 💥 Unexpected error for user ${userId}:`, err);
    res.status(500).json({ message: "Failed to fetch recommendations" });
  }
};

// ─── Similar books (book detail page) — unchanged, no ML/Python involved ─────

const SIMILAR_LIMIT = 5;
const SIMILAR_FROM_CACHE = 2;

export const getSimilarBooks = async (req, res) => {
  const bookId = Number(req.params.id);
  const userId = req.user?.id;

  if (!bookId) {
    return res.status(400).json({ message: "Invalid book id" });
  }

  try {
    const [[book]] = await db.query(
      `SELECT id, section FROM books WHERE id = ?`,
      [bookId]
    );

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    let personalized = [];
    if (userId) {
      const [rows] = await db.query(
        `SELECT book_id, title, author, cover_image, section, copies, reason
         FROM (
           SELECT
             rc.book_id,
             rc.score,
             b.title,
             b.author,
             b.cover_image,
             b.section,
             b.copies,
             'cached' AS reason,
             ROW_NUMBER() OVER (
               PARTITION BY rc.book_id
               ORDER BY rc.score DESC
             ) AS rn
           FROM recommendation_cache rc
           INNER JOIN books b ON b.id = rc.book_id
           WHERE rc.user_id = ?
             AND rc.book_id != ?
         ) ranked
         WHERE rn = 1
         ORDER BY score DESC
         LIMIT ?`,
        [userId, bookId, SIMILAR_FROM_CACHE]
      );
      personalized = rows;
    }

    const remaining = SIMILAR_LIMIT - personalized.length;
    const excludeIds = [bookId, ...personalized.map((r) => r.book_id)];

    let sameSection = [];
    if (remaining > 0) {
      const [rows] = await db.query(
        `SELECT
           b.id AS book_id,
           b.title,
           b.author,
           b.cover_image,
           b.section,
           b.copies,
           'section' AS reason
         FROM books b
         WHERE b.id NOT IN (?)
           AND (
             b.section = ?
             OR EXISTS (
               SELECT 1 FROM book_subjects bs1
               WHERE bs1.book_id = b.id
                 AND bs1.subject_id IN (
                   SELECT subject_id FROM book_subjects WHERE book_id = ?
                 )
             )
           )
         ORDER BY (b.copies = 0), RAND()
         LIMIT ?`,
        [excludeIds, book.section, bookId, remaining]
      );
      sameSection = rows;
    }

    const seen = new Set();
    const similar = [...personalized, ...sameSection]
      .filter((b) => {
        if (seen.has(b.book_id)) return false;
        seen.add(b.book_id);
        return true;
      })
      .slice(0, SIMILAR_LIMIT);

    res.json({ similar });

  } catch (err) {
    console.error("[SimilarBooks] Error:", err);
    res.status(500).json({ message: "Failed to fetch similar books" });
  }
};