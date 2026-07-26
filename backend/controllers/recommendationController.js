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

  const res = await fetch(`${ML_SERVICE_URL}/recommend/${userId}?top_n=10`, {
    method: "GET",
    signal: AbortSignal.timeout(15000), // 15s timeout — free-tier services can be slow to wake
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ML service returned ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const recs = data.recommendations || [];

  if (!recs.length) return [];

  // recommender.py already returns title/author/cover_image/section directly,
  // no need to re-join against the books table like the old spawn version did
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

  try {
    // 1️⃣  Cache hit — instant
    const cached = await getCachedRecommendations(userId);
    if (cached.length > 0) {
      return res.json({
        recommendations: cached,
        source: "cache",
        cached_at: cached[0].computed_at,
      });
    }

    // 2️⃣  Cache miss — call ML service live, seed cache async for next visit
    console.log(`[Recommendations] Cache miss for user ${userId}, calling ML service...`);

    let live = [];
    try {
      live = await getLiveFallback(userId);
    } catch (mlErr) {
      console.error("[Recommendations] Live ML call failed:", mlErr.message);
    }

    if (live.length > 0) {
      refreshForUser(userId).catch(() => {});
      return res.json({ recommendations: live, source: "live" });
    }

    // 3️⃣  Hard fallback — most borrowed books, zero ML
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

    return res.json({ recommendations: popular, source: "popular_fallback" });

  } catch (err) {
    console.error("[Recommendations] Unexpected error:", err);
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