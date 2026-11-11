// backend/routes/reportRoutes.js
import express from "express";
import {
  getInventoryReport,
  getOverviewReport,
  getCurrentlyBorrowedReport,
  getOverdueReport,
  getFinesReport,
  getAttendanceReport,
  getReportDebug,
  fetchInventoryReportData,
  getOverviewReportData,
  getCurrentlyBorrowedReportData,
  getOverdueReportData,
  fetchFinesReportData,
  fetchAttendanceReportData,
  validateDateRange,
} from "../controllers/reportController.js";

import { auth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/admin.js";
import { generateReportPDF } from "../services/pdfService.js";

const router = express.Router();

const DEBUG = process.env.REPORT_DEBUG !== "false";
const log = (...a) => DEBUG && console.log(`[REPORT-ROUTE ${new Date().toISOString()}]`, ...a);

/* =========================================
   🔒 SECURITY — reports contain student names, LRNs and fines.
   Previously these routes were open to anyone.
========================================= */
router.use(auth, adminOnly);

// Request logger (runs after auth, so we know who is calling)
router.use((req, res, next) => {
  log(`${req.method} ${req.originalUrl} user=${req.user?.id} role=${req.user?.role}`);
  next();
});

/* =========================================
   📊 REPORT ROUTES
========================================= */
router.get("/debug", getReportDebug);
router.get("/inventory", getInventoryReport);
router.get("/overview", getOverviewReport);
router.get("/currently-borrowed", getCurrentlyBorrowedReport);
router.get("/overdue", getOverdueReport);
router.get("/fines", getFinesReport);
router.get("/attendance", getAttendanceReport);

/* =========================================
   🖨️ PDF EXPORT ROUTE
========================================= */
router.get("/export/:type", async (req, res) => {
  const t0 = Date.now();

  try {
    const { type } = req.params;
    const { orientation = "landscape", ...query } = req.query;

    log(`PDF export type=${type} orientation=${orientation} query=${JSON.stringify(query)}`);

    if (!validateDateRange(query.startDate, query.endDate)) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    let reportData;
    let title = "";
    let summary = null;
    let columns = [];

    switch (type) {
      /* ---------- 1️⃣ INVENTORY ---------- */
      case "inventory": {
        const inv = await fetchInventoryReportData(query);
        title = "Book Inventory Report";

        summary = {
          "Total Titles": inv.summary.totalTitles,
          "Physical Titles": inv.summary.physicalTitles,
          "Digital Titles": inv.summary.digitalTitles,
          "Total Physical Copies": inv.summary.totalCopies,
        };

        columns = [
          { header: "Title", key: "title" },
          { header: "Author", key: "author" },
          { header: "ISBN", key: "isbn" },
          { header: "Publisher", key: "publisher" },
          { header: "Section", key: "section" },
          { header: "Type", key: "type" },
          { header: "Copies", key: "copies" },
          { header: "Total Borrowed", key: "total_borrowed" },
        ];
        reportData = inv.data;
        break;
      }

      /* ---------- 2️⃣ OVERVIEW ---------- */
      case "overview": {
        const overview = await getOverviewReportData(query);
        title = "Executive Overview Report";

        summary = {
          "Period": `${overview.range.startDate} to ${overview.range.endDate}`,
          "Total Users": overview.totalUsers,
          "Total Borrows (in period)": overview.totalBorrows,
          "Active Borrows": overview.activeBorrows,
          "Pending Borrow Requests": overview.pendingBorrows,
          "Pending Returns": overview.pendingReturns,
          "Rejected Requests": overview.rejectedBorrows,
          "Returned Borrows": overview.returnedBorrows,
          "Overdue Borrows": overview.overdueBorrows,
          "Total Unpaid Fines": `₱${Number(overview.totalUnpaidFines).toFixed(2)}`,
          "Today's Attendance": overview.todayAttendance,
          "Average Borrow Duration": `${overview.avgBorrowDuration} days`,
        };

        columns = [
          { header: "Book Title", key: "title" },
          { header: "Total Borrows", key: "total" },
        ];
        reportData = overview.topBooks;
        break;
      }

      /* ---------- 3️⃣ CURRENTLY BORROWED ---------- */
      case "currently-borrowed": {
        const current = await getCurrentlyBorrowedReportData(query);
        title = "Currently Borrowed Report";

        summary = {
          "Currently Borrowed": current.summary.totalCurrentlyBorrowed,
          "Overdue": current.summary.overdue,
          "On Time": current.summary.onTime,
        };

        columns = [
          { header: "Book Title", key: "title" },
          { header: "Borrower Name", key: "full_name" },
          { header: "LRN", key: "lrn" },
          { header: "Borrowed At", key: "borrowed_at" },
          { header: "Due Date", key: "due_date" },
          { header: "Status", key: "status" },
          { header: "Days Overdue", key: "days_overdue" },
        ];
        reportData = current.data;
        break;
      }

      /* ---------- 4️⃣ OVERDUE & FINE ---------- */
      case "overdue": {
        const overdue = await getOverdueReportData(query);
        title = "Overdue & Fine Report";

        summary = {
          "Fine Per Book (flat fee)": `₱${overdue.finePerBook.toFixed(2)}`,
          "Total Overdue Records": overdue.summary.totalOverdue,
          "Unpaid Fine Total": `₱${Number(overdue.summary.unpaidFineTotal).toFixed(2)}`,
        };

        columns = [
          { header: "Book Title", key: "title" },
          { header: "Borrower Name", key: "full_name" },
          { header: "LRN", key: "lrn" },
          { header: "Borrowed At", key: "borrowed_at" },
          { header: "Due Date", key: "due_date" },
          { header: "Days Overdue", key: "days_overdue" },
          { header: "Fine", key: "fine" },
          { header: "Fine Status", key: "fine_status" },
        ];
        reportData = overdue.data;
        break;
      }

      /* ---------- 5️⃣ FINES ---------- */
      case "fines": {
        const fines = await fetchFinesReportData(query);
        title = "Fines Report";

        summary = {
          "Period": `${fines.range.startDate} to ${fines.range.endDate}`,
          "Total Records": fines.summary.totalRecords,
          "Total Amount": `₱${fines.summary.totalAmount.toFixed(2)}`,
          "Total Unpaid": `₱${fines.summary.totalUnpaid.toFixed(2)}`,
          "Total Paid": `₱${fines.summary.totalPaid.toFixed(2)}`,
          "Waived Count": fines.summary.totalWaived,
        };

        columns = [
          { header: "Student", key: "full_name" },
          { header: "LRN", key: "lrn" },
          { header: "Book", key: "book_title" },
          { header: "Type", key: "fine_type" },
          { header: "Amount", key: "amount" },
          { header: "Status", key: "status" },
          { header: "Date", key: "created_at" },
        ];
        reportData = fines.data;
        break;
      }

      /* ---------- 6️⃣ ATTENDANCE ---------- */
      case "attendance": {
        const attendance = await fetchAttendanceReportData(query);
        title = "Attendance Report";

        summary = {
          "Period": `${attendance.range.startDate} to ${attendance.range.endDate}`,
          "Total Records": attendance.summary.totalRecords,
          "Completed": attendance.summary.completed,
          "Still Inside": attendance.summary.stillIn,
          "Unique Students": attendance.summary.uniqueStudents,
          "Avg Duration (min)": attendance.summary.avgDurationMinutes,
        };

        columns = [
          { header: "Student", key: "full_name" },
          { header: "LRN", key: "lrn" },
          { header: "Date", key: "date" },
          { header: "Time In", key: "time_in" },
          { header: "Time Out", key: "time_out" },
          { header: "Duration (min)", key: "duration_minutes" },
        ];
        reportData = attendance.data;
        break;
      }

      default:
        return res.status(400).json({ message: "Invalid report type" });
    }

    log(`PDF ${type}: ${reportData?.length ?? 0} row(s), building PDF (${Date.now() - t0}ms so far)`);

    generateReportPDF({
      res,
      title,
      data: reportData || [],
      columns,
      summary,
      options: {
        fontSize: 12,
        primaryColor: "#000000",
        orientation,
      },
    });
  } catch (err) {
    console.error("[REPORT-ROUTE] ❌ PDF EXPORT ERROR:", err);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Failed to export PDF",
        ...(DEBUG && { error: err.message }),
      });
    }
  }
});

export default router;