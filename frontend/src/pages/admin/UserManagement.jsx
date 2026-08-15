// src/pages/admin/UserManagement.jsx
import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { useNavigate } from "react-router-dom";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Plus:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Bell:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Search:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Edit:      () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Eye:       () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Fine:      () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Trash:     () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Prev:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Next:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Users:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  DeleteBulk:() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>,
};

// ── Role chip ─────────────────────────────────────────────────────────────────
function RoleChip({ role }) {
  return (
    <span className={`um-role-chip role-${role}`}>{role}</span>
  );
}

// ── Avatar initials ───────────────────────────────────────────────────────────
function Avatar({ name }) {
  const initials = (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return <div className="um-avatar">{initials}</div>;
}

export default function UserManagement() {
  const [users, setUsers]           = useState([]);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(false);
  const [selected, setSelected]     = useState([]);

  const navigate = useNavigate();
  const limit    = 10;
  const token    = localStorage.getItem("token");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page, limit, search,
        role: roleFilter === "all" ? "" : roleFilter,
      });
      const res  = await fetch(
        `${import.meta.env.VITE_API_URL}/api/users?${params}`,
        { headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "anyvalue" } }
      );
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, search, roleFilter]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this user?")) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelected(prev => prev.filter(x => x !== id));
      fetchUsers();
    } catch (err) { console.error(err); }
  };

  const toggleSelect    = (id) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );
  const toggleSelectAll = () => {
    const pageIds     = users.map(u => u.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selected.includes(id));
    if (allSelected) {
      setSelected(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelected(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handleBulkDelete = async () => {
    if (!selected.length) return alert("No users selected.");
    if (!confirm(`Delete ${selected.length} users?`)) return;
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL}/api/users/bulk-delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSelected([]);
      fetchUsers();
    } catch (err) { console.error(err); alert("Delete failed."); }
  };

  const allOnPageSelected = users.length > 0 && users.every(u => selected.includes(u.id));

  return (
    <>
      <AdminSidebar />

      <div className="um-main">

        {/* ── Page header ── */}
        <header className="um-header">
          <div>
            <p className="um-eyebrow">System Administration</p>
            <h1 className="um-title">User Management</h1>
          </div>
          <div className="um-header-actions">
            <button className="um-btn-secondary" onClick={() => navigate("/admin/AdminNotifications")}>
              <Icons.Bell /> Announcement
            </button>
            <button className="um-btn-primary" onClick={() => navigate("/admin/add-user")}>
              <Icons.Plus /> Add User
            </button>
          </div>
        </header>

        {/* ── Controls ── */}
        <div className="um-controls">
          <div className="um-search-wrap">
            <Icons.Search />
            <input
              className="um-search-input"
              placeholder="Search by name, LRN, or email…"
              value={search}
              onChange={e => { setPage(1); setSearch(e.target.value); }}
            />
          </div>

          <div className="um-filter-tabs">
            {["all", "student", "admin"].map(r => (
              <button
                key={r}
                className={`um-filter-tab ${roleFilter === r ? "tab-active" : ""}`}
                onClick={() => { setPage(1); setRoleFilter(r); }}
              >
                {r === "all" ? "All roles" : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          {users.length > 0 && (
            <label className="um-select-all-label">
              <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll} />
              <span>Select page</span>
            </label>
          )}
        </div>

        {/* ── Bulk bar ── */}
        {selected.length > 0 && (
          <div className="um-bulk-bar">
            <div className="um-bulk-info">
              <span className="um-bulk-count">{selected.length}</span>
              <span className="um-bulk-desc">user{selected.length !== 1 ? "s" : ""} selected</span>
            </div>
            <div className="um-bulk-actions">
              <button className="um-btn-ghost-white" onClick={() => setSelected([])}>
                Clear selection
              </button>
              <button className="um-btn-danger" onClick={handleBulkDelete}>
                <Icons.DeleteBulk /> Delete selected
              </button>
            </div>
          </div>
        )}

        {/* ── Table card ── */}
        <div className="um-card">
          {loading ? (
            <div className="um-state">
              <div className="um-spinner" />
              <span>Loading users…</span>
            </div>
          ) : users.length === 0 ? (
            <div className="um-state">
              <Icons.Users />
              <span>No users found.</span>
            </div>
          ) : (
            <div className="um-table-wrap">
              <table className="um-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAll}
                        style={{ accentColor: "var(--forest)" }}
                      />
                    </th>
                    <th>User</th>
                    <th>LRN</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Unpaid Fines</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.includes(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          style={{ accentColor: "var(--forest)" }}
                        />
                      </td>
                      <td>
                        <div className="um-user-cell">
                          <Avatar name={user.full_name} />
                          <div className="um-user-info">
                            <span className="um-user-name">{user.full_name}</span>
                            <span className="um-user-id">#{user.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="um-mono">{user.lrn || "—"}</td>
                      <td className="um-soft">{user.email}</td>
                      <td><RoleChip role={user.role} /></td>
                      <td>
                        {Number(user.unpaid_fines) > 0 ? (
                          <span className="um-fine-badge">
                            ₱{Number(user.unpaid_fines).toFixed(2)}
                          </span>
                        ) : (
                          <span className="um-no-fine">—</span>
                        )}
                      </td>
                      <td className="um-mono um-soft">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="um-actions">
                          <button
                            className="um-action-btn um-action-view"
                            onClick={() => navigate(`/admin/AdminUserDetail/${user.id}`)}
                            title="View user"
                          >
                            <Icons.Eye /> View
                          </button>
                          <button
                            className="um-action-btn um-action-edit"
                            onClick={() => navigate(`/admin/edit-user/${user.id}`)}
                            title="Edit user"
                          >
                            <Icons.Edit /> Edit
                          </button>
                          <button
                            className="um-action-btn um-action-fine"
                            onClick={() => navigate(`/admin/fines/${user.id}`)}
                            title="Manage fines"
                          >
                            <Icons.Fine /> Fines
                          </button>
                          <button
                            className="um-action-btn um-action-delete"
                            onClick={() => handleDelete(user.id)}
                            title="Delete user"
                          >
                            <Icons.Trash /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="um-pagination">
              <button className="um-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <Icons.Prev /> Prev
              </button>
              <span className="um-page-info">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
              <button className="um-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
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
        .um-main {
          margin-left: 248px;
          padding: 36px 40px 64px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
        }

        /* ── Header ── */
        .um-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: 28px;
        }
        .um-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .um-title {
          font-family: 'Fraunces', serif;
          font-size: 2rem; font-weight: 600;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
        }
        .um-header-actions { display: flex; gap: 8px; }

        /* ── Buttons ── */
        .um-btn-primary {
          display: flex; align-items: center; gap: 7px;
          background: var(--forest); color: white;
          border: none; padding: 9px 16px; border-radius: 6px;
          font-size: 0.84rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: background 0.15s;
        }
        .um-btn-primary:hover { background: var(--forest-lt); }

        .um-btn-secondary {
          display: flex; align-items: center; gap: 7px;
          background: white; color: var(--ink-soft);
          border: 1px solid var(--line); padding: 9px 16px;
          border-radius: 6px; font-size: 0.84rem; font-weight: 500;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: border-color 0.15s, color 0.15s;
        }
        .um-btn-secondary:hover { border-color: var(--forest); color: var(--forest); }

        .um-btn-ghost-white {
          background: transparent; color: white;
          border: 1px solid rgba(255,255,255,0.35);
          padding: 7px 14px; border-radius: 5px;
          font-size: 0.82rem; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: background 0.15s;
        }
        .um-btn-ghost-white:hover { background: rgba(255,255,255,0.1); }

        .um-btn-danger {
          display: flex; align-items: center; gap: 6px;
          background: var(--rust); color: white; border: none;
          padding: 7px 14px; border-radius: 5px;
          font-size: 0.82rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: background 0.15s;
        }
        .um-btn-danger:hover { background: #8B3222; }

        /* ── Controls ── */
        .um-controls {
          display: flex; align-items: center;
          gap: 12px; margin-bottom: 18px; flex-wrap: wrap;
        }
        .um-search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: white; border: 1px solid var(--line);
          border-radius: 6px; padding: 8px 12px;
          flex: 1; min-width: 240px; transition: border-color 0.15s;
        }
        .um-search-wrap:focus-within { border-color: var(--forest); }
        .um-search-wrap svg { color: var(--ink-soft); flex-shrink: 0; }
        .um-search-input {
          border: none; outline: none; flex: 1;
          font-size: 0.85rem; font-family: 'Inter', sans-serif;
          color: var(--ink); background: transparent;
        }
        .um-search-input::placeholder { color: #B0A89C; }

        .um-filter-tabs {
          display: flex; gap: 2px;
          background: var(--line); border-radius: 6px; padding: 3px;
        }
        .um-filter-tab {
          padding: 6px 14px; border: none; border-radius: 4px;
          font-size: 0.8rem; font-weight: 500; cursor: pointer;
          background: transparent; color: var(--ink-soft);
          font-family: 'Inter', sans-serif; white-space: nowrap;
          transition: background 0.12s, color 0.12s;
        }
        .um-filter-tab.tab-active {
          background: white; color: var(--forest); font-weight: 600;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .um-select-all-label {
          display: flex; align-items: center; gap: 7px;
          font-size: 0.8rem; color: var(--ink-soft);
          cursor: pointer; white-space: nowrap;
        }
        .um-select-all-label input { accent-color: var(--forest); cursor: pointer; }

        /* ── Bulk bar ── */
        .um-bulk-bar {
          display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 12px;
          background: var(--forest); border-radius: 8px;
          padding: 12px 18px; margin-bottom: 18px;
        }
        .um-bulk-info { display: flex; align-items: baseline; gap: 6px; }
        .um-bulk-count {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 1.3rem; font-weight: 600; color: white; line-height: 1;
        }
        .um-bulk-desc { font-size: 0.82rem; color: rgba(255,255,255,0.7); }
        .um-bulk-actions { display: flex; gap: 8px; }

        /* ── Card ── */
        .um-card {
          background: white; border: 1px solid var(--line);
          border-radius: 6px; overflow: hidden;
        }

        /* ── State ── */
        .um-state {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 14px; padding: 64px 0;
          color: var(--ink-soft); font-size: 0.88rem;
        }
        .um-state svg { opacity: 0.3; }
        .um-spinner {
          width: 24px; height: 24px;
          border: 2.5px solid var(--line); border-top-color: var(--forest);
          border-radius: 50%; animation: um-spin 0.7s linear infinite;
        }
        @keyframes um-spin { to { transform: rotate(360deg); } }

        /* ── Table ── */
        .um-table-wrap { overflow-x: auto; }
        .um-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }

        .um-table thead th {
          padding: 10px 14px; background: var(--sage);
          text-align: left; font-size: 0.7rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.07em;
          color: var(--forest); border-bottom: 1px solid var(--line);
          white-space: nowrap;
        }
        .um-table tbody td {
          padding: 11px 14px; border-bottom: 1px solid var(--line);
          vertical-align: middle;
        }
        .um-table tbody tr:last-child td { border-bottom: none; }
        .um-table tbody tr:hover td { background: #FDFAF5; }

        /* User cell with avatar */
        .um-user-cell {
          display: flex; align-items: center; gap: 10px;
        }
        .um-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--forest); color: white;
          font-family: 'Fraunces', serif; font-size: 0.72rem; font-weight: 600;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; letter-spacing: 0.02em;
        }
        .um-user-info { display: flex; flex-direction: column; gap: 1px; }
        .um-user-name { font-weight: 600; color: var(--ink); font-size: 0.875rem; }
        .um-user-id {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; color: var(--ink-soft);
        }

        .um-mono {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.8rem;
        }
        .um-soft { color: var(--ink-soft); }

        /* Role chips */
        .um-role-chip {
          display: inline-block; padding: 3px 10px; border-radius: 20px;
          font-size: 0.7rem; font-weight: 600;
          text-transform: capitalize; letter-spacing: 0.03em;
        }
        .role-student { background: var(--sage); color: var(--forest); }
        .role-admin   { background: #EDE9FE; color: #4C1D95; }

        /* Fine badge */
        .um-fine-badge {
          display: inline-block;
          background: #FBDCD5; color: var(--rust);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.75rem; font-weight: 700;
          padding: 3px 10px; border-radius: 20px;
        }
        .um-no-fine { color: var(--line); }

        /* ── Action buttons ── */
        .um-actions { display: flex; gap: 4px; flex-wrap: wrap; }
        .um-action-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 10px; border: none; border-radius: 5px;
          font-size: 0.74rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; white-space: nowrap;
          transition: opacity 0.15s;
        }
        .um-action-btn:hover { opacity: 0.82; }

        .um-action-view   { background: var(--sage);  color: var(--forest); }
        .um-action-edit   { background: #DBEAFE;      color: #1E3A8A; }
        .um-action-fine   { background: #FEF3C7;      color: #92400E; }
        .um-action-delete { background: #FBDCD5;      color: var(--rust); }

        /* ── Pagination ── */
        .um-pagination {
          display: flex; justify-content: center; align-items: center;
          gap: 16px; padding: 14px 20px; border-top: 1px solid var(--line);
        }
        .um-page-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 7px 14px; border-radius: 6px;
          border: 1px solid var(--line); background: white;
          color: var(--forest); font-size: 0.82rem; font-weight: 600;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: background 0.12s, border-color 0.12s;
        }
        .um-page-btn:hover:not(:disabled) { background: var(--sage); border-color: var(--forest); }
        .um-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .um-page-info {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.8rem; color: var(--ink-soft);
        }
        .um-page-info strong { color: var(--ink); }

        /* ── Responsive ── */
        @media (max-width: 1000px) {
          .um-main { margin-left: 0; padding: 24px 20px 48px; }
        }
        @media (max-width: 640px) {
          .um-header { flex-direction: column; align-items: flex-start; gap: 14px; }
          .um-controls { flex-direction: column; align-items: stretch; }
          .um-filter-tabs { width: 100%; }
        }
      `}</style>
    </>
  );
}