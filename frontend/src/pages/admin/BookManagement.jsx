import { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { useNavigate } from "react-router-dom";
import socket from "../../socket";

const baseUrl = import.meta.env.VITE_API_URL;

function coverUrl(book) {
  if (!book.cover_image) return null;
  return `${baseUrl}${book.cover_image.startsWith("/") ? "" : "/"}${book.cover_image}`;
}

// ── Placeholder SVG when no cover image ──────────────────────────────────────
function BookPlaceholder({ title }) {
  const initial = title?.charAt(0)?.toUpperCase() || "B";
  return (
    <div className="book-placeholder">
      <svg width="40" height="52" viewBox="0 0 40 52" fill="none">
        <rect x="4" y="2" width="32" height="48" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
        <rect x="1" y="4" width="5" height="44" rx="2" fill="rgba(0,0,0,0.18)"/>
        <line x1="10" y1="16" x2="34" y2="16" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
        <line x1="10" y1="22" x2="30" y2="22" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
        <line x1="10" y1="28" x2="28" y2="28" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      </svg>
      <span className="book-initial">{initial}</span>
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const available = status === "available";
  return (
    <span className={`status-pill ${available ? "pill-available" : "pill-unavailable"}`}>
      <span className="pill-dot" />
      {available ? "Available" : "Unavailable"}
    </span>
  );
}

// ── Type chip ─────────────────────────────────────────────────────────────────
function TypeChip({ type }) {
  return (
    <span className={`type-chip chip-${type}`}>
      {type === "digital" ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      )}
      {type}
    </span>
  );
}

export default function BookManagement() {
  const [books, setBooks]         = useState([]);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("all");
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState([]);

  const navigate  = useNavigate();
  const limit     = 12; // cards look better in 12s (divides into 3 & 4 cols)
  const token     = localStorage.getItem("token");

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page, limit, search,
        status: filter === "all" ? "" : filter,
      });
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/books?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "anyvalue" } }
      );
      if (!res.ok) throw new Error("Failed to fetch books");
      const data = await res.json();
      setBooks(data.books || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Error loading books:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooks(); }, [page, search, filter]);

  useEffect(() => {
    if (!token) return;
    if (!socket.connected) socket.connect();
    socket.auth = { token };
    socket.emit("join", "admins");
    socket.on("borrowUpdate", fetchBooks);
    return () => socket.off("borrowUpdate", fetchBooks);
  }, [token]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this book?")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/books/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setSelected(prev => prev.filter(x => x !== id));
      fetchBooks();
    } catch (err) { console.error("Delete error:", err); }
  };

  const handleBulkDelete = async () => {
    if (!selected.length) return alert("No books selected");
    if (!confirm(`Delete ${selected.length} books?`)) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/books/bulk-delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: selected }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");
      setSelected([]);
      fetchBooks();
    } catch (err) { console.error(err); alert("Bulk delete failed"); }
  };

  const toggleSelect   = (id) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const toggleSelectAll = () => {
    const pageIds = books.map(b => b.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selected.includes(id));
    if (allSelected) {
      setSelected(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelected(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  const allOnPageSelected = books.length > 0 && books.every(b => selected.includes(b.id));

  return (
    <>
      <AdminSidebar />

      <div className="bm-main">

        {/* ── Page header ── */}
        <header className="bm-header">
          <div>
            <p className="bm-eyebrow">Library Inventory</p>
            <h1 className="bm-title">Book Management</h1>
          </div>
          <button className="btn-primary" onClick={() => navigate("/admin/add-book")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Book
          </button>
        </header>

        {/* ── Controls bar ── */}
        <div className="bm-controls">
          <div className="search-wrap">
            <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="search-input"
              placeholder="Search by title or author…"
              value={search}
              onChange={e => { setPage(1); setSearch(e.target.value); }}
            />
          </div>

          <div className="filter-tabs">
            {["all", "available", "unavailable"].map(f => (
              <button
                key={f}
                className={`filter-tab ${filter === f ? "tab-active" : ""}`}
                onClick={() => { setPage(1); setFilter(f); }}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Select-all toggle (visible when any cards exist) */}
          {books.length > 0 && (
            <label className="select-all-label">
              <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll} />
              <span>Select page</span>
            </label>
          )}
        </div>

        {/* ── Bulk action bar ── */}
        {selected.length > 0 && (
          <div className="bulk-bar">
            <div className="bulk-info">
              <span className="bulk-count">{selected.length}</span>
              <span className="bulk-desc">book{selected.length !== 1 ? "s" : ""} selected</span>
            </div>
            <div className="bulk-actions">
              <button className="btn-ghost-white" onClick={() => setSelected([])}>Clear selection</button>
              <button className="btn-danger" onClick={handleBulkDelete}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                Delete selected
              </button>
            </div>
          </div>
        )}

        {/* ── Book card grid ── */}
        {loading ? (
          <div className="bm-empty">
            <div className="bm-spinner" />
            <p>Loading books…</p>
          </div>
        ) : books.length === 0 ? (
          <div className="bm-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#C4BFB5" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <p>No books found.</p>
          </div>
        ) : (
          <div className="book-grid">
            {books.map(book => {
              const imgSrc    = coverUrl(book);
              const isSelected = selected.includes(book.id);
              return (
                <div key={book.id} className={`book-card ${isSelected ? "card-selected" : ""}`}>

                  {/* ── Selection checkbox ── */}
                  <label className="card-checkbox" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(book.id)}
                    />
                  </label>

                  <div className="book-cover" onClick={() => navigate(`/admin/books/${book.id}`)}>
  {imgSrc && (
    <img
      src={imgSrc}
      alt={`Cover of ${book.title}`}
      className="cover-img"
      onLoad={e  => { e.target.style.opacity = "1"; e.target.nextSibling.style.display = "none"; }}
      onError={e => { e.target.style.display = "none"; }}
      style={{ opacity: 0, transition: "opacity 0.2s" }}
    />
  )}
  <BookPlaceholder title={book.title} />
</div>

                  {/* ── Card body ── */}
                  <div className="book-body">
                    <div className="book-meta-chips">
                      <TypeChip type={book.type} />
                      <StatusPill status={book.status} />
                    </div>

                    <h3 className="book-title" title={book.title}>{book.title}</h3>
                    <p className="book-author">{book.author}</p>

                    <div className="book-details">
                      {book.section && (
                        <span className="book-detail-item">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          {book.section}
                        </span>
                      )}
                      {book.type !== "digital" && book.copies != null && (
                        <span className="book-detail-item">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 2v4M16 2v4M2 10h20"/></svg>
                          {book.copies} {book.copies === 1 ? "copy" : "copies"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Gold divider rule ── */}
                  <div className="card-rule" />

                  {/* ── Action row ── */}
                  <div className="card-actions">
                    <button
                      className="card-btn btn-view"
                      onClick={() => navigate(`/admin/books/${book.id}`)}
                      title="View book"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      View
                    </button>

                    <button
                      className="card-btn btn-edit"
                      onClick={() => navigate(`/admin/edit-book/${book.id}`)}
                      title="Edit book"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </button>

                    <button
                      className="card-btn btn-delete"
                      onClick={() => handleDelete(book.id)}
                      title="Delete book"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div className="bm-pagination">
            <button
              className="page-btn"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Prev
            </button>
            <span className="page-info">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

        /* ── Tokens ── */
        :root {
          --forest:      #14532D;
          --forest-lt:   #3E7A4D;
          --gold:        #B8860B;
          --rust:        #A13D2B;
          --parchment:   #FAF6EE;
          --sage:        #EEF3E7;
          --ink:         #241F18;
          --ink-soft:    #5C5546;
          --line:        #E4DFD3;
          --white:       #ffffff;
        }

        /* ── Layout ── */
        .bm-main {
          margin-left: 248px;
          padding: 36px 40px 64px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
        }

        /* ── Page header ── */
        .bm-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 28px;
        }
        .bm-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .bm-title {
          font-family: 'Fraunces', serif;
          font-size: 2rem; font-weight: 600;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
        }

        /* ── Buttons ── */
        .btn-primary {
          display: flex; align-items: center; gap: 7px;
          background: var(--forest); color: white;
          border: none; padding: 10px 18px;
          border-radius: 6px; font-size: 0.85rem;
          font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: background 0.15s;
        }
        .btn-primary:hover { background: var(--forest-lt); }

        .btn-ghost-white {
          background: transparent; color: white;
          border: 1px solid rgba(255,255,255,0.35);
          padding: 8px 14px; border-radius: 5px;
          font-size: 0.82rem; cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: background 0.15s;
        }
        .btn-ghost-white:hover { background: rgba(255,255,255,0.1); }

        .btn-danger {
          display: flex; align-items: center; gap: 6px;
          background: var(--rust); color: white;
          border: none; padding: 8px 14px;
          border-radius: 5px; font-size: 0.82rem;
          font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: background 0.15s;
        }
        .btn-danger:hover { background: #8B3222; }

        /* ── Controls ── */
        .bm-controls {
          display: flex; align-items: center;
          gap: 12px; margin-bottom: 20px; flex-wrap: wrap;
        }
        .search-wrap {
          position: relative; flex: 1; min-width: 220px;
        }
        .search-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); color: var(--ink-soft);
          pointer-events: none;
        }
        .search-input {
          width: 100%; padding: 9px 12px 9px 36px;
          border: 1px solid var(--line); border-radius: 6px;
          font-size: 0.85rem; font-family: 'Inter', sans-serif;
          background: white; color: var(--ink);
          outline: none; box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .search-input:focus { border-color: var(--forest); }
        .search-input::placeholder { color: #B0A89C; }

        .filter-tabs {
          display: flex; gap: 2px;
          background: var(--line); border-radius: 6px; padding: 3px;
        }
        .filter-tab {
          padding: 6px 14px; border: none; border-radius: 4px;
          font-size: 0.8rem; font-weight: 500;
          cursor: pointer; background: transparent; color: var(--ink-soft);
          font-family: 'Inter', sans-serif;
          transition: background 0.12s, color 0.12s;
        }
        .filter-tab.tab-active {
          background: white; color: var(--forest); font-weight: 600;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .select-all-label {
          display: flex; align-items: center; gap: 7px;
          font-size: 0.8rem; color: var(--ink-soft); cursor: pointer;
          white-space: nowrap;
        }
        .select-all-label input { accent-color: var(--forest); cursor: pointer; }

        /* ── Bulk bar ── */
        .bulk-bar {
          display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 12px;
          background: var(--forest);
          border-radius: 8px; padding: 12px 18px;
          margin-bottom: 20px;
        }
        .bulk-info { display: flex; align-items: baseline; gap: 6px; }
        .bulk-count {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 1.3rem; font-weight: 600; color: white; line-height: 1;
        }
        .bulk-desc { font-size: 0.82rem; color: rgba(255,255,255,0.7); }
        .bulk-actions { display: flex; gap: 8px; }

        /* ── Book grid ── */
        .book-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        /* ── Book card ── */
        .book-card {
          background: white;
          border: 1px solid var(--line);
          border-radius: 8px;
          display: flex; flex-direction: column;
          overflow: hidden;
          position: relative;
          transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s;
        }
        .book-card:hover {
          box-shadow: 0 6px 24px rgba(20,83,45,0.10);
          transform: translateY(-2px);
          border-color: #D0CBBF;
        }
        .book-card.card-selected {
          border-color: var(--forest);
          box-shadow: 0 0 0 2px rgba(20,83,45,0.18);
        }

        /* Checkbox */
        .card-checkbox {
          position: absolute; top: 10px; left: 10px; z-index: 2;
          width: 20px; height: 20px; cursor: pointer;
        }
        .card-checkbox input {
          width: 16px; height: 16px;
          accent-color: var(--forest); cursor: pointer;
        }

        /* ── Cover ── */
        .book-cover {
          position: relative;
          height: 190px; overflow: hidden;
          background: linear-gradient(160deg, #1a6338 0%, #14532D 100%);
          cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .cover-img {
          width: 100%; height: 100%; object-fit: cover;
          display: block;
          transition: transform 0.22s;
        }
        .book-card:hover .cover-img { transform: scale(1.03); }

        /* Fallback placeholder (shown when img fails or missing) */
        .book-placeholder {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 10px;
        }
        /* Hide placeholder when real img loaded */
        .cover-img + .book-placeholder { display: none; }

        .book-initial {
          font-family: 'Fraunces', serif;
          font-size: 2.8rem; font-weight: 600;
          color: rgba(255,255,255,0.55);
          line-height: 1;
        }

        /* ── Card body ── */
        .book-body {
          padding: 14px 14px 10px;
          flex: 1; display: flex; flex-direction: column; gap: 5px;
        }
        .book-meta-chips { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 3px; }

        .type-chip {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.68rem; font-weight: 600;
          padding: 3px 8px; border-radius: 20px;
          text-transform: capitalize; letter-spacing: 0.02em;
        }
        .chip-physical { background: var(--sage); color: var(--forest); }
        .chip-digital  { background: #E8F0FC; color: #1D4CA0; }

        .status-pill {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.68rem; font-weight: 600; padding: 3px 8px;
          border-radius: 20px; letter-spacing: 0.02em;
        }
        .pill-available   { background: #D4EDDA; color: #1A5C2A; }
        .pill-unavailable { background: #FBDCD5; color: var(--rust); }
        .pill-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: currentColor; flex-shrink: 0;
        }

        .book-title {
          font-family: 'Fraunces', serif;
          font-size: 0.95rem; font-weight: 600;
          color: var(--ink); margin: 0;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
          line-height: 1.35;
        }
        .book-author {
          font-size: 0.78rem; color: var(--ink-soft); margin: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .book-details {
          display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px;
        }
        .book-detail-item {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.72rem; color: var(--ink-soft);
          font-family: 'IBM Plex Mono', monospace;
        }

        /* ── Gold rule ── */
        .card-rule {
          height: 1px; margin: 0 14px;
          background: linear-gradient(90deg, var(--gold), transparent);
          opacity: 0.4;
        }

        /* ── Action row ── */
        .card-actions {
          display: flex; gap: 0;
          padding: 0;
        }
        .card-btn {
          flex: 1; display: flex; align-items: center; justify-content: center;
          gap: 5px; border: none; background: transparent;
          font-size: 0.75rem; font-weight: 600;
          padding: 10px 4px; cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: background 0.12s, color 0.12s;
          border-top: 1px solid var(--line);
        }
        .card-btn + .card-btn { border-left: 1px solid var(--line); }

        .btn-view   { color: var(--ink-soft); }
        .btn-view:hover { background: var(--sage); color: var(--forest); }

        .btn-edit   { color: var(--forest); }
        .btn-edit:hover { background: var(--sage); color: var(--forest); }

        .btn-delete { color: var(--rust); }
        .btn-delete:hover { background: #FBF0EE; color: var(--rust); }

        /* ── Empty / loading ── */
        .bm-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 16px; padding: 80px 0;
          color: var(--ink-soft); font-size: 0.9rem;
        }
        .bm-spinner {
          width: 28px; height: 28px;
          border: 3px solid var(--line); border-top-color: var(--forest);
          border-radius: 50%; animation: bm-spin 0.8s linear infinite;
        }
        @keyframes bm-spin { to { transform: rotate(360deg); } }

        /* ── Pagination ── */
        .bm-pagination {
          display: flex; justify-content: center; align-items: center; gap: 16px;
        }
        .page-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 8px 16px; border-radius: 6px;
          border: 1px solid var(--line); background: white;
          color: var(--forest); font-size: 0.82rem; font-weight: 600;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: background 0.12s, border-color 0.12s;
        }
        .page-btn:hover:not(:disabled) { background: var(--sage); border-color: var(--forest); }
        .page-btn:disabled { opacity: 0.38; cursor: not-allowed; }
        .page-info {
          font-size: 0.82rem; color: var(--ink-soft);
          font-family: 'IBM Plex Mono', monospace;
        }
        .page-info strong { color: var(--ink); }

        /* ── Responsive ── */
        @media (max-width: 1000px) {
          .bm-main { margin-left: 0; padding: 24px 20px 48px; }
          .book-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
          .book-cover { height: 160px; }
        }
        @media (max-width: 600px) {
          .bm-header { flex-direction: column; align-items: flex-start; gap: 14px; }
          .bm-controls { flex-direction: column; align-items: stretch; }
          .filter-tabs { width: 100%; }
          .book-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </>
  );
}