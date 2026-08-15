// src/pages/admin/AttendanceManagement.jsx
import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Users:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Clock:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  LogOut:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Archive:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  Search:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  X:        () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Calendar: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Refresh:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.28-3.41"/></svg>,
  Prev:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Next:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Dot:      ({ color }) => <svg width="7" height="7" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill={color}/></svg>,
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendanceManagement() {
  const baseURL = import.meta.env.VITE_API_URL;
  const token   = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" };

  const [attendance, setAttendance] = useState([]);
  const [stats, setStats]           = useState({});
  const [search, setSearch]         = useState("");
  const [date, setDate]             = useState(todayDate());
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(false);

  const fetchStats = async () => {
    try {
      const res  = await fetch(`${baseURL}/api/attendance/stats`, { headers });
      const data = await res.json();
      setStats(data);
    } catch (err) { console.error("Stats error:", err); }
  };

  const fetchAttendance = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 20, search, date });
      const res    = await fetch(`${baseURL}/api/attendance?${params}`, { headers });
      const data   = await res.json();
      setAttendance(data.attendance || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) { console.error("Attendance fetch error:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { setPage(1); fetchAttendance(1); }, [search, date]);
  useEffect(() => { fetchAttendance(page); }, [page]);

  /* ── Formatters ── */
  const formatTime = (dt) => {
    if (!dt) return <span className="att-null">—</span>;
    return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getDuration = (timeIn, timeOut) => {
    if (!timeIn || !timeOut) return "—";
    const diff = new Date(timeOut) - new Date(timeIn);
    const hrs  = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  };

  const StatusBadge = ({ row }) => row.time_out
    ? <span className="att-badge badge-out"><Icons.Dot color="#14532D" /> Completed</span>
    : <span className="att-badge badge-in"><Icons.Dot color="#B8860B" /> Inside</span>;

  return (
    <>
      <AdminSidebar />

      <div className="att-main">

        {/* ── Page header ── */}
        <header className="att-header">
          <div>
            <p className="att-eyebrow">Library Operations</p>
            <h1 className="att-title">Attendance Management</h1>
          </div>
          <button
            className="att-refresh-btn"
            onClick={() => { fetchStats(); fetchAttendance(page); }}
          >
            <Icons.Refresh /> Refresh
          </button>
        </header>

        {/* ── KPI strip ── */}
        <div className="att-kpi-strip">
          <KpiCard icon={<Icons.Users />}   label="Currently Inside"  value={stats.currentlyIn  ?? "—"} tone="gold" />
          <KpiCard icon={<Icons.Clock />}   label="Today's Visitors"  value={stats.todayTotal   ?? "—"} tone="forest" />
          <KpiCard icon={<Icons.LogOut />}  label="Timed Out Today"   value={stats.todayOut     ?? "—"} tone="espresso" />
          <KpiCard icon={<Icons.Archive />} label="All-Time Records"  value={stats.allTimeTotal ?? "—"} tone="neutral" />
        </div>

        {/* ── Toolbar ── */}
        <div className="att-toolbar">
          {/* Search */}
          <div className="att-search-wrap">
            <Icons.Search />
            <input
              className="att-search-input"
              placeholder="Search by name or LRN…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="att-clear-btn" onClick={() => setSearch("")}>
                <Icons.X />
              </button>
            )}
          </div>

          {/* Date filter */}
          <div className="att-date-row">
            <span className="att-date-label">
              <Icons.Calendar /> Date
            </span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="att-date-input"
            />
            <button className="att-tab-btn att-tab-btn--active" onClick={() => setDate(todayDate())}>
              Today
            </button>
            <button className="att-tab-btn" onClick={() => setDate("")}>
              All dates
            </button>
          </div>
        </div>

        {/* ── Table card ── */}
        <div className="att-card">

          {/* Card header */}
          <div className="att-card-header">
            <div>
              <p className="att-card-title">Attendance Log</p>
              <p className="att-card-sub">
                {loading ? "Loading…" : `${total} record${total !== 1 ? "s" : ""} found`}
              </p>
            </div>
            <span className="att-date-chip">
              <Icons.Calendar />
              {date || "All dates"}
            </span>
          </div>

          {/* Content */}
          {loading ? (
            <div className="att-state">
              <div className="att-spinner" />
              <span>Loading records…</span>
            </div>
          ) : attendance.length === 0 ? (
            <div className="att-state">
              <Icons.Archive />
              <span>No attendance records found.</span>
            </div>
          ) : (
            <div className="att-table-wrap">
              <table className="att-table">
                <thead>
                  <tr>
                    {["Student", "LRN", "Date", "Time In", "Time Out", "Duration", "Status"].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((row) => (
                    <tr key={row.id}>
                      <td className="att-name">{row.full_name}</td>
                      <td className="att-mono">{row.lrn || "—"}</td>
                      <td className="att-mono">{row.date}</td>
                      <td className="att-time-in">{formatTime(row.time_in)}</td>
                      <td className="att-time-out">{formatTime(row.time_out)}</td>
                      <td className="att-duration">{getDuration(row.time_in, row.time_out)}</td>
                      <td><StatusBadge row={row} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="att-pagination">
              <button
                className="att-page-btn"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <Icons.Prev /> Prev
              </button>
              <span className="att-page-info">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
              <button
                className="att-page-btn"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next <Icons.Next />
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

        :root {
          --forest:    #14532D;
          --forest-lt: #3E7A4D;
          --gold:      #B8860B;
          --espresso:  #5C3D2E;
          --rust:      #A13D2B;
          --parchment: #FAF6EE;
          --sage:      #EEF3E7;
          --ink:       #241F18;
          --ink-soft:  #5C5546;
          --line:      #E4DFD3;
        }

        /* ── Layout ── */
        .att-main {
          margin-left: 248px;
          padding: 36px 40px 64px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
        }

        /* ── Header ── */
        .att-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: 28px;
        }
        .att-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .att-title {
          font-family: 'Fraunces', serif;
          font-size: 2rem; font-weight: 600;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
        }
        .att-refresh-btn {
          display: flex; align-items: center; gap: 6px;
          background: white; border: 1px solid var(--line);
          color: var(--ink-soft); padding: 8px 14px;
          border-radius: 6px; font-size: 0.82rem; font-weight: 500;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: border-color 0.15s, color 0.15s;
        }
        .att-refresh-btn:hover { border-color: var(--forest); color: var(--forest); }

        /* ── KPI strip ── */
        .att-kpi-strip {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 16px; margin-bottom: 24px;
        }
        .att-kpi {
          background: white; border: 1px solid var(--line);
          border-radius: 6px; padding: 16px 18px;
          border-left: 4px solid var(--line);
          display: flex; align-items: center; gap: 14px;
        }
        .att-kpi.tone-forest   { border-left-color: var(--forest); }
        .att-kpi.tone-gold     { border-left-color: var(--gold); }
        .att-kpi.tone-espresso { border-left-color: var(--espresso); }
        .att-kpi.tone-neutral  { border-left-color: var(--ink-soft); }
        .att-kpi-icon {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 6px;
          background: var(--sage); color: var(--forest); flex-shrink: 0;
        }
        .att-kpi-value {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 1.7rem; font-weight: 600;
          color: var(--ink); line-height: 1;
        }
        .att-kpi-label {
          font-size: 0.72rem; color: var(--ink-soft);
          text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;
        }

        /* ── Toolbar ── */
        .att-toolbar {
          display: flex; gap: 12px; flex-wrap: wrap;
          align-items: center; margin-bottom: 16px;
        }
        .att-search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: white; border: 1px solid var(--line);
          border-radius: 6px; padding: 8px 12px;
          flex: 1; min-width: 240px;
          transition: border-color 0.15s;
        }
        .att-search-wrap:focus-within { border-color: var(--forest); }
        .att-search-wrap svg { color: var(--ink-soft); flex-shrink: 0; }
        .att-search-input {
          border: none; outline: none; flex: 1;
          font-size: 0.85rem; font-family: 'Inter', sans-serif;
          color: var(--ink); background: transparent;
        }
        .att-search-input::placeholder { color: #B0A89C; }
        .att-clear-btn {
          background: none; border: none; cursor: pointer;
          color: var(--ink-soft); display: flex;
          align-items: center; padding: 2px;
        }
        .att-clear-btn:hover { color: var(--ink); }

        /* Date filter row */
        .att-date-row {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .att-date-label {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.78rem; color: var(--ink-soft); white-space: nowrap;
        }
        .att-date-input {
          padding: 7px 10px; border: 1px solid var(--line);
          border-radius: 6px; font-size: 0.84rem;
          font-family: 'Inter', sans-serif;
          background: white; color: var(--ink);
          outline: none; transition: border-color 0.15s;
        }
        .att-date-input:focus { border-color: var(--forest); }

        /* Today / All-dates tab buttons */
        .att-tab-btn {
          padding: 7px 14px; border-radius: 6px;
          border: 1px solid var(--line); background: white;
          color: var(--ink-soft); font-size: 0.8rem;
          font-weight: 500; cursor: pointer;
          font-family: 'Inter', sans-serif; white-space: nowrap;
          transition: background 0.12s, border-color 0.12s, color 0.12s;
        }
        .att-tab-btn:hover { background: var(--sage); border-color: var(--forest); color: var(--forest); }
        .att-tab-btn--active {
          background: var(--sage); border-color: var(--forest);
          color: var(--forest); font-weight: 600;
        }

        /* ── Card ── */
        .att-card {
          background: white; border: 1px solid var(--line);
          border-radius: 6px; overflow: hidden;
        }
        .att-card-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding: 16px 20px; border-bottom: 1px solid var(--line);
        }
        .att-card-title {
          font-family: 'Fraunces', serif;
          font-size: 1rem; font-weight: 600;
          color: var(--forest); margin: 0 0 2px;
        }
        .att-card-sub {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.72rem; color: var(--ink-soft); margin: 0;
        }
        .att-date-chip {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.72rem; color: var(--ink-soft);
          background: var(--sage); border: 1px solid var(--line);
          padding: 4px 10px; border-radius: 20px; white-space: nowrap;
        }

        /* ── State (empty / loading) ── */
        .att-state {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 12px; padding: 60px 0;
          color: var(--ink-soft); font-size: 0.88rem;
        }
        .att-state svg { opacity: 0.3; }
        .att-spinner {
          width: 24px; height: 24px;
          border: 2.5px solid var(--line); border-top-color: var(--forest);
          border-radius: 50%; animation: att-spin 0.7s linear infinite;
        }
        @keyframes att-spin { to { transform: rotate(360deg); } }

        /* ── Table ── */
        .att-table-wrap { overflow-x: auto; }
        .att-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }

        .att-table thead th {
          padding: 10px 16px;
          background: var(--sage);
          text-align: left; font-size: 0.7rem;
          font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.07em; color: var(--forest);
          border-bottom: 1px solid var(--line); white-space: nowrap;
        }
        .att-table tbody td {
          padding: 11px 16px;
          border-bottom: 1px solid var(--line);
          color: var(--ink);
        }
        .att-table tbody tr:last-child td { border-bottom: none; }
        .att-table tbody tr:hover td { background: #FDFAF5; }

        .att-name  { font-weight: 600; }
        .att-mono  {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.8rem; color: var(--ink-soft);
        }
        .att-time-in  {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.82rem; color: var(--forest); font-weight: 600;
        }
        .att-time-out {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.82rem; color: var(--rust); font-weight: 600;
        }
        .att-duration {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.8rem; color: var(--espresso); font-weight: 500;
        }
        .att-null { color: var(--line); font-style: italic; }

        /* ── Status badges ── */
        .att-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.72rem; font-weight: 600; white-space: nowrap;
        }
        .badge-in  { background: #FEF3C7; color: #92400E; border: 1px solid #F6D860; }
        .badge-out { background: var(--sage); color: var(--forest); border: 1px solid #C5DCBB; }

        /* ── Pagination ── */
        .att-pagination {
          display: flex; justify-content: center; align-items: center;
          gap: 16px; padding: 14px 20px; border-top: 1px solid var(--line);
        }
        .att-page-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 7px 14px; border-radius: 6px;
          border: 1px solid var(--line); background: white;
          color: var(--forest); font-size: 0.82rem; font-weight: 600;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: background 0.12s, border-color 0.12s;
        }
        .att-page-btn:hover:not(:disabled) { background: var(--sage); border-color: var(--forest); }
        .att-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .att-page-info {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.8rem; color: var(--ink-soft);
        }
        .att-page-info strong { color: var(--ink); }

        /* ── Responsive ── */
        @media (max-width: 1100px) {
          .att-kpi-strip { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 1000px) {
          .att-main { margin-left: 0; padding: 24px 20px 48px; }
        }
        @media (max-width: 640px) {
          .att-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .att-kpi-strip { grid-template-columns: 1fr 1fr; }
          .att-toolbar { flex-direction: column; align-items: stretch; }
          .att-date-row { flex-wrap: wrap; }
        }
      `}</style>
    </>
  );
}

/* ── KPI card ── */
function KpiCard({ icon, label, value, tone }) {
  return (
    <div className={`att-kpi tone-${tone}`}>
      <div className="att-kpi-icon">{icon}</div>
      <div>
        <div className="att-kpi-value">{value}</div>
        <div className="att-kpi-label">{label}</div>
      </div>
    </div>
  );
}