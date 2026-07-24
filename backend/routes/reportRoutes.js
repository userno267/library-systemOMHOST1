import express from "express";
import {
  getInventoryReport,
  getOverviewReport,
  getCurrentlyBorrowedReport,
  getOverdueReport,
  getFinesReport,
  getAttendanceReport,
  fetchInventoryReportData,
  getOverviewReportData,
  getCurrentlyBorrowedReportData,
  getOverdueReportData,
  fetchFinesReportData,
  fetchAttendanceReportData,
} from "../controllers/reportController.js";

import { auth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/admin.js";
import { generateReportPDF } from "../services/pdfService.js";

const router = express.Router();

/* =========================================
   📊 REPORT ROUTES
========================================= */

router.get("/inventory", getInventoryReport);
router.get("/overview", getOverviewReport);
router.get("/currently-borrowed", getCurrentlyBorrowedReport);
router.get("/overdue", getOverdueReport);
router.get("/fines", getFinesReport);
router.get("/attendance", getAttendanceReport);

/* =========================================
   🔜 PDF EXPORT ROUTE
========================================= */
router.get("/export/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const { orientation = "landscape", ...query } = req.query;

    let reportData;
    let title = "";
    let summary = null;
    let columns = [];

    switch (type) {

      /* =====================================
         1️⃣ INVENTORY
      ===================================== */
      case "inventory":
        reportData = await fetchInventoryReportData(query);

        title = "Book Inventory Report";

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
        break;

      /* =====================================
         2️⃣ OVERVIEW
      ===================================== */
      case "overview":
        const overview = await getOverviewReportData(query);

        title = "Executive Overview Report";

        summary = {
          "Total Users": overview.totalUsers,
          "Total Borrows": overview.totalBorrows,
          "Active Borrows": overview.activeBorrows,
          "Pending Borrow Requests": overview.pendingBorrows,
          "Pending Returns": overview.pendingReturns,
          "Rejected Requests": overview.rejectedBorrows,
          "Returned Borrows": overview.returnedBorrows,
          "Overdue Borrows": overview.overdueBorrows,
          "Total Unpaid Fines": `₱${Number(overview.totalUnpaidFines).toFixed(2)}`,
          "Today's Attendance": overview.todayAttendance,
          "Average Borrow Duration": overview.avgBorrowDuration + " days",
        };

        columns = [
          { header: "Book Title", key: "title" },
          { header: "Total Borrows", key: "total" },
        ];

        reportData = overview.topBooks;
        break;

      /* =====================================
         3️⃣ CURRENTLY BORROWED
      ===================================== */
      case "currently-borrowed":
        const current = await getCurrentlyBorrowedReportData(query);

        title = "Currently Borrowed Report";

        columns = [
          { header: "Book Title", key: "title" },
          { header: "Borrower Name", key: "full_name" },
          { header: "LRN", key: "lrn" },
          { header: "Borrowed At", key: "borrowed_at" },
          { header: "Due Date", key: "due_date" },
          { header: "Days Overdue", key: "days_overdue" },
        ];

        reportData = current.data;
        break;

      /* =====================================
         4️⃣ OVERDUE & FINE
      ===================================== */
      case "overdue":
        const overdue = await getOverdueReportData(query);

        title = "Overdue & Fine Report";

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

        summary = {
          "Fine Per Book (flat fee)": `₱${overdue.finePerBook.toFixed(2)}`,
          "Total Overdue Records": overdue.data.length,
        };

        reportData = overdue.data;
        break;

      /* =====================================
         5️⃣ FINES
      ===================================== */
      case "fines":
        const fines = await fetchFinesReportData(query);

        title = "Fines Report";

        summary = {
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

      /* =====================================
         6️⃣ ATTENDANCE
      ===================================== */
      case "attendance":
        const attendance = await fetchAttendanceReportData(query);

        title = "Attendance Report";

        summary = {
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

      default:
        return res.status(400).json({ message: "Invalid report type" });
    }

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
    console.error("PDF EXPORT ERROR:", err);
    res.status(500).json({ message: "Failed to export PDF" });
  }
});

export default router;