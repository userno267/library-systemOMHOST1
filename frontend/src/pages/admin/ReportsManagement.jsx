import { useEffect, useState, useRef } from "react";
import AdminSidebar from "../../components/AdminSidebar";

// Fields that are objects/arrays and shouldn't be rendered as a stat pill
// (e.g. `range: { startDate, endDate }`, or the raw `data` array itself).
function getDisplayableStats(meta) {
  if (!meta) return null;

  // fines / attendance nest their numbers under `summary`;
  // overview / overdue put them at the top level instead.
  const source = meta.summary || meta;

  const entries = Object.entries(source).filter(
    ([key, value]) => key !== "data" && (typeof value !== "object" || value === null)
  );

  return entries.length ? entries : null;
}

function formatStatLabel(key) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ReportsManagement() {
  const [reports, setReports] = useState([]);
  const [reportMeta, setReportMeta] = useState(null);
  const [reportType, setReportType] = useState("overview");
  const [rangeType, setRangeType] = useState("30days");
  const [orientation, setOrientation] = useState("portrait"); //
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewPDF, setPreviewPDF] = useState(null);
  const [isPDFReady, setIsPDFReady] = useState(false);
  const iframeRef = useRef(null);
  const token = localStorage.getItem("token");

  const calculateDateRange = (type) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (type) {
      case "7days":
        start.setDate(now.getDate() - 7);
        break;
      case "30days":
        start.setDate(now.getDate() - 30);
        break;
      case "3months":
        start.setMonth(now.getMonth() - 3);
        break;
      case "1year":
        start.setFullYear(now.getFullYear() - 1);
        break;
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "custom":
        return;
      default:
        break;
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  // Print the previewed PDF. We open it in its own window/tab rather than
  // calling print() on the iframe directly: when a PDF is shown via the
  // browser's built-in PDF viewer, that viewer is a separate native
  // renderer, and iframe.contentWindow.print() doesn't reliably scope the
  // print job to just that embedded PDF (some browsers print the whole
  // page behind it instead). Printing a window where the PDF IS the
  // top-level document avoids that bug entirely.
  const printPDF = () => {
    if (!previewPDF) return;

    const printWindow = window.open(previewPDF, "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups for this site to print the report.");
      return;
    }

    // The native PDF viewer can finish rendering slightly after the
    // window's load event, so give it a brief moment before printing.
    printWindow.addEventListener("load", () => {
      setTimeout(() => printWindow.print(), 300);
    });
  };

  const handlePrintShortcut = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
      if (!previewPDF) return; // no preview yet — let the browser's default print through

      e.preventDefault();

      if (!isPDFReady) {
        alert("PDF is still loading. Please wait...");
        return;
      }

      printPDF();
    }
  };

  // Parent-page listener — covers Ctrl+P while focus is anywhere OUTSIDE the iframe.
  useEffect(() => {
    window.addEventListener("keydown", handlePrintShortcut);
    return () => window.removeEventListener("keydown", handlePrintShortcut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewPDF, isPDFReady]);

  const fetchReport = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      // ✅ only attach dates if valid
      if (startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      }

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/reports/${reportType}?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "anyvalue",
          },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch report");

      const data = await res.json();

      if (Array.isArray(data)) {
        // inventory — bare array, no meta
        setReports(data);
        setReportMeta(null);
      } else if (data.data) {
        // currently-borrowed / overdue / fines / attendance
        const { data: rows, ...meta } = data;
        setReports(rows);
        setReportMeta(meta);
      } else if (data.topBooks) {
        // overview
        const { topBooks, ...meta } = data;
        setReports(topBooks);
        setReportMeta(meta);
      } else {
        setReports([]);
        setReportMeta(null);
      }
    } catch (err) {
      console.error("Error loading report:", err);
      setReports([]);
      setReportMeta(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, startDate, endDate]);

  useEffect(() => {
    if (rangeType !== "custom") calculateDateRange(rangeType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeType]);

  const generatePreview = () => {
    const params = new URLSearchParams({
      startDate,
      endDate,
      orientation,
    });

    fetch(`${import.meta.env.VITE_API_URL}/api/reports/export/${reportType}?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "anyvalue",
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        setPreviewPDF(url);
        setIsPDFReady(false);
      })
      .catch((err) => console.error("PDF generation failed:", err));
  };

  const stats = getDisplayableStats(reportMeta);

  const reportTitles = {
    overview: "Overview",
    inventory: "Inventory",
    "currently-borrowed": "Currently Borrowed",
    overdue: "Overdue & Fine",
    fines: "Fines",
    attendance: "Attendance",
  };

  return (
    <>
      <AdminSidebar />

      <div className="admin-main">
        <div className="header">
          <div>
            <h1>Reports</h1>
            <p>Generate and export system reports</p>
          </div>

          <button className="add-btn" onClick={generatePreview}>
            📄 Preview & Print PDF
          </button>
        </div>

        <div className="controls">
          {/* Report Type */}
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="overview">Overview</option>
            <option value="inventory">Inventory</option>
            <option value="currently-borrowed">Currently Borrowed</option>
            <option value="overdue">Overdue & Fine</option>
            <option value="fines">Fines</option>
            <option value="attendance">Attendance</option>
          </select>

          {/* Date Presets */}
          <select
            value={rangeType}
            onChange={(e) => setRangeType(e.target.value)}
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="3months">Last 3 Months</option>
            <option value="1year">Last 1 Year</option>
            <option value="thisMonth">This Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {/* Custom Date Inputs */}
          {rangeType === "custom" && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </>
          )}

          {/* ✅ Orientation Selector */}
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
          >
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
          </select>

          <button onClick={fetchReport} className="add-btn secondary">
            🔄 Refresh
          </button>
        </div>

        {/* ── SUMMARY STAT STRIP ── */}
        {stats && (
          <div className="stat-strip">
            {stats.map(([key, value]) => (
              <div className="stat-pill" key={key}>
                <span className="stat-label">{formatStatLabel(key)}</span>
                <strong className="stat-value">{String(value)}</strong>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p className="center">Loading report...</p>
        ) : reports.length === 0 ? (
          <p className="center">No data found.</p>
        ) : (
          <div className="table-wrapper">
            <p className="table-caption">
              {reportTitles[reportType] || reportType} — {reports.length} record
              {reports.length !== 1 ? "s" : ""}
            </p>
            <table>
              <thead>
                <tr>
                  {Object.keys(reports[0]).map((key) => (
                    <th key={key}>
                      {key.replaceAll("_", " ").toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j}>{val === null || val === undefined ? "—" : String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {previewPDF && (
              <div style={{ marginTop: 20 }}>
                <iframe
                  ref={iframeRef}
                  src={previewPDF}
                  onLoad={() => setIsPDFReady(true)}
                  tabIndex={-1}
                  // Block click-to-focus: once the native PDF viewer inside
                  // this frame takes real keyboard focus, Ctrl+P can no
                  // longer be intercepted by our JS (it's an opaque, native
                  // renderer) and the browser falls back to printing the
                  // whole page behind it. Keeping focus on the outer page
                  // means our window-level shortcut handler always catches
                  // it instead. Mouse-wheel scrolling still works normally.
                  onMouseDown={(e) => e.preventDefault()}
                  style={{
                    width: "100%",
                    height: "500px",
                    border: "1px solid #ccc",
                  }}
                />
                <button
                  onClick={() => {
                    if (isPDFReady) {
                      printPDF();
                    }
                  }}
                  disabled={!isPDFReady}
                  style={{ marginTop: 10 }}
                >
                  🖨️ {isPDFReady ? "Print Report" : "Loading PDF..."}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .admin-main {
          margin-left: 260px;
          padding: 30px;
          background: #f9fbe7;
          min-height: 100vh;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .controls {
          display: flex;
          gap: 10px;
          margin: 20px 0;
          flex-wrap: wrap;
        }

        input,
        select {
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #ccc;
          background: white;
        }

        /* ── stat strip ── */
        .stat-strip {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .stat-pill {
          background: white;
          border: 1px solid #c5e1a5;
          border-radius: 10px;
          padding: 10px 16px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 140px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        }

        .stat-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #888;
        }

        .stat-value {
          font-size: 1.1rem;
          color: #1b5e20;
        }

        .table-caption {
          font-size: 0.85rem;
          color: #666;
          margin: 0 0 10px;
        }

        .table-wrapper {
          overflow-x: auto;
          border-radius: 10px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }

        th,
        td {
          padding: 12px;
          border-bottom: 1px solid #ddd;
        }

        th {
          background: #c5e1a5;
          color: #1b5e20;
        }

        tr:nth-child(even) {
          background: #f1f8e9;
        }

        .add-btn {
          background: #2e7d32;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: bold;
        }

        .secondary {
          background: #558b2f;
        }

        button:hover {
          opacity: 0.9;
          transform: scale(1.03);
          cursor: pointer;
        }

        .center {
          text-align: center;
          color: #777;
        }

        /* Safety net: since printPDF() opens the PDF in its own window/tab
           and prints THAT, this page itself should never normally reach the
           print dialog. But if it ever does (e.g. a user's own Ctrl+P after
           focus lands back on this tab), don't let the whole dashboard print. */
        @media print {
          body * {
            visibility: hidden;
          }
        }
      `}</style>
    </>
  );
}