import { useEffect, useState, useRef } from "react";
import AdminSidebar from "../../components/AdminSidebar";

function getDisplayableStats(meta) {
  if (!meta) return null;
  const source = meta.summary || meta;
  const entries = Object.entries(source).filter(
    ([key, value]) => key !== "data" && (typeof value !== "object" || value === null)
  );
  return entries.length ? entries : null;
}

function formatStatLabel(key) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// KPI card left-border color by stat key semantics
function statAccentColor(key) {
  const k = key.toLowerCase();
  if (k.includes("fine") || k.includes("overdue") || k.includes("late")) return "var(--espresso)";
  if (k.includes("total") || k.includes("all")) return "var(--ink)";
  if (k.includes("active") || k.includes("borrow") || k.includes("current")) return "var(--gold)";
  return "var(--forest)";
}

const REPORT_TABS = [
  { value: "overview", label: "Overview" },
  { value: "inventory", label: "Inventory" },
  { value: "currently-borrowed", label: "Borrowed" },
  { value: "overdue", label: "Overdue & Fine" },
  { value: "fines", label: "Fines" },
  { value: "attendance", label: "Attendance" },
];

const RANGE_TABS = [
  { value: "7days", label: "7 Days" },
  { value: "30days", label: "30 Days" },
  { value: "3months", label: "3 Months" },
  { value: "1year", label: "1 Year" },
  { value: "thisMonth", label: "This Month" },
  { value: "custom", label: "Custom" },
];

// SVG icons — no emojis
const IconFileText = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);

const IconPrinter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

const IconLoader = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
    <line x1="12" y1="2" x2="12" y2="6"/>
    <line x1="12" y1="18" x2="12" y2="22"/>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
    <line x1="2" y1="12" x2="6" y2="12"/>
    <line x1="18" y1="12" x2="22" y2="12"/>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
  </svg>
);

export default function ReportsManagement() {
  const [reports, setReports] = useState([]);
  const [reportMeta, setReportMeta] = useState(null);
  const [reportType, setReportType] = useState("overview");
  const [rangeType, setRangeType] = useState("30days");
  const [orientation, setOrientation] = useState("portrait");
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
      case "7days": start.setDate(now.getDate() - 7); break;
      case "30days": start.setDate(now.getDate() - 30); break;
      case "3months": start.setMonth(now.getMonth() - 3); break;
      case "1year": start.setFullYear(now.getFullYear() - 1); break;
      case "thisMonth": start = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case "custom": return;
      default: break;
    }
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  const printPDF = () => {
    if (!previewPDF) return;
    const printWindow = window.open(previewPDF, "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups for this site to print the report.");
      return;
    }
    printWindow.addEventListener("load", () => {
      setTimeout(() => printWindow.print(), 300);
    });
  };

  const handlePrintShortcut = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
      if (!previewPDF) return;
      e.preventDefault();
      if (!isPDFReady) { alert("PDF is still loading. Please wait..."); return; }
      printPDF();
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handlePrintShortcut);
    return () => window.removeEventListener("keydown", handlePrintShortcut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewPDF, isPDFReady]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      }
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/reports/${reportType}?${params}`,
        { headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "anyvalue" } }
      );
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();
      if (Array.isArray(data)) {
        setReports(data); setReportMeta(null);
      } else if (data.data) {
        const { data: rows, ...meta } = data;
        setReports(rows); setReportMeta(meta);
      } else if (data.topBooks) {
        const { topBooks, ...meta } = data;
        setReports(topBooks); setReportMeta(meta);
      } else {
        setReports([]); setReportMeta(null);
      }
    } catch (err) {
      console.error("Error loading report:", err);
      setReports([]); setReportMeta(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); /* eslint-disable-next-line */ }, [reportType, startDate, endDate]);
  useEffect(() => { if (rangeType !== "custom") calculateDateRange(rangeType); /* eslint-disable-next-line */ }, [rangeType]);

  const generatePreview = () => {
    const params = new URLSearchParams({ startDate, endDate, orientation });
    fetch(`${import.meta.env.VITE_API_URL}/api/reports/export/${reportType}?${params}`, {
      headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "anyvalue" },
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
  const activeReportLabel = REPORT_TABS.find((t) => t.value === reportType)?.label || reportType;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <AdminSidebar />

      <div className="rm-shell">

        {/* ── PAGE HEADER ── */}
        <div className="rm-header">
          <div className="rm-header-left">
            <p className="rm-eyebrow">Library System</p>
            <h1 className="rm-title">Reports</h1>
            <p className="rm-subtitle">Generate, review, and export system reports</p>
          </div>
          <div className="rm-header-actions">
            <button className="rm-btn-ghost" onClick={fetchReport}>
              <IconRefresh />
              Refresh
            </button>
            <button className="rm-btn-primary" onClick={generatePreview}>
              <IconFileText />
              Preview PDF
            </button>
          </div>
        </div>

        {/* ── GOLD RULE ── */}
        <div className="rm-gold-rule" />

        {/* ── REPORT TYPE TABS ── */}
        <div className="rm-section-label">Report Type</div>
        <div className="rm-tabs">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.value}
              className={`rm-tab ${reportType === tab.value ? "rm-tab--active" : ""}`}
              onClick={() => setReportType(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── DATE RANGE + ORIENTATION ROW ── */}
        <div className="rm-controls-row">
          <div className="rm-control-group">
            <div className="rm-section-label">Date Range</div>
            <div className="rm-tabs rm-tabs--sm">
              {RANGE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  className={`rm-tab rm-tab--sm ${rangeType === tab.value ? "rm-tab--active" : ""}`}
                  onClick={() => setRangeType(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rm-control-group rm-control-group--right">
            <div className="rm-section-label">Orientation</div>
            <div className="rm-tabs rm-tabs--sm">
              {["portrait", "landscape"].map((o) => (
                <button
                  key={o}
                  className={`rm-tab rm-tab--sm ${orientation === o ? "rm-tab--active" : ""}`}
                  onClick={() => setOrientation(o)}
                >
                  {o.charAt(0).toUpperCase() + o.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom date inputs */}
        {rangeType === "custom" && (
          <div className="rm-date-row">
            <div className="rm-date-field">
              <label className="rm-field-label">Start Date</label>
              <input
                className="rm-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="rm-date-field">
              <label className="rm-field-label">End Date</label>
              <input
                className="rm-input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ── KPI STAT STRIP ── */}
        {stats && (
          <div className="rm-kpi-strip">
            {stats.map(([key, value]) => (
              <div
                className="rm-kpi-card"
                key={key}
                style={{ borderLeftColor: statAccentColor(key) }}
              >
                <span className="rm-kpi-label">{formatStatLabel(key)}</span>
                <strong className="rm-kpi-value">{String(value)}</strong>
              </div>
            ))}
          </div>
        )}

        {/* ── TABLE ── */}
        {loading ? (
          <div className="rm-empty">
            <IconLoader />
            <span>Loading report…</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="rm-empty">
            No records found for the selected filters.
          </div>
        ) : (
          <div className="rm-table-card">
            <div className="rm-table-header">
              <span className="rm-table-caption">
                {activeReportLabel}
              </span>
              <span className="rm-table-count rm-mono">
                {reports.length} record{reports.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="rm-table-scroll">
              <table className="rm-table">
                <thead>
                  <tr>
                    {Object.keys(reports[0]).map((key) => (
                      <th key={key}>{key.replaceAll("_", " ").toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} className={typeof val === "number" ? "rm-mono" : ""}>
                          {val === null || val === undefined ? "—" : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PDF PREVIEW ── */}
        {previewPDF && (
          <div className="rm-pdf-panel">
            <div className="rm-pdf-header">
              <div className="rm-section-label" style={{ margin: 0 }}>PDF Preview</div>
              <button
                className="rm-btn-primary"
                onClick={printPDF}
                disabled={!isPDFReady}
              >
                {isPDFReady ? <><IconPrinter /> Print Report</> : <><IconLoader /> Loading…</>}
              </button>
            </div>
            <iframe
              ref={iframeRef}
              src={previewPDF}
              onLoad={() => setIsPDFReady(true)}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              className="rm-pdf-frame"
              title="Report PDF Preview"
            />
          </div>
        )}
      </div>

      <style>{`
        /* ── TOKENS ── */
        :root {
          --forest:    #14532D;
          --gold:      #B8860B;
          --espresso:  #5C3D2E;
          --parchment: #FAF6EE;
          --ink:       #241F18;
          --sage:      #EEF3E7;
          --rust:      #9B2335;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* ── SHELL ── */
        .rm-shell {
          margin-left: 260px;
          padding: 36px 40px 60px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
        }

        /* ── HEADER ── */
        .rm-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          flex-wrap: wrap;
        }
        .rm-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gold);
          margin: 0 0 6px;
        }
        .rm-title {
          font-family: 'Fraunces', serif;
          font-size: 2rem;
          font-weight: 700;
          color: var(--forest);
          margin: 0 0 4px;
          line-height: 1.1;
        }
        .rm-subtitle {
          font-size: 0.875rem;
          color: #6b6255;
          margin: 0;
        }
        .rm-header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-shrink: 0;
        }

        /* ── GOLD RULE (catalog card signature) ── */
        .rm-gold-rule {
          height: 2px;
          background: linear-gradient(90deg, var(--gold) 0%, transparent 100%);
          margin: 20px 0 28px;
          border-radius: 1px;
        }

        /* ── SECTION LABEL ── */
        .rm-section-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #8a7a6a;
          margin-bottom: 8px;
        }

        /* ── TABS ── */
        .rm-tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .rm-tabs--sm { margin-bottom: 0; }

        .rm-tab {
          padding: 7px 16px;
          border-radius: 6px;
          border: 1.5px solid #d5ccbf;
          background: white;
          color: #6b6255;
          font-family: 'Inter', sans-serif;
          font-size: 0.83rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .rm-tab:hover {
          border-color: var(--forest);
          color: var(--forest);
        }
        .rm-tab--active {
          background: var(--forest);
          border-color: var(--forest);
          color: white;
          font-weight: 600;
        }
        .rm-tab--sm {
          padding: 5px 12px;
          font-size: 0.78rem;
        }

        /* ── CONTROLS ROW ── */
        .rm-controls-row {
          display: flex;
          gap: 40px;
          flex-wrap: wrap;
          margin-bottom: 24px;
          align-items: flex-start;
        }
        .rm-control-group { display: flex; flex-direction: column; }
        .rm-control-group--right { margin-left: auto; }

        /* ── DATE INPUTS ── */
        .rm-date-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .rm-date-field { display: flex; flex-direction: column; gap: 6px; }
        .rm-field-label {
          font-size: 0.78rem;
          color: #6b6255;
          font-weight: 500;
        }
        .rm-input {
          padding: 8px 12px;
          border: 1.5px solid #d5ccbf;
          border-radius: 6px;
          background: white;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.85rem;
          color: var(--ink);
          outline: none;
          transition: border-color 0.15s;
        }
        .rm-input:focus { border-color: var(--forest); }

        /* ── KPI STRIP ── */
        .rm-kpi-strip {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 28px;
        }
        .rm-kpi-card {
          background: white;
          border: 1px solid #e5ddd0;
          border-left: 4px solid var(--forest);
          border-radius: 8px;
          padding: 14px 18px;
          min-width: 150px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          /* catalog card corner notch */
          clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
        }
        .rm-kpi-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.66rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #8a7a6a;
        }
        .rm-kpi-value {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 1.25rem;
          font-weight: 500;
          color: var(--ink);
          line-height: 1;
        }

        /* ── TABLE CARD ── */
        .rm-table-card {
          background: white;
          border: 1px solid #e5ddd0;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 28px;
        }
        .rm-table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          border-bottom: 2px solid var(--sage);
        }
        .rm-table-caption {
          font-family: 'Fraunces', serif;
          font-size: 1rem;
          font-weight: 600;
          color: var(--forest);
        }
        .rm-table-count {
          font-size: 0.78rem;
          color: #8a7a6a;
        }
        .rm-table-scroll { overflow-x: auto; }
        .rm-table {
          width: 100%;
          border-collapse: collapse;
        }
        .rm-table th {
          padding: 11px 16px;
          background: var(--sage);
          color: var(--forest);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-align: left;
          border-bottom: 1px solid #d5e8ca;
          white-space: nowrap;
        }
        .rm-table td {
          padding: 11px 16px;
          border-bottom: 1px solid #f0ebe2;
          font-size: 0.875rem;
          color: var(--ink);
        }
        .rm-table tr:last-child td { border-bottom: none; }
        .rm-table tbody tr:hover { background: #faf8f4; }

        /* ── MONO UTILITY ── */
        .rm-mono {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.85rem;
        }

        /* ── EMPTY STATE ── */
        .rm-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 60px 20px;
          color: #8a7a6a;
          font-size: 0.9rem;
          background: white;
          border: 1px dashed #d5ccbf;
          border-radius: 10px;
          margin-bottom: 28px;
        }

        /* ── PDF PANEL ── */
        .rm-pdf-panel {
          background: white;
          border: 1px solid #e5ddd0;
          border-radius: 10px;
          overflow: hidden;
        }
        .rm-pdf-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          border-bottom: 2px solid var(--sage);
        }
        .rm-pdf-frame {
          width: 100%;
          height: 540px;
          border: none;
          display: block;
        }

        /* ── BUTTONS ── */
        .rm-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: var(--forest);
          color: white;
          border: none;
          padding: 9px 18px;
          border-radius: 7px;
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
        }
        .rm-btn-primary:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .rm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .rm-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: transparent;
          color: var(--forest);
          border: 1.5px solid var(--forest);
          padding: 8px 16px;
          border-radius: 7px;
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .rm-btn-ghost:hover { background: var(--sage); }

        @media print {
          body * { visibility: hidden; }
        }

        @media (max-width: 768px) {
          .rm-shell { margin-left: 0; padding: 20px; }
          .rm-controls-row { flex-direction: column; gap: 16px; }
          .rm-control-group--right { margin-left: 0; }
        }
      `}</style>
    </>
  );
}