import db from "../db/db.js";

/* =========================================
   DATE HELPERS
========================================= */
const getMonthlyRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date();
  return { start, end };
};

const getLast30DaysRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { start, end };
};

const validateDateRange = (startDate, endDate) => {
  if (startDate && endDate) {
    if (new Date(startDate) > new Date(endDate)) {
      return false;
    }
  }
  return true;
};

/* =========================================
   1️⃣ BOOK INVENTORY REPORT
========================================= */
export const fetchInventoryReportData = async (query = {}) => {
  let { startDate, endDate, section, type, availability } = query;

  let where = "WHERE 1=1";
  const params = [];

  if (startDate && endDate) {
    where += " AND b.created_at BETWEEN ? AND ?";
    params.push(startDate, endDate);
  }

  if (section) {
    where += " AND b.section = ?";
    params.push(section);
  }

  if (type) {
    where += " AND b.type = ?";
    params.push(type);
  }

  if (availability === "available") {
    where += " AND b.copies > 0";
  }

  const [rows] = await db.query(
    `
    SELECT 
      b.id,
      b.title,
      b.author,
      b.isbn,
      b.publisher,
      b.section,
      b.type,
      b.copies,
      b.created_at,
      COUNT(DISTINCT br.id) AS total_borrowed
    FROM books b
    LEFT JOIN borrows br ON br.book_id = b.id
    ${where}
    GROUP BY 
      b.id, b.title, b.author, b.isbn, b.publisher,
      b.section, b.type, b.copies, b.created_at
    ORDER BY b.created_at DESC
    `,
    params
  );

  return rows;
};

export const getInventoryReport = async (req, res) => {
  try {
    if (!validateDateRange(req.query.startDate, req.query.endDate)) {
      return res.status(400).json({ message: "Invalid date range" });
    }
    const data = await fetchInventoryReportData(req.query);
    res.json(data);
  } catch (err) {
    console.error("INVENTORY REPORT ERROR:", err);
    res.status(500).json({ message: "Failed to generate inventory report" });
  }
};

/* =========================================
   2️⃣ OVERVIEW REPORT (DEFAULT: CURRENT MONTH)
   FIX: status counts now match the real borrow
   lifecycle (pending_borrow / borrowed / pending_return
   / returned / rejected) instead of just returned_at
   IS NULL, and now includes unpaid fines + today's
   attendance so the overview matches the rest of the app.
========================================= */
export const getOverviewReportData = async (query = {}) => {
  let { startDate, endDate } = query;

  if (!startDate || !endDate) {
    const range = getMonthlyRange();
    startDate = range.start;
    endDate = range.end;
  }

  const params = [startDate, endDate];

  const [[{ totalUsers }]] = await db.query(
    "SELECT COUNT(*) AS totalUsers FROM users"
  );

  const [[{ totalBorrows }]] = await db.query(
    `SELECT COUNT(*) AS totalBorrows 
     FROM borrows 
     WHERE borrowed_at BETWEEN ? AND ?`,
    params
  );

  const [[{ activeBorrows }]] = await db.query(
    `SELECT COUNT(*) AS activeBorrows FROM borrows WHERE status = 'borrowed'`
  );

  const [[{ pendingBorrows }]] = await db.query(
    `SELECT COUNT(*) AS pendingBorrows FROM borrows WHERE status = 'pending_borrow'`
  );

  const [[{ pendingReturns }]] = await db.query(
    `SELECT COUNT(*) AS pendingReturns FROM borrows WHERE status = 'pending_return'`
  );

  const [[{ rejectedBorrows }]] = await db.query(
    `SELECT COUNT(*) AS rejectedBorrows FROM borrows WHERE status = 'rejected'`
  );

  const [[{ returnedBorrows }]] = await db.query(
    `SELECT COUNT(*) AS returnedBorrows FROM borrows WHERE status = 'returned'`
  );

  const [[{ overdueBorrows }]] = await db.query(
    `SELECT COUNT(*) AS overdueBorrows 
     FROM borrows 
     WHERE status = 'borrowed' 
     AND due_date < NOW()`
  );

  const [[{ totalUnpaidFines }]] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS totalUnpaidFines
     FROM fines WHERE status = 'unpaid'`
  );

  const [[{ todayAttendance }]] = await db.query(
    `SELECT COUNT(*) AS todayAttendance FROM attendance WHERE date = CURDATE()`
  );

  const [[avgDuration]] = await db.query(
    `SELECT AVG(DATEDIFF(returned_at, borrowed_at)) AS avgBorrowDuration
     FROM borrows
     WHERE returned_at IS NOT NULL
     AND borrowed_at BETWEEN ? AND ?`,
    params
  );

  const [topBooks] = await db.query(
    `SELECT bk.title, COUNT(*) AS total
     FROM borrows br
     JOIN books bk ON br.book_id = bk.id
     WHERE br.borrowed_at BETWEEN ? AND ?
     GROUP BY br.book_id
     ORDER BY total DESC
     LIMIT 10`,
    params
  );

  return {
    range: { startDate, endDate },
    totalUsers,
    totalBorrows,
    activeBorrows,
    pendingBorrows,
    pendingReturns,
    rejectedBorrows,
    returnedBorrows,
    overdueBorrows,
    totalUnpaidFines,
    todayAttendance,
    avgBorrowDuration: avgDuration.avgBorrowDuration || 0,
    topBooks,
  };
};

export const getOverviewReport = async (req, res) => {
  try {
    if (!validateDateRange(req.query.startDate, req.query.endDate)) {
      return res.status(400).json({ message: "Invalid date range" });
    }
    const data = await getOverviewReportData(req.query);
    res.json(data);
  } catch (err) {
    console.error("OVERVIEW REPORT ERROR:", err);
    res.status(500).json({ message: "Failed to generate overview report" });
  }
};

/* =========================================
   3️⃣ CURRENTLY BORROWED (DEFAULT: LAST 30 DAYS)
   FIX: filters on status = 'borrowed' instead of
   returned_at IS NULL, so pending_borrow / pending_return
   requests (which also have a NULL returned_at) don't
   show up here as if they were active loans.
========================================= */
export const getCurrentlyBorrowedReportData = async (query = {}) => {
  let { startDate, endDate } = query;

  if (!startDate || !endDate) {
    const range = getLast30DaysRange();
    startDate = range.start;
    endDate = range.end;
  }

  const [rows] = await db.query(
    `SELECT 
        bk.title,
        u.full_name,
        u.lrn,
        br.borrowed_at,
        br.due_date,
        GREATEST(DATEDIFF(NOW(), br.due_date), 0) AS days_overdue
      FROM borrows br
      JOIN books bk ON br.book_id = bk.id
      JOIN users u ON br.user_id = u.id
      WHERE br.status = 'borrowed'
      AND br.borrowed_at BETWEEN ? AND ?
      ORDER BY br.due_date ASC`,
    [startDate, endDate]
  );

  return { range: { startDate, endDate }, data: rows };
};

export const getCurrentlyBorrowedReport = async (req, res) => {
  try {
    if (!validateDateRange(req.query.startDate, req.query.endDate)) {
      return res.status(400).json({ message: "Invalid date range" });
    }
    const data = await getCurrentlyBorrowedReportData(req.query);
    res.json(data);
  } catch (err) {
    console.error("CURRENT BORROWED REPORT ERROR:", err);
    res.status(500).json({ message: "Failed to generate current borrowed report" });
  }
};

/* =========================================
   4️⃣ OVERDUE & FINE REPORT (DEFAULT: LAST 30 DAYS)
   FIX: previously invented its own per-day fine math
   (DATEDIFF * 5), which doesn't match the real system —
   fines.js/notificationCron.js apply a FLAT ₱5 fine per
   overdue book, one row per borrow in the `fines` table.
   This now left-joins the real fines table so the report
   shows the actual fine record (and its real status),
   falling back to ₱5 "would-be" fine only if none exists
   yet (e.g. the daily cron hasn't run today).
========================================= */
export const getOverdueReportData = async (query = {}) => {
  let { startDate, endDate } = query;
  const finePerBook = 5; // flat fee per overdue book — matches actual policy

  if (!startDate || !endDate) {
    const range = getLast30DaysRange();
    startDate = range.start;
    endDate = range.end;
  }

  const [rows] = await db.query(
    `SELECT 
        bk.title,
        u.full_name,
        u.lrn,
        br.borrowed_at,
        br.due_date,
        DATEDIFF(NOW(), br.due_date) AS days_overdue,
        COALESCE(f.amount, ?) AS fine,
        COALESCE(f.status, 'unpaid') AS fine_status
      FROM borrows br
      JOIN books bk ON br.book_id = bk.id
      JOIN users u ON br.user_id = u.id
      LEFT JOIN fines f ON f.borrow_id = br.id
      WHERE br.status = 'borrowed'
      AND br.due_date < NOW()
      AND br.borrowed_at BETWEEN ? AND ?
      ORDER BY days_overdue DESC`,
    [finePerBook, startDate, endDate]
  );

  return { range: { startDate, endDate }, finePerBook, data: rows };
};

export const getOverdueReport = async (req, res) => {
  try {
    if (!validateDateRange(req.query.startDate, req.query.endDate)) {
      return res.status(400).json({ message: "Invalid date range" });
    }
    const data = await getOverdueReportData(req.query);
    res.json(data);
  } catch (err) {
    console.error("OVERDUE REPORT ERROR:", err);
    res.status(500).json({ message: "Failed to generate overdue report" });
  }
};

/* =========================================
   5️⃣ FINES REPORT (NEW)
   Pulls straight from the real `fines` table used by
   fineController.js — the source of truth for what
   students actually owe / paid / were waived, including
   lost/damaged/other charges that have nothing to do with
   overdue books at all.
========================================= */
export const fetchFinesReportData = async (query = {}) => {
  const { startDate, endDate, status, fine_type } = query;

  let where = "WHERE 1=1";
  const params = [];

  if (startDate && endDate) {
    where += " AND f.created_at BETWEEN ? AND ?";
    params.push(startDate, endDate);
  }

  if (status) {
    where += " AND f.status = ?";
    params.push(status);
  }

  if (fine_type) {
    where += " AND f.fine_type = ?";
    params.push(fine_type);
  }

  const [rows] = await db.query(
    `
    SELECT
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
      f.created_at,
      f.paid_at,
      p.full_name AS processed_by_name
    FROM fines f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN borrows br ON f.borrow_id = br.id
    LEFT JOIN books bk ON br.book_id = bk.id
    LEFT JOIN users p ON f.processed_by = p.id
    ${where}
    ORDER BY f.created_at DESC
    `,
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

export const getFinesReport = async (req, res) => {
  try {
    if (!validateDateRange(req.query.startDate, req.query.endDate)) {
      return res.status(400).json({ message: "Invalid date range" });
    }
    const data = await fetchFinesReportData(req.query);
    res.json(data);
  } catch (err) {
    console.error("FINES REPORT ERROR:", err);
    res.status(500).json({ message: "Failed to generate fines report" });
  }
};

/* =========================================
   6️⃣ ATTENDANCE REPORT (NEW)
   Surfaces data from the attendance system
   (Attendancecontroller.js) which previously had zero
   presence in Reports despite being a fully built feature.
========================================= */
export const fetchAttendanceReportData = async (query = {}) => {
  let { startDate, endDate } = query;

  if (!startDate || !endDate) {
    const range = getLast30DaysRange();
    startDate = range.start;
    endDate = range.end;
  }

  const [rows] = await db.query(
    `
    SELECT
      a.id,
      u.full_name,
      u.lrn,
      a.date,
      a.time_in,
      a.time_out,
      CASE 
        WHEN a.time_out IS NOT NULL 
        THEN TIMESTAMPDIFF(MINUTE, a.time_in, a.time_out)
        ELSE NULL
      END AS duration_minutes
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    WHERE a.date BETWEEN ? AND ?
    ORDER BY a.date DESC, a.time_in DESC
    `,
    [startDate, endDate]
  );

  const completed = rows.filter((r) => r.time_out).length;
  const stillIn = rows.filter((r) => !r.time_out).length;
  const uniqueStudents = new Set(rows.map((r) => r.lrn)).size;

  const durations = rows
    .map((r) => r.duration_minutes)
    .filter((d) => d !== null && d !== undefined);
  const avgDurationMinutes = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
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

export const getAttendanceReport = async (req, res) => {
  try {
    if (!validateDateRange(req.query.startDate, req.query.endDate)) {
      return res.status(400).json({ message: "Invalid date range" });
    }
    const data = await fetchAttendanceReportData(req.query);
    res.json(data);
  } catch (err) {
    console.error("ATTENDANCE REPORT ERROR:", err);
    res.status(500).json({ message: "Failed to generate attendance report" });
  }
};