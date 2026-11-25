// services/pdfService.js
import PDFDocument from "pdfkit";

const MARGIN = 40;
const CELL_PAD = 5;
const BORDER_COLOR = "#999999";
const HEADER_BG = "#e5e5e5";
const TEXT_COLOR = "#000000";
const FONT_REGULAR = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";

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

/**
 * Generate a PDF report (portrait or landscape).
 *
 * columns: [{ key, header, weight? }]
 *   weight controls relative column width (default 1). Give long text
 *   columns (titles, names) a bigger weight than short ones (IDs, dates).
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
    fontSize = 10,
    primaryColor = "#000000",
    orientation = "landscape",
  } = options;

  if (!columns.length) throw new Error("generateReportPDF: columns is required");

  const doc = new PDFDocument({
    size: "A4",
    layout: orientation === "portrait" ? "portrait" : "landscape",
    margin: MARGIN,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${title.replace(/\s+/g, "_")}.pdf"`
  );

  doc.pipe(res);

  const pageWidth = doc.page.width - MARGIN * 2;
  const bottomLimit = () => doc.page.height - MARGIN;

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
      { align: "center" }
    );

  doc.moveDown(1.5);

  /* ===============================
     SUMMARY (optional)
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
        .fillColor(TEXT_COLOR)
        .text(`${key}: ${value}`);
    });

    doc.moveDown(1.5);
  }

  /* ===============================
     COLUMN LAYOUT
  =============================== */
  const headers = columns.map((c) => c.header);
  const totalWeight = columns.reduce((sum, c) => sum + (c.weight ?? 1), 0);
  const colWidths = columns.map((c) => (pageWidth * (c.weight ?? 1)) / totalWeight);

  const colX = [];
  let xCursor = MARGIN;
  colWidths.forEach((w) => {
    colX.push(xCursor);
    xCursor += w;
  });

  // One set of text options for BOTH measuring and drawing, so heights match
  const textOpts = (colWidth) => ({
    width: colWidth - CELL_PAD * 2,
    lineGap: 0,
    paragraphGap: 0,
  });

  const cellHeight = (text, font, size, colWidth) => {
    doc.font(font).fontSize(size);
    return doc.heightOfString(text, textOpts(colWidth));
  };

  // Height of the tallest cell in a row, plus padding
  const rowHeight = (cells, font, size) => {
    const tallest = cells.reduce(
      (max, text, i) => Math.max(max, cellHeight(text, font, size, colWidths[i])),
      0
    );
    return tallest + CELL_PAD * 2;
  };

  const drawRow = ({ cells, y, height, font, size, fill = null }) => {
    if (fill) {
      doc.rect(MARGIN, y, pageWidth, height).fill(fill);
    }

    doc
      .rect(MARGIN, y, pageWidth, height)
      .lineWidth(0.5)
      .strokeColor(BORDER_COLOR)
      .stroke();

    cells.forEach((text, i) => {
      doc
        .font(font)
        .fontSize(size)
        .fillColor(TEXT_COLOR)
        .text(text, colX[i] + CELL_PAD, y + CELL_PAD, textOpts(colWidths[i]));

      if (i > 0) {
        doc
          .moveTo(colX[i], y)
          .lineTo(colX[i], y + height)
          .lineWidth(0.5)
          .strokeColor(BORDER_COLOR)
          .stroke();
      }
    });
  };

  const headerHeight = rowHeight(headers, FONT_BOLD, fontSize);

  const drawHeader = (y) => {
    drawRow({
      cells: headers,
      y,
      height: headerHeight,
      font: FONT_BOLD,
      size: fontSize,
      fill: HEADER_BG,
    });
    return y + headerHeight;
  };

  /* ===============================
     TABLE
  =============================== */
  let y = doc.y;

  if (y + headerHeight + CELL_PAD * 2 > bottomLimit()) {
    doc.addPage();
    y = MARGIN;
  }
  y = drawHeader(y);

  if (!data.length) {
    doc
      .font(FONT_REGULAR)
      .fontSize(fontSize)
      .fillColor("gray")
      .text("No records found for the selected filters.", MARGIN, y + 10, {
        width: pageWidth,
        align: "center",
      });
    y += 40;
  }

  data.forEach((row) => {
    const cells = columns.map((c) => formatCellValue(row[c.key]));
    const height = rowHeight(cells, FONT_REGULAR, fontSize);

    if (y + height > bottomLimit()) {
      doc.addPage();
      y = MARGIN;
      y = drawHeader(y);
    }

    drawRow({ cells, y, height, font: FONT_REGULAR, size: fontSize });
    y += height;
  });

  /* ===============================
     FOOTER
  =============================== */
  y += 20;
  if (y + 12 > bottomLimit()) {
    doc.addPage();
    y = MARGIN;
  }

  doc
    .font(FONT_REGULAR)
    .fontSize(9)
    .fillColor("gray")
    .text("Confidential - Library Management System", MARGIN, y, {
      width: pageWidth,
      align: "center",
    });

  doc.end();
};