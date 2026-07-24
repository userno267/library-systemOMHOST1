// services/pdfService.js
import PDFDocument from "pdfkit";

/**
 * Generate Professional PDF (Portrait or Landscape)
 */
export const generateReportPDF = ({
  res,
  title = "Library Report",
  data = [],
  columns = [],
  summary = null,
  options = {},
}) => {
  const {
    fontSize = 12,
    primaryColor = "#000000",
    orientation = "landscape", // NEW OPTION
  } = options;

  const doc = new PDFDocument({
    size: "A4",
    layout: orientation === "portrait" ? "portrait" : "landscape",
    margin: 40,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${title.replace(/\s+/g, "_")}.pdf"`
  );

  doc.pipe(res);

  /* ===============================
     HEADER
  =============================== */
  doc
    .fontSize(20)
    .fillColor(primaryColor)
    .text(title, { align: "center" });

  doc.moveDown(0.5);

  doc
    .fontSize(10)
    .fillColor("gray")
    .text(
      `Generated on: ${new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })}`,
      {
        align: "center",
      }
    );

  doc.moveDown(1.5);

  /* ===============================
     SUMMARY SECTION (Optional)
  =============================== */
  if (summary) {
    doc
      .fontSize(fontSize + 2)
      .fillColor(primaryColor)
      .text("Executive Summary", { underline: true });

    doc.moveDown(0.5);

    Object.entries(summary).forEach(([key, value]) => {
      doc
        .fontSize(fontSize)
        .fillColor("#000000")
        .text(`${key}: ${value}`);
    });

    doc.moveDown(1.5);
  }

  /* ===============================
     TABLE ENGINE (WITH BORDERS)
  =============================== */

  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const startX = doc.page.margins.left;
  const cellPadding = 5;
  const borderColor = "#999999";

  const columnWidth = pageWidth / columns.length;

  // Format any cell value for display. Dates (returned as JS Date objects by
  // mysql2 for DATETIME/TIMESTAMP columns) are formatted explicitly so they
  // never fall back to Date.toString(), which appends "GMT+0800
  // (Philippine Standard Time)".
  const formatCellValue = (value) => {
    if (value === null || value === undefined || value === "") return "—";

    if (value instanceof Date) {
      return value.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    }

    return String(value);
  };

  // Reusable: draw the header row (background + text + border) at given y, return new y
  const drawTableHeader = (y) => {
    const headerHeight = fontSize + cellPadding * 2;

    // Header background
    doc
      .rect(startX, y, pageWidth, headerHeight)
      .fillAndStroke("#e5e5e5", borderColor);

    // Header text + vertical column dividers
    doc.font("Helvetica-Bold").fontSize(fontSize).fillColor("#000000");
    let x = startX;
    columns.forEach((col) => {
      doc.text(col.header, x + cellPadding, y + cellPadding, {
        width: columnWidth - cellPadding * 2,
        align: "left",
      });

      // vertical divider on the right edge of this column
      doc
        .moveTo(x, y)
        .lineTo(x, y + headerHeight)
        .strokeColor(borderColor)
        .stroke();

      x += columnWidth;
    });
    // final right-edge divider
    doc
      .moveTo(x, y)
      .lineTo(x, y + headerHeight)
      .strokeColor(borderColor)
      .stroke();

    return y + headerHeight;
  };

  let y = doc.y;
  y = drawTableHeader(y);

  /* ---------- TABLE ROWS ---------- */
  doc.font("Helvetica").fontSize(fontSize).fillColor("#000000");

  data.forEach((row) => {
    let rowHeight = 0;
    let x = startX;

    // Calculate tallest cell in row
    columns.forEach((col) => {
      const text = formatCellValue(row[col.key]);
      const height = doc.heightOfString(text, {
        width: columnWidth - cellPadding * 2,
      });
      rowHeight = Math.max(rowHeight, height);
    });

    rowHeight += cellPadding * 2;

    // Page break check — also redraw the header on the new page
    if (y + rowHeight > doc.page.height - 50) {
      doc.addPage({
        layout: orientation === "portrait" ? "portrait" : "landscape",
      });
      y = doc.page.margins.top;
      y = drawTableHeader(y);
      doc.font("Helvetica").fontSize(fontSize).fillColor("#000000");
    }

    // Row outer border
    doc
      .rect(startX, y, pageWidth, rowHeight)
      .strokeColor(borderColor)
      .stroke();

    // Render cells + vertical dividers
    x = startX;
    columns.forEach((col) => {
      const text = formatCellValue(row[col.key]);

      doc.text(text, x + cellPadding, y + cellPadding, {
        width: columnWidth - cellPadding * 2,
        align: "left",
      });

      doc
        .moveTo(x, y)
        .lineTo(x, y + rowHeight)
        .strokeColor(borderColor)
        .stroke();

      x += columnWidth;
    });
    // final right-edge divider for this row
    doc
      .moveTo(x, y)
      .lineTo(x, y + rowHeight)
      .strokeColor(borderColor)
      .stroke();

    y += rowHeight;
  });

  /* ===============================
     FOOTER
  =============================== */
  doc.moveDown(2);
  doc
    .fontSize(9)
    .fillColor("gray")
    .text("Confidential - Library Management System", {
      align: "center",
    });

  doc.end();
};