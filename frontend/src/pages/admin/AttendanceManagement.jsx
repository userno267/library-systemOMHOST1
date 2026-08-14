// src/pages/admin/AttendanceManagement.jsx

import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";

export default function AttendanceManagement() {
  const baseURL = import.meta.env.VITE_API_URL;
  const token   = localStorage.getItem("token");
  const headers = {
    Authorization: `Bearer ${token}`,
    "ngrok-skip-browser-warning": "true"
  };

  const [attendance, setAttendance] = useState([]);
  const [stats, setStats]           = useState({});
  const [search, setSearch]         = useState("");
  const [date, setDate]             = useState(todayDate());
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(false);

  function todayDate() {
    return new Date().toISOString().slice(0, 10);
  }

  const fetchStats = async () => {
    try {
      const res  = await fetch(`${baseURL}/api/attendance/stats`, { headers });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Stats error:", err);
    }
  };

  const fetchAttendance = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 20, search, date });
      const res  = await fetch(`${baseURL}/api/attendance?${params.toString()}`, { headers });
      const data = await res.json();
      setAttendance(data.attendance || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Attendance fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { setPage(1); fetchAttendance(1); }, [search, date]);
  useEffect(() => { fetchAttendance(page); }, [page]);

  const formatTime = (dt) => {
    if (!dt) return <span style={s.nullBadge}>—</span>;
    return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getDuration = (timeIn, timeOut) => {
    if (!timeIn || !timeOut) return "—";
    const diff = new Date(timeOut) - new Date(timeIn);
    const hrs  = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  };

  const statusBadge = (row) => {
    if (!row.time_out) return <span style={{ ...s.badge, ...s.badgeIn }}>Still Inside</span>;
    return <span style={{ ...s.badge, ...s.badgeOut }}>Completed</span>;
  };

  return (
    <>
      <AdminSidebar />

      <div style={s.main}>

        {/* ── PAGE HEADER ── */}
        <div style={s.pageHeader}>
          <div>
            <div style={s.eyebrow}>Attendance</div>
            <h1 style={s.pageTitle}>Attendance Management</h1>
            <p style={s.pageSub}>Track student library visits and time logs</p>
          </div>
          <button
            style={s.refreshBtn}
            onClick={() => { fetchStats(); fetchAttendance(page); }}
            onMouseEnter={e => e.currentTarget.style.background = "#e6ac00"}
            onMouseLeave={e => e.currentTarget.style.background = "#F5B800"}
          >
            ↺ Refresh
          </button>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={s.statGrid}>
          <StatCard label="Currently Inside"  value={stats.currentlyIn  ?? "—"} accent="#2E7D32" bg="#E8F5E9" />
          <StatCard label="Today's Visitors"  value={stats.todayTotal   ?? "—"} accent="#5C3A1E" bg="#F5EDE5" />
          <StatCard label="Timed Out Today"   value={stats.todayOut     ?? "—"} accent="#1565C0" bg="#E3F2FD" />
          <StatCard label="All-Time Records"  value={stats.allTimeTotal ?? "—"} accent="#F5B800" bg="#FFF8E1" accentText="#5C3A1E" />
        </div>

        {/* ── TOOLBAR ── */}
        <div style={s.toolbar}>
          <div style={s.searchBox}>
            <span style={s.searchIcon}>🔍</span>
            <input
              style={s.searchInput}
              placeholder="Search by name or LRN…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button style={s.clearBtn} onClick={() => setSearch("")}>✕</button>
            )}
          </div>

          <div style={s.dateFilter}>
            <span style={s.dateLabel}>📅 Date</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={s.dateInput}
            />
            <button
              style={s.todayBtn}
              onClick={() => setDate(todayDate())}
              onMouseEnter={e => e.currentTarget.style.background = "#C8E6C9"}
              onMouseLeave={e => e.currentTarget.style.background = "#E8F5E9"}
            >
              Today
            </button>
            <button
              style={s.allBtn}
              onClick={() => setDate("")}
              onMouseEnter={e => e.currentTarget.style.background = "#F5EDE5"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            >
              All Dates
            </button>
          </div>
        </div>

        {/* ── TABLE CARD ── */}
        <div style={s.card}>

          {/* card header */}
          <div style={s.cardHeader}>
            <div>
              <div style={s.cardTitle}>Attendance Log</div>
              <div style={s.cardSub}>{total} record{total !== 1 ? "s" : ""} found</div>
            </div>
            <span style={s.chip}>{date || "All dates"}</span>
          </div>

          {/* content */}
          {loading ? (
            <div style={s.stateWrap}>
              <div style={s.spinner} />
              <p style={s.stateText}>Loading records…</p>
            </div>
          ) : attendance.length === 0 ? (
            <div style={s.stateWrap}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>📭</div>
              <p style={s.stateText}>No attendance records found</p>
            </div>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["Student", "LRN", "Date", "Time In", "Time Out", "Duration", "Status"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((row, i) => (
                    <tr
                      key={row.id}
                      style={s.tr}
                      onMouseEnter={e => e.currentTarget.style.background = "#F9FBE7"}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#FDFAF4"}
                    >
                      <td style={{ ...s.td, fontWeight: 600, color: "#1E1E1E" }}>{row.full_name}</td>
                      <td style={{ ...s.td, ...s.mono }}>{row.lrn || "—"}</td>
                      <td style={s.td}>{row.date}</td>
                      <td style={{ ...s.td, color: "#2E7D32", fontWeight: 600 }}>{formatTime(row.time_in)}</td>
                      <td style={{ ...s.td, color: "#C62828", fontWeight: 600 }}>{formatTime(row.time_out)}</td>
                      <td style={{ ...s.td, color: "#5C3A1E", fontWeight: 500 }}>{getDuration(row.time_in, row.time_out)}</td>
                      <td style={s.td}>{statusBadge(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── PAGINATION ── */}
          <div style={s.pagination}>
            <button
              style={{ ...s.pageBtn, opacity: page === 1 ? 0.4 : 1 }}
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Prev
            </button>
            <span style={s.pageInfo}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              style={{ ...s.pageBtn, opacity: page === totalPages ? 0.4 : 1 }}
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* spinner keyframe */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

/* ── STAT CARD COMPONENT ── */
function StatCard({ label, value, accent, bg, accentText }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: "20px",
      border: "1px solid rgba(0,0,0,0.07)",
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      borderTop: `4px solid ${accent}`,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36, height: 36,
        background: bg,
        borderRadius: 8,
      }}>
        <div style={{ width: 14, height: 14, background: accent, borderRadius: 3 }} />
      </div>
      <div style={{
        fontSize: "1.9rem",
        fontWeight: 800,
        color: accentText || accent,
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "#888",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}>
        {label}
      </div>
    </div>
  );
}

/* ════════════════ STYLE TOKENS ════════════════ */
const s = {
  /* layout */
  main: {
    marginLeft: 260,
    padding: "28px 32px",
    background: "#FDFAF4",
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  /* page header */
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  eyebrow: {
    display: "inline-block",
    fontSize: "0.7rem",
    fontWeight: 700,
    background: "#5C3A1E",
    color: "#F5B800",
    padding: "2px 10px",
    borderRadius: 4,
    letterSpacing: "1px",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "#5C3A1E",
    margin: 0,
    lineHeight: 1.2,
  },
  pageSub: {
    fontSize: "0.82rem",
    color: "#888",
    margin: "4px 0 0",
  },

  /* refresh button */
  refreshBtn: {
    background: "#F5B800",
    color: "#5C3A1E",
    border: "none",
    borderRadius: 8,
    padding: "9px 18px",
    fontWeight: 700,
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "background 0.15s",
    flexShrink: 0,
  },

  /* stat grid */
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14,
    marginBottom: 24,
  },

  /* toolbar */
  toolbar: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 16,
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 8,
    padding: "8px 12px",
    flex: 1,
    minWidth: 200,
    gap: 8,
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },
  searchIcon: { fontSize: "0.9rem", flexShrink: 0 },
  searchInput: {
    border: "none",
    outline: "none",
    flex: 1,
    fontSize: "0.88rem",
    background: "transparent",
    color: "#2C2C2A",
  },
  clearBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#aaa",
    fontSize: "0.85rem",
    padding: 0,
  },
  dateFilter: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  dateLabel: { fontSize: "0.82rem", color: "#555", whiteSpace: "nowrap" },
  dateInput: {
    padding: "7px 10px",
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 8,
    fontSize: "0.85rem",
    background: "#fff",
    color: "#2C2C2A",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },
  todayBtn: {
    padding: "7px 14px",
    borderRadius: 8,
    border: "1px solid #C5E1A5",
    background: "#E8F5E9",
    color: "#2E7D32",
    fontSize: "0.82rem",
    cursor: "pointer",
    fontWeight: 600,
    whiteSpace: "nowrap",
    transition: "background 0.15s",
  },
  allBtn: {
    padding: "7px 14px",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    color: "#5C3A1E",
    fontSize: "0.82rem",
    cursor: "pointer",
    fontWeight: 600,
    whiteSpace: "nowrap",
    transition: "background 0.15s",
  },

  /* card */
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "20px 24px",
    border: "1px solid rgba(0,0,0,0.07)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    borderLeft: "4px solid #2E7D32",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#1E1E1E",
    marginBottom: 2,
  },
  cardSub: {
    fontSize: "0.78rem",
    color: "#888",
  },
  chip: {
    fontSize: "0.75rem",
    padding: "4px 12px",
    borderRadius: 20,
    background: "#F5EDE5",
    color: "#5C3A1E",
    fontWeight: 600,
    border: "1px solid rgba(92,58,30,0.15)",
    whiteSpace: "nowrap",
  },

  /* state */
  stateWrap: {
    textAlign: "center",
    padding: "40px 0",
    color: "#aaa",
  },
  stateText: {
    fontSize: "0.88rem",
    color: "#aaa",
  },
  spinner: {
    width: 24,
    height: 24,
    border: "3px solid #C5E1A5",
    borderTopColor: "#2E7D32",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto 12px",
  },

  /* table */
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    background: "#FDFAF4",
    padding: "10px 14px",
    textAlign: "left",
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    borderBottom: "2px solid rgba(0,0,0,0.07)",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "11px 14px",
    borderBottom: "1px solid rgba(0,0,0,0.05)",
    fontSize: "0.87rem",
    color: "#2C2C2A",
    transition: "background 0.1s",
  },
  tr: { transition: "background 0.1s" },
  mono: {
    fontFamily: "'Courier New', monospace",
    fontSize: "0.8rem",
    color: "#888",
  },

  /* badges */
  badge: {
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: "0.72rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  badgeIn: {
    background: "#E8F5E9",
    color: "#2E7D32",
    border: "1px solid #C5E1A5",
  },
  badgeOut: {
    background: "#F5EDE5",
    color: "#5C3A1E",
    border: "1px solid rgba(92,58,30,0.2)",
  },
  nullBadge: {
    color: "#ccc",
    fontStyle: "italic",
  },

  /* pagination */
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    marginTop: 20,
    paddingTop: 16,
    borderTop: "1px solid rgba(0,0,0,0.06)",
  },
  pageBtn: {
    background: "#F5EDE5",
    border: "1px solid rgba(92,58,30,0.2)",
    color: "#5C3A1E",
    padding: "7px 16px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: 700,
    transition: "opacity 0.15s",
  },
  pageInfo: {
    fontSize: "0.85rem",
    color: "#666",
  },
};