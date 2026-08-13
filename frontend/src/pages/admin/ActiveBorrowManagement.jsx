// src/pages/admin/ActiveBorrowManagement.jsx
import { useEffect, useState, useRef } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import Select from "react-select";
import socket from "../../socket";

// ── React-Select styled to match design system ───────────────────────────────
const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "6px",
    borderColor: state.isFocused ? "#14532D" : "#E4DFD3",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(20,83,45,0.12)" : "none",
    fontSize: "0.85rem",
    minHeight: "38px",
    fontFamily: "'Inter', sans-serif",
    background: "#fff",
    "&:hover": { borderColor: "#14532D" },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? "#14532D" : state.isFocused ? "#EEF3E7" : "white",
    color: state.isSelected ? "white" : "#241F18",
    fontSize: "0.85rem",
    fontFamily: "'Inter', sans-serif",
  }),
  placeholder: (base) => ({ ...base, color: "#B0A89C", fontSize: "0.85rem" }),
  singleValue: (base) => ({ ...base, color: "#241F18" }),
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Clock:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Book:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Return:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>,
  Rows:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Search:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  X:        () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Reject:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Refresh:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.28-3.41"/></svg>,
  Plus:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Chevron:  ({ open }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"/></svg>,
  Prev:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Next:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending_borrow:  { label: "Pending Approval", cls: "badge-pending" },
  borrowed:        { label: "Borrowed",          cls: "badge-borrowed" },
  pending_return:  { label: "Pending Return",    cls: "badge-pending-return" },
  returned:        { label: "Returned",          cls: "badge-returned" },
};

const FILTERS = [
  { value: "all",            label: "All" },
  { value: "pending_borrow", label: "Pending Approval" },
  { value: "borrowed",       label: "Borrowed" },
  { value: "pending_return", label: "Pending Return" },
  { value: "returned",       label: "Returned" },
];

export default function ActiveBorrowManagement() {
  const [users, setUsers]             = useState([]);
  const [books, setBooks]             = useState([]);
  const [borrows, setBorrows]         = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showBorrowForm, setShowBorrowForm] = useState(false);
  const [search, setSearch]           = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stats, setStats]             = useState({});
  const [filter, setFilter]           = useState("all");
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [loading, setLoading]         = useState(false);

  const token   = localStorage.getItem("token");
  const baseURL = import.meta.env.VITE_API_URL;
  const abortRef = useRef(null);

  const headers = {
    Authorization: `Bearer ${token}`,
    "ngrok-skip-browser-warning": "true",
  };

  /* ── Fetch stats ── */
  const fetchStats = async () => {
    try {
      const res  = await fetch(`${baseURL}/api/admin/active?page=1&limit=10000`, { headers });
      const data = await res.json();
      const list = data.borrows || [];
      setStats({
        pending:       list.filter(b => b.status === "pending_borrow").length,
        active:        list.filter(b => b.status === "borrowed").length,
        pendingReturn: list.filter(b => b.status === "pending_return").length,
        total:         list.length,
      });
    } catch (err) { console.error("Stats error:", err); }
  };

  const fetchUsers = async () => {
    try {
      const res  = await fetch(`${baseURL}/api/users?page=1&limit=1000`, { headers });
      const data = await res.json();
      setUsers((data.users || []).map(u => ({
        value: u.id,
        label: `${u.full_name}${u.lrn ? ` — ${u.lrn}` : ""}`,
      })));
    } catch (err) { console.error("Users fetch error:", err); }
  };

  const fetchBooks = async () => {
    try {
      const res  = await fetch(`${baseURL}/api/books?page=1&limit=1000`, { headers });
      const data = await res.json();
      setBooks((data.books || []).map(b => ({ value: b.id, label: b.title })));
    } catch (err) { console.error("Books fetch error:", err); }
  };

  const fetchBorrows = async (pageNum = 1, searchText = "") => {
    try {
      setLoading(true);
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      const params = new URLSearchParams({
        page: pageNum, limit: 15, search: searchText,
        status: filter === "all" ? "" : filter,
      });
      const res  = await fetch(`${baseURL}/api/admin/active?${params}`, { headers, signal: abortRef.current.signal });
      const data = await res.json();
      setBorrows(data.borrows || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      if (err.name !== "AbortError") console.error(err);
    } finally { setLoading(false); }
  };

  /* ── Actions ── */
  const handleBorrow = async () => {
    if (!selectedUser || !selectedBook) return alert("Select both a student and a book.");
    try {
      const res = await fetch(`${baseURL}/api/admin/borrow`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUser.value, book_id: selectedBook.value }),
      });
      if (res.ok) {
        setSelectedUser(null); setSelectedBook(null); setShowBorrowForm(false);
        fetchStats(); fetchBorrows(page, debouncedSearch);
      } else { alert("Failed to create borrow record."); }
    } catch (err) { console.error(err); alert("Error creating borrow."); }
  };

  const approveBorrow = async (id) => {
    await fetch(`${baseURL}/api/admin/approve-borrow`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ borrow_id: id }),
    });
    fetchStats(); fetchBorrows(page, debouncedSearch);
  };

  const approveReturn = async (id) => {
    await fetch(`${baseURL}/api/admin/approve-return`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ borrow_id: id }),
    });
    fetchStats(); fetchBorrows(page, debouncedSearch);
  };

  const directReturn = async (id) => {
    if (!confirm("Process return directly?")) return;
    const res = await fetch(`${baseURL}/api/admin/return`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ borrow_id: id }),
    });
    if (!res.ok) { const d = await res.json(); alert(d.message || "Return failed."); return; }
    fetchStats(); fetchBorrows(page, debouncedSearch);
  };

  const rejectRequest = async (id) => {
    if (!confirm("Reject this request?")) return;
    await fetch(`${baseURL}/api/borrows/admin/reject`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ borrow_id: id }),
    });
    fetchStats(); fetchBorrows(page, debouncedSearch);
  };

  /* ── Effects ── */
  useEffect(() => { fetchUsers(); fetchBooks(); fetchStats(); fetchBorrows(1, ""); }, []);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { fetchBorrows(page, debouncedSearch); }, [page, debouncedSearch, filter]);

  useEffect(() => {
    if (!token) return;
    if (!socket.connected) socket.connect();
    socket.auth = { token };
    socket.emit("join", "admins");
    socket.on("borrowUpdate", () => { fetchStats(); fetchBorrows(page, debouncedSearch); });
    return () => socket.off("borrowUpdate");
  }, [page, debouncedSearch]);

  /* ── Helpers ── */
  const formatDueDate = (due) => {
    if (!due) return <span style={{ color: "#B0A89C" }}>—</span>;
    const d = new Date(due);
    const overdue = d < new Date();
    return (
      <span style={{ color: overdue ? "#A13D2B" : "#241F18", fontWeight: overdue ? 600 : 400, fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.82rem" }}>
        {overdue && <span style={{ marginRight: 4, fontSize: "0.7rem", background: "#FBDCD5", color: "#A13D2B", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>Overdue</span>}
        {d.toLocaleDateString()}
      </span>
    );
  };

  const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || { label: status, cls: "badge-default" };
    return <span className={`abm-badge ${cfg.cls}`}>{cfg.label}</span>;
  };

  return (
    <>
      <AdminSidebar />

      <div className="abm-main">

        {/* ── Page header ── */}
        <header className="abm-header">
          <div>
            <p className="abm-eyebrow">Circulation Desk</p>
            <h1 className="abm-title">Borrow Management</h1>
          </div>
          <button
            className="abm-refresh-btn"
            onClick={() => { fetchStats(); fetchBorrows(page, debouncedSearch); }}
          >
            <Icons.Refresh /> Refresh
          </button>
        </header>

        {/* ── KPI strip ── */}
        <div className="abm-kpi-strip">
          <KpiCard icon={<Icons.Clock />}  label="Pending Approval" value={stats.pending      ?? "—"} tone="gold" />
          <KpiCard icon={<Icons.Book />}   label="Borrowed"         value={stats.active        ?? "—"} tone="forest" />
          <KpiCard icon={<Icons.Return />} label="Pending Return"   value={stats.pendingReturn ?? "—"} tone="espresso" />
          <KpiCard icon={<Icons.Rows />}   label="Total Records"    value={stats.total         ?? "—"} tone="neutral" />
        </div>

        {/* ── Manual borrow form (collapsible) ── */}
        <div className="abm-card abm-form-card">
          <button
            className="abm-form-toggle"
            onClick={() => setShowBorrowForm(v => !v)}
            aria-expanded={showBorrowForm}
          >
            <span className="abm-form-toggle-left">
              <Icons.Plus />
              <span>Create manual borrow</span>
            </span>
            <Icons.Chevron open={showBorrowForm} />
          </button>

          {showBorrowForm && (
            <div className="abm-form-body">
              <div className="abm-form-row">
                <div className="abm-form-group">
                  <label className="abm-label">Student</label>
                  <Select
                    options={users}
                    value={selectedUser}
                    onChange={setSelectedUser}
                    placeholder="Search student…"
                    styles={selectStyles}
                    isSearchable
                  />
                </div>
                <div className="abm-form-group">
                  <label className="abm-label">Book</label>
                  <Select
                    options={books}
                    value={selectedBook}
                    onChange={setSelectedBook}
                    placeholder="Search book…"
                    styles={selectStyles}
                    isSearchable
                  />
                </div>
                <button className="abm-create-btn" onClick={handleBorrow}>
                  <Icons.Plus /> Create borrow
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Toolbar ── */}
        <div className="abm-toolbar">
          <div className="abm-search-wrap">
            <Icons.Search />
            <input
              className="abm-search-input"
              placeholder="Search by student or book title…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="abm-search-clear" onClick={() => setSearch("")}>
                <Icons.X />
              </button>
            )}
          </div>

          <div className="abm-filter-tabs">
            {FILTERS.map(f => (
              <button
                key={f.value}
                className={`abm-filter-tab ${filter === f.value ? "tab-active" : ""}`}
                onClick={() => { setFilter(f.value); setPage(1); }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table card ── */}
        <div className="abm-card">
          <div className="abm-table-meta">
            <span className="abm-record-count">
              {loading ? "Loading…" : `${borrows.length} record${borrows.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {loading ? (
            <div className="abm-state-box">
              <div className="abm-spinner" />
              <span>Loading records…</span>
            </div>
          ) : borrows.length === 0 ? (
            <div className="abm-state-box">
              <Icons.Book />
              <span>No borrow records found.</span>
            </div>
          ) : (
            <div className="abm-table-wrap">
              <table className="abm-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Book</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {borrows.map(b => (
                    <tr key={b.id}>
                      <td>
                        <span className="abm-student-name">{b.full_name}</span>
                      </td>
                      <td>
                        <span className="abm-book-title">{b.title}</span>
                      </td>
                      <td>{formatDueDate(b.due_date)}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td>
                        <div className="abm-actions">
                          {b.status === "pending_borrow" && (
                            <>
                              <button className="abm-btn abm-btn-approve" onClick={() => approveBorrow(b.id)}>
                                <Icons.Check /> Approve
                              </button>
                              <button className="abm-btn abm-btn-reject" onClick={() => rejectRequest(b.id)}>
                                <Icons.Reject /> Reject
                              </button>
                            </>
                          )}
                          {b.status === "borrowed" && (
                            <button className="abm-btn abm-btn-return" onClick={() => directReturn(b.id)}>
                              <Icons.Return /> Return
                            </button>
                          )}
                          {b.status === "pending_return" && (
                            <>
                              <button className="abm-btn abm-btn-approve" onClick={() => approveReturn(b.id)}>
                                <Icons.Check /> Approve
                              </button>
                              <button className="abm-btn abm-btn-reject" onClick={() => rejectRequest(b.id)}>
                                <Icons.Reject /> Reject
                              </button>
                            </>
                          )}
                          {b.status === "returned" && (
                            <span className="abm-completed">Completed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ── */}
          {!loading && totalPages > 1 && (
            <div className="abm-pagination">
              <button className="abm-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <Icons.Prev /> Prev
              </button>
              <span className="abm-page-info">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
              <button className="abm-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
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
        .abm-main {
          margin-left: 248px;
          padding: 36px 40px 64px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
        }

        /* ── Header ── */
        .abm-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: 28px;
        }
        .abm-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .abm-title {
          font-family: 'Fraunces', serif;
          font-size: 2rem; font-weight: 600;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
        }
        .abm-refresh-btn {
          display: flex; align-items: center; gap: 6px;
          background: white; border: 1px solid var(--line);
          color: var(--ink-soft); padding: 8px 14px;
          border-radius: 6px; font-size: 0.82rem; font-weight: 500;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: border-color 0.15s, color 0.15s;
        }
        .abm-refresh-btn:hover { border-color: var(--forest); color: var(--forest); }

        /* ── KPI strip ── */
        .abm-kpi-strip {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 16px; margin-bottom: 24px;
        }
        .abm-kpi {
          background: white; border: 1px solid var(--line);
          border-radius: 6px; padding: 16px 18px;
          border-left: 4px solid var(--line);
          display: flex; align-items: center; gap: 14px;
        }
        .abm-kpi.tone-forest   { border-left-color: var(--forest); }
        .abm-kpi.tone-gold     { border-left-color: var(--gold); }
        .abm-kpi.tone-espresso { border-left-color: var(--espresso); }
        .abm-kpi.tone-neutral  { border-left-color: var(--ink-soft); }

        .abm-kpi-icon {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 6px;
          background: var(--sage); color: var(--forest); flex-shrink: 0;
        }
        .abm-kpi-body {}
        .abm-kpi-value {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 1.7rem; font-weight: 600;
          color: var(--ink); line-height: 1;
        }
        .abm-kpi-label {
          font-size: 0.72rem; color: var(--ink-soft);
          text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;
        }

        /* ── Cards ── */
        .abm-card {
          background: white; border: 1px solid var(--line);
          border-radius: 6px; margin-bottom: 20px; overflow: hidden;
        }

        /* ── Borrow form ── */
        .abm-form-card { overflow: visible; }
        .abm-form-toggle {
          width: 100%; display: flex; align-items: center;
          justify-content: space-between; padding: 16px 20px;
          background: none; border: none; cursor: pointer;
          font-family: 'Inter', sans-serif; font-size: 0.88rem;
          font-weight: 600; color: var(--forest);
          border-bottom: 1px solid transparent;
          transition: background 0.12s, border-color 0.12s;
        }
        .abm-form-toggle:hover { background: var(--sage); }
        .abm-form-toggle[aria-expanded="true"] { border-bottom-color: var(--line); }
        .abm-form-toggle-left { display: flex; align-items: center; gap: 8px; }

        .abm-form-body { padding: 20px; background: #FDFAF5; }
        .abm-form-row {
          display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap;
        }
        .abm-form-group { flex: 1; min-width: 200px; }
        .abm-label {
          display: block; font-size: 0.75rem; font-weight: 600;
          color: var(--ink-soft); margin-bottom: 6px;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .abm-create-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--forest); color: white;
          border: none; padding: 9px 18px; border-radius: 6px;
          font-size: 0.85rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; white-space: nowrap;
          transition: background 0.15s;
        }
        .abm-create-btn:hover { background: var(--forest-lt); }

        /* ── Toolbar ── */
        .abm-toolbar {
          display: flex; gap: 12px; flex-wrap: wrap;
          align-items: center; margin-bottom: 16px;
        }
        .abm-search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: white; border: 1px solid var(--line);
          border-radius: 6px; padding: 8px 12px;
          flex: 1; min-width: 260px;
          transition: border-color 0.15s;
        }
        .abm-search-wrap:focus-within { border-color: var(--forest); }
        .abm-search-wrap svg { color: var(--ink-soft); flex-shrink: 0; }
        .abm-search-input {
          border: none; outline: none; flex: 1;
          font-size: 0.85rem; font-family: 'Inter', sans-serif;
          color: var(--ink); background: transparent;
        }
        .abm-search-input::placeholder { color: #B0A89C; }
        .abm-search-clear {
          background: none; border: none; cursor: pointer;
          color: var(--ink-soft); display: flex; align-items: center;
          padding: 2px; border-radius: 3px;
        }
        .abm-search-clear:hover { color: var(--ink); }

        .abm-filter-tabs {
          display: flex; gap: 2px;
          background: var(--line); border-radius: 6px; padding: 3px;
          flex-wrap: wrap;
        }
        .abm-filter-tab {
          padding: 6px 12px; border: none; border-radius: 4px;
          font-size: 0.78rem; font-weight: 500; cursor: pointer;
          background: transparent; color: var(--ink-soft);
          font-family: 'Inter', sans-serif; white-space: nowrap;
          transition: background 0.12s, color 0.12s;
        }
        .abm-filter-tab.tab-active {
          background: white; color: var(--forest); font-weight: 600;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        /* ── Table ── */
        .abm-table-meta {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 20px; border-bottom: 1px solid var(--line);
        }
        .abm-record-count {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.78rem; color: var(--ink-soft);
        }

        .abm-state-box {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 12px; padding: 60px 0;
          color: var(--ink-soft); font-size: 0.88rem;
        }
        .abm-state-box svg { opacity: 0.35; }

        .abm-spinner {
          width: 24px; height: 24px;
          border: 2.5px solid var(--line); border-top-color: var(--forest);
          border-radius: 50%; animation: abm-spin 0.7s linear infinite;
        }
        @keyframes abm-spin { to { transform: rotate(360deg); } }

        .abm-table-wrap { overflow-x: auto; }
        .abm-table {
          width: 100%; border-collapse: collapse;
          font-size: 0.875rem;
        }
        .abm-table thead th {
          padding: 11px 16px;
          background: var(--sage);
          text-align: left;
          font-size: 0.72rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: var(--forest); white-space: nowrap;
          border-bottom: 1px solid var(--line);
        }
        .abm-table tbody td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--line);
          vertical-align: middle;
        }
        .abm-table tbody tr:last-child td { border-bottom: none; }
        .abm-table tbody tr:hover td { background: #FDFAF5; }

        .abm-student-name { font-weight: 600; color: var(--ink); }
        .abm-book-title {
          color: var(--ink-soft);
          display: -webkit-box; -webkit-line-clamp: 1;
          -webkit-box-orient: vertical; overflow: hidden;
          max-width: 220px;
        }

        /* ── Status badges ── */
        .abm-badge {
          display: inline-block; padding: 3px 10px; border-radius: 20px;
          font-size: 0.72rem; font-weight: 600;
          white-space: nowrap; letter-spacing: 0.02em;
        }
        .badge-pending       { background: #FEF3C7; color: #92400E; }
        .badge-borrowed      { background: #DBEAFE; color: #1E3A8A; }
        .badge-pending-return { background: #FFEDD5; color: #7C2D12; }
        .badge-returned      { background: #D1FAE5; color: #064E3B; }
        .badge-default       { background: var(--sage); color: var(--ink-soft); }

        /* ── Action buttons ── */
        .abm-actions {
          display: flex; gap: 6px; align-items: center; flex-wrap: wrap;
        }
        .abm-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 12px; border: none; border-radius: 5px;
          font-size: 0.75rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; white-space: nowrap;
          transition: opacity 0.15s;
        }
        .abm-btn:hover { opacity: 0.85; }
        .abm-btn-approve { background: var(--forest); color: white; }
        .abm-btn-reject  { background: var(--rust); color: white; }
        .abm-btn-return  {
          background: white; color: var(--forest);
          border: 1px solid var(--forest);
        }
        .abm-btn-return:hover { background: var(--sage); opacity: 1; }

        .abm-completed {
          font-size: 0.75rem; font-weight: 600;
          color: var(--forest-lt); font-family: 'IBM Plex Mono', monospace;
        }

        /* ── Pagination ── */
        .abm-pagination {
          display: flex; justify-content: center; align-items: center;
          gap: 16px; padding: 16px;
          border-top: 1px solid var(--line);
        }
        .abm-page-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 7px 14px; border-radius: 6px;
          border: 1px solid var(--line); background: white;
          color: var(--forest); font-size: 0.82rem; font-weight: 600;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: background 0.12s, border-color 0.12s;
        }
        .abm-page-btn:hover:not(:disabled) { background: var(--sage); border-color: var(--forest); }
        .abm-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .abm-page-info {
          font-size: 0.82rem; color: var(--ink-soft);
          font-family: 'IBM Plex Mono', monospace;
        }
        .abm-page-info strong { color: var(--ink); }

        /* ── Responsive ── */
        @media (max-width: 1100px) {
          .abm-kpi-strip { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 1000px) {
          .abm-main { margin-left: 0; padding: 24px 20px 48px; }
        }
        @media (max-width: 640px) {
          .abm-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .abm-kpi-strip { grid-template-columns: 1fr 1fr; }
          .abm-toolbar { flex-direction: column; }
          .abm-filter-tabs { width: 100%; }
        }
      `}</style>
    </>
  );
}

/* ── KPI card ── */
function KpiCard({ icon, label, value, tone }) {
  return (
    <div className={`abm-kpi tone-${tone}`}>
      <div className="abm-kpi-icon">{icon}</div>
      <div className="abm-kpi-body">
        <div className="abm-kpi-value">{value}</div>
        <div className="abm-kpi-label">{label}</div>
      </div>
    </div>
  );
}