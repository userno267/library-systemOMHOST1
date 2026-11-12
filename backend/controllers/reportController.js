// backend/controllers/reportController.js
import db from "../db/db.js";

/* =========================================
   CONFIG + DEBUG LOGGING
   - REPORT_DEBUG=false      → silence all [REPORT] logs
   - REPORT_DEBUG_ROWS=true  → also log the first row of each query
                               (contains student names/LRNs, so off by default)
   - REPORT_TZ               → timezone used for "today" defaults
========================================= */
const DEBUG = process.env.REPORT_DEBUG !== "false";
const DEBUG_ROWS = process.env.REPORT_DEBUG_ROWS === "true";
const TZ = process.env.REPORT_TZ || "Asia/Manila";

const dbg = (...args) => {
  if (DEBUG) console.log(`[REPORT ${new Date().toISOString()}]`, ...args);
};
const warn = (...args) =>
  console.warn(`[REPORT ${new Date().toISOString()}] ⚠️`, ...args);

// notificationCron.js flips late books from 'borrowed' → 'overdue', so every
// "currently out" query must include BOTH statuses or late books vanish.
const ACTIVE_SQL = "('borrowed','overdue')";
// Statuses shown in the currently-borrowed report: still out + already returned
const BORROW_HISTORY_SQL = "('borrowed','overdue','returned')";
const FINE_PER_BOOK = 5;
// Fines created manually by admins — NOT the auto overdue fine
const MANUAL_FINE_TYPES_SQL = "('lost','damaged','other')";

/* =========================================
   SQL RUNNER (logs label, params, time, rows)
========================================= */
async function runQuery(label, sql, params = []) {
  const start = Date.now();
  try {
    const [rows] = await db.query(sql, params);
    const count = Array.isArray(rows) ? rows.length : "n/a";
    dbg(`SQL ${label} → ${count} row(s) in ${Date.now() - start}ms | params=${JSON.stringify(params)}`);
    if (DEBUG_ROWS && Array.isArray(rows) && rows.length) {
      dbg(`   first row: ${JSON.stringify(rows[0]).slice(0, 300)}`);
    }
    return rows;
  } catch (err) {
    console.error(`[REPORT] ❌ SQL ${label} FAILED after ${Date.now() - start}ms: ${err.message}`);
    console.error("   sql:", sql.replace(/\s+/g, " ").trim().slice(0, 400));
    console.error("   params:", JSON.stringify(params));
    throw err;
  }
}

/* =========================================
   DATE HELPERS
   All ranges are plain "YYYY-MM-DD" strings and are compared
   with DATE(column) so the END date is INCLUSIVE of the whole day.
   (Before: BETWEEN '2026-11-01' AND '2026-11-12' stopped at 00:00
    on the 12th, so anything created today was missed.)
========================================= */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// "today" in the configured timezone (en-CA formats as YYYY-MM-DD)
const todayStr = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: TZ });

const shiftDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const monthRange = () => {
  const end = todayStr();
  return { startDate: `${end.slice(0, 8)}01`, endDate: end };
};

const last30DaysRange = () => {
  const end = todayStr();
  return { startDate: shiftDays(end, -30), endDate: end };
};

export const validateDateRange = (startDate, endDate) => {
  const s = startDate ? String(startDate).slice(0, 10) : "";
  const e = endDate ? String(endDate).slice(0, 10) : "";
  if (!s && !e) return true; // none supplied → defaults are used
  if (!s || !e) return false; // only one supplied
  if (!DATE_RE.test(s) || !DATE_RE.test(e)) return false;
  return s <= e;
};

function resolveRange(query, label, fallbackFn) {
  const s = query.startDate ? String(query.startDate).slice(0, 10) : "";
  const e = query.endDate ? String(query.endDate).slice(0, 10) : "";

  if (s && e) {
    dbg(`${label}: range from query ${s} → ${e}`);
    return { startDate: s, endDate: e };
  }
  const fb = fallbackFn();
  dbg(`${label}: no range supplied, default ${fb.startDate} → ${fb.endDate}`);
  return fb;
}

/* =========================================
   1️⃣ BOOK INVENTORY REPORT
   Inventory is a snapshot of the catalog, so the date range is
   intentionally IGNORED (the UI always sends a 30-day range, which
   would otherwise hide every book added before that).
========================================= */
export const fetchInventoryReportData = async (query = {}) => {
  const { section, type, availability } = query;
  dbg("inventory: date range ignored (catalog snapshot)", { section, type, availability });

  let where = "WHERE 1=1";
  const params = [];

  if (section) { where += " AND b.section = ?"; params.push(section); }
  if (type) { where += " AND b.type = ?"; params.push(type); }
  if (availability === "available") {
    where += " AND (b.type = 'digital' OR b.copies > 0)";
  }

  const rows = await runQuery(
    "inventory",
    `SELECT
       b.id, b.title, b.author, b.isbn, b.publisher, b.section, b.type, b.copies,
       DATE_FORMAT(b.created_at, '%Y-%m-%d %H:%i') AS created_at,
       COUNT(DISTINCT br.id) AS total_borrowed
     FROM books b
     LEFT JOIN borrows br ON br.book_id = b.id
     ${where}
     GROUP BY b.id, b.title, b.author, b.isbn, b.publisher,
              b.section, b.type, b.copies, b.created_at
     ORDER BY b.created_at DESC`,
    params
  );

  const summary = {
    totalTitles: rows.length,
    physicalTitles: rows.filter((r) => r.type === "physical").length,
    digitalTitles: rows.filter((r) => r.type === "digital").length,
    totalCopies: rows.reduce((s, r) => s + Number(r.copies || 0), 0),
  };

  return { data: rows, summary };
};

/* =========================================
   2️⃣ OVERVIEW REPORT (DEFAULT: CURRENT MONTH)
   Snapshot numbers (active / pending / overdue / fines / attendance)
   are all-time. Only totalBorrows, avgBorrowDuration and topBooks
   follow the selected date range.
========================================= */
export const getOverviewReportData = async (query = {}) => {
  const { startDate, endDate } = resolveRange(query, "overview", monthRange);
  const range = [startDate, endDate];
  const today = todayStr();

  const [
    statusRows,
    overdueRows,
    userRows,
    totalBorrowRows,
    fineRows,
    attendanceRows,
    avgRows,
    topBooks,
  ] = await Promise.all([
    runQuery("overview:statusCounts", "SELECT status, COUNT(*) AS c FROM borrows GROUP BY status"),
    runQuery(
      "overview:overdue",
      `SELECT COUNT(*) AS c FROM borrows WHERE status IN ${ACTIVE_SQL} AND due_date < NOW()`
    ),
    runQuery("overview:users", "SELECT COUNT(*) AS c FROM users"),
    runQuery(
      "overview:totalBorrowsInRange",
      "SELECT COUNT(*) AS c FROM borrows WHERE DATE(borrowed_at) BETWEEN ? AND ?",
      range
    ),
    runQuery(
      "overview:unpaidFines",
      "SELECT COALESCE(SUM(amount), 0) AS total FROM fines WHERE status = 'unpaid'"
    ),
    runQuery("overview:todayAttendance", "SELECT COUNT(*) AS c FROM attendance WHERE date = ?", [today]),
    runQuery(
      "overview:avgDuration",
      `SELECT AVG(DATEDIFF(returned_at, borrowed_at)) AS avg_days
       FROM borrows
       WHERE returned_at IS NOT NULL AND DATE(borrowed_at) BETWEEN ? AND ?`,
      range
    ),
    runQuery(
      "overview:topBooks",
      `SELECT bk.title, COUNT(*) AS total
       FROM borrows br
       JOIN books bk ON br.book_id = bk.id
       WHERE DATE(br.borrowed_at) BETWEEN ? AND ?
       GROUP BY br.book_id, bk.title
       ORDER BY total DESC
       LIMIT 10`,
      range
    ),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.c)]));
  dbg("overview: borrows by status =", JSON.stringify(byStatus), "| today =", today);

  const activeBorrows = (byStatus.borrowed || 0) + (byStatus.overdue || 0);
  const avg = Number(avgRows[0]?.avg_days ?? 0);

  return {
    range: { startDate, endDate },
    totalUsers: Number(userRows[0].c),
    totalBorrows: Number(totalBorrowRows[0].c),
    activeBorrows,
    pendingBorrows: byStatus.pending_borrow || 0,
    pendingReturns: byStatus.pending_return || 0,
    rejectedBorrows: byStatus.rejected || 0,
    returnedBorrows: byStatus.returned || 0,
    overdueBorrows: Number(overdueRows[0].c),
    totalUnpaidFines: Number(fineRows[0].total),
    todayAttendance: Number(attendanceRows[0].c),
    avgBorrowDuration: Math.round(avg * 10) / 10,
    topBooks,
  };
};

/* =========================================
   3️⃣ BORROW HISTORY (CURRENTLY BORROWED + RETURNED)
   - Books still out (borrowed / overdue) are ALWAYS shown, no matter
     when they were borrowed.
   - Returned books are shown only if they were borrowed inside the
     selected date range (defaults to the last 30 days).
   - Summary separates still-out from returned so both can be read
     at a glance.
========================================= */
export const getCurrentlyBorrowedReportData = async (query = {}) => {
  const { startDate, endDate } = resolveRange(query, "currently-borrowed", last30DaysRange);

  const rows = await runQuery(
    "currently-borrowed",
    `SELECT
       bk.title,
       u.full_name,
       u.lrn,
       DATE_FORMAT(br.borrowed_at, '%Y-%m-%d %H:%i') AS borrowed_at,
       DATE_FORMAT(br.due_date, '%Y-%m-%d') AS due_date,
       DATE_FORMAT(br.returned_at, '%Y-%m-%d %H:%i') AS returned_at,
       br.status,
       GREATEST(DATEDIFF(COALESCE(br.returned_at, NOW()), br.due_date), 0) AS days_overdue
     FROM borrows br
     JOIN books bk ON br.book_id = bk.id
     JOIN users u ON br.user_id = u.id
     WHERE br.status IN ${BORROW_HISTORY_SQL}
       AND (
         br.status IN ${ACTIVE_SQL}
         OR DATE(br.borrowed_at) BETWEEN ? AND ?
       )
     ORDER BY br.borrowed_at DESC`,
    [startDate, endDate]
  );

  const isStillOut = (r) => r.status !== "returned";

  const summary = {
    totalRecords: rows.length,
    currentlyOut: rows.filter(isStillOut).length,
    overdue: rows.filter((r) => isStillOut(r) && Number(r.days_overdue) > 0).length,
    returned: rows.filter((r) => !isStillOut(r)).length,
    returnedLate: rows.filter((r) => !isStillOut(r) && Number(r.days_overdue) > 0).length,
  };

  return {
    range: { startDate, endDate },
    data: rows,
    summary,
  };
};

/* =========================================
   4️⃣ OVERDUE & FINE REPORT
   Still-out books past their due date. Joined to the real fines
   table (auto overdue fines only — manual lost/damaged/other fines
   are excluded so a book is never listed twice). Falls back to a
   ₱5 "would-be" fine if the daily cron hasn't created the row yet.
========================================= */
export const getOverdueReportData = async (query = {}) => {
  dbg("overdue: date range ignored (shows everything currently overdue)");

  const rows = await runQuery(
    "overdue",
    `SELECT
       bk.title,
       u.full_name,
       u.lrn,
       DATE_FORMAT(br.borrowed_at, '%Y-%m-%d %H:%i') AS borrowed_at,
       DATE_FORMAT(br.due_date, '%Y-%m-%d') AS due_date,
       DATEDIFF(NOW(), br.due_date) AS days_overdue,
       COALESCE(f.amount, ?) AS fine,
       COALESCE(f.status, 'unpaid') AS fine_status
     FROM borrows br
     JOIN books bk ON br.book_id = bk.id
     JOIN users u ON br.user_id = u.id
     LEFT JOIN fines f
       ON f.borrow_id = br.id
      AND (f.fine_type IS NULL OR f.fine_type NOT IN ${MANUAL_FINE_TYPES_SQL})
     WHERE br.status IN ${ACTIVE_SQL}
       AND br.due_date < NOW()
     ORDER BY days_overdue DESC`,
    [FINE_PER_BOOK]
  );

  const unpaidTotal = rows
    .filter((r) => r.fine_status === "unpaid")
    .reduce((s, r) => s + Number(r.fine), 0);

  return {
    finePerBook: FINE_PER_BOOK,
    data: rows,
    summary: {
      totalOverdue: rows.length,
      finePerBook: FINE_PER_BOOK,
      unpaidFineTotal: unpaidTotal,
    },
  };
};

/* =========================================
   5️⃣ FINES REPORT
========================================= */
export const fetchFinesReportData = async (query = {}) => {
  const { status, fine_type } = query;
  const { startDate, endDate } = resolveRange(query, "fines", last30DaysRange);

  let where = "WHERE DATE(f.created_at) BETWEEN ? AND ?";
  const params = [startDate, endDate];

  if (status) { where += " AND f.status = ?"; params.push(status); }
  if (fine_type) { where += " AND f.fine_type = ?"; params.push(fine_type); }

  const rows = await runQuery(
    "fines",
    `SELECT
       f.id,
       u.full_name,
       u.lrn,
       bk.title AS book_title,
       f.fine_type,
       f.amount,
       f.status,
       f.amount_paid,
       f.change_amount,
       f.notes,
       DATE_FORMAT(f.created_at, '%Y-%m-%d %H:%i') AS created_at,
       DATE_FORMAT(f.paid_at, '%Y-%m-%d %H:%i') AS paid_at,
       p.full_name AS processed_by_name
     FROM fines f
     JOIN users u ON f.user_id = u.id
     LEFT JOIN borrows br ON f.borrow_id = br.id
     LEFT JOIN books bk ON br.book_id = bk.id
     LEFT JOIN users p ON f.processed_by = p.id
     ${where}
     ORDER BY f.created_at DESC`,
    params
  );

  const totalAmount = rows.reduce((s, r) => s + Number(r.amount), 0);
  const totalUnpaid = rows
    .filter((r) => r.status === "unpaid")
    .reduce((s, r) => s + Number(r.amount), 0);
  const totalPaid = rows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + Number(r.amount_paid || r.amount), 0);
  const totalWaived = rows.filter((r) => r.status === "waived").length;

  return {
    range: { startDate, endDate },
    data: rows,
    summary: {
      totalRecords: rows.length,
      totalAmount,
      totalUnpaid,
      totalPaid,
      totalWaived,
    },
  };
};

/* =========================================
   6️⃣ ATTENDANCE REPORT
========================================= */
export const fetchAttendanceReportData = async (query = {}) => {
  const { startDate, endDate } = resolveRange(query, "attendance", last30DaysRange);

  const rows = await runQuery(
    "attendance",
    `SELECT
       a.id,
       u.full_name,
       u.lrn,
       DATE_FORMAT(a.date, '%Y-%m-%d') AS date,
       DATE_FORMAT(a.time_in, '%H:%i') AS time_in,
       DATE_FORMAT(a.time_out, '%H:%i') AS time_out,
       CASE
         WHEN a.time_out IS NOT NULL
         THEN TIMESTAMPDIFF(MINUTE, a.time_in, a.time_out)
         ELSE NULL
       END AS duration_minutes
     FROM attendance a
     JOIN users u ON a.user_id = u.id
     WHERE a.date BETWEEN ? AND ?
     ORDER BY a.date DESC, a.time_in DESC`,
    [startDate, endDate]
  );

  const completed = rows.filter((r) => r.time_out).length;
  const stillIn = rows.filter((r) => !r.time_out).length;
  const uniqueStudents = new Set(rows.map((r) => r.lrn)).size;

  const durations = rows
    .map((r) => r.duration_minutes)
    .filter((d) => d !== null && d !== undefined);
  const avgDurationMinutes = durations.length
    ? Math.round(durations.reduce((a, b) => a + Number(b), 0) / durations.length)
    : 0;

  return {
    range: { startDate, endDate },
    data: rows,
    summary: {
      totalRecords: rows.length,
      completed,
      stillIn,
      uniqueStudents,
      avgDurationMinutes,
    },
  };
};

/* =========================================
   EXPRESS HANDLER FACTORY
   One place for validation, timing, logging and error handling.
========================================= */
const makeHandler = (label, fetcher) => async (req, res) => {
  const t0 = Date.now();
  dbg(`➡️  ${label} request query=${JSON.stringify(req.query)}`);

  try {
    if (!validateDateRange(req.query.startDate, req.query.endDate)) {
      warn(`${label}: invalid date range`, req.query.startDate, req.query.endDate);
      return res.status(400).json({ message: "Invalid date range" });
    }

    const result = await fetcher(req.query);
    const rowCount = Array.isArray(result)
      ? result.length
      : result?.data?.length ?? result?.topBooks?.length ?? 0;

    dbg(`✅ ${label} done in ${Date.now() - t0}ms (${rowCount} row(s))`);
    if (rowCount === 0) warn(`${label}: returned 0 rows — check range/filters, or GET /api/reports/debug`);

    res.json(result);
  } catch (err) {
    console.error(`[REPORT] ❌ ${label.toUpperCase()} REPORT ERROR:`, err);
    res.status(500).json({
      message: `Failed to generate ${label} report`,
      ...(DEBUG && { error: err.message }),
    });
  }
};

export const getInventoryReport = makeHandler("inventory", fetchInventoryReportData);
export const getOverviewReport = makeHandler("overview", getOverviewReportData);
export const getCurrentlyBorrowedReport = makeHandler("currently-borrowed", getCurrentlyBorrowedReportData);
export const getOverdueReport = makeHandler("overdue", getOverdueReportData);
export const getFinesReport = makeHandler("fines", fetchFinesReportData);
export const getAttendanceReport = makeHandler("attendance", fetchAttendanceReportData);

/* =========================================
   🔍 DEBUG ENDPOINT  →  GET /api/reports/debug  (admin only)
   Shows timezones, defaults, status counts, and the newest rows
   so you can see immediately whether new data exists and how
   the dates are stored.
========================================= */
export const getReportDebug = async (req, res) => {
  try {
    const [tzRows] = await db.query(
      `SELECT NOW() AS mysql_now,
              UTC_TIMESTAMP() AS utc_now,
              CURDATE() AS mysql_curdate,
              @@session.time_zone AS session_tz,
              @@global.time_zone AS global_tz`
    );

    const [statusCounts] = await db.query(
      "SELECT status, COUNT(*) AS c FROM borrows GROUP BY status"
    );

    const [latestBorrows] = await db.query(
      `SELECT id, user_id, book_id, status,
              DATE_FORMAT(borrowed_at, '%Y-%m-%d %H:%i:%s') AS borrowed_at,
              DATE_FORMAT(due_date, '%Y-%m-%d %H:%i:%s') AS due_date,
              DATE_FORMAT(returned_at, '%Y-%m-%d %H:%i:%s') AS returned_at
       FROM borrows ORDER BY id DESC LIMIT 5`
    );

    const [latestFines] = await db.query(
      `SELECT id, user_id, borrow_id, fine_type, amount, status,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
       FROM fines ORDER BY id DESC LIMIT 5`
    );

    const [latestAttendance] = await db.query(
      `SELECT id, user_id,
              DATE_FORMAT(date, '%Y-%m-%d') AS date,
              DATE_FORMAT(time_in, '%Y-%m-%d %H:%i:%s') AS time_in,
              DATE_FORMAT(time_out, '%Y-%m-%d %H:%i:%s') AS time_out
       FROM attendance ORDER BY id DESC LIMIT 5`
    );

    const info = {
      node: {
        now: new Date().toString(),
        nowISO: new Date().toISOString(),
        TZ_env: process.env.TZ || null,
        reportTz: TZ,
        todayInReportTz: todayStr(),
      },
      mysql: tzRows[0],
      defaults: {
        monthRange: monthRange(),
        last30Days: last30DaysRange(),
      },
      borrowStatusCounts: statusCounts,
      latestBorrows,
      latestFines,
      latestAttendance,
    };

    dbg("🔍 debug endpoint hit", JSON.stringify(info.node), JSON.stringify(info.mysql));
    res.json(info);
  } catch (err) {
    console.error("[REPORT] ❌ DEBUG ENDPOINT ERROR:", err);
    res.status(500).json({ message: "Debug failed", error: err.message });
  }
};