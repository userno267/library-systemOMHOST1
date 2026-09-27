import { useEffect, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import { useNavigate } from "react-router-dom";
import socket from "../socket";

// ── Placeholder cover (matches admin BookManagement) ──────────────────────────
function BookPlaceholder({ title }) {
  const initial = title?.charAt(0)?.toUpperCase() || "B";
  return (
    <div className="bb-placeholder">
      <svg width="34" height="46" viewBox="0 0 40 52" fill="none">
        <rect x="4" y="2" width="32" height="48" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
        <rect x="1" y="4" width="5" height="44" rx="2" fill="rgba(0,0,0,0.18)"/>
        <line x1="10" y1="16" x2="34" y2="16" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
        <line x1="10" y1="22" x2="30" y2="22" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
        <line x1="10" y1="28" x2="28" y2="28" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      </svg>
      <span className="bb-placeholder-initial">{initial}</span>
    </div>
  );
}

function StatusPill({ status }) {
  const available = status === "available";
  return (
    <span className={`bb-status-pill ${available ? "bb-pill-available" : "bb-pill-unavailable"}`}>
      <span className="bb-pill-dot" />
      {available ? "Available" : "Unavailable"}
    </span>
  );
}

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const BookIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#C4BFB5" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
);
const PrevIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
);
const NextIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
);

export default function BrowseBooks() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const limit = 12; // matches admin grid density
  const token = localStorage.getItem("token");

  /* ===========================
     FETCH BOOKS (unchanged logic)
  =========================== */
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page,
        limit,
        search,
        type: "physical",
      });

      const url = `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api/books/physical?${params.toString()}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "anyvalue",
        },
      });

      const text = await res.text();

      if (!res.ok) {
        console.error("FETCH BOOKS NON-OK RESPONSE:", text);
        throw new Error(`Failed to fetch books: ${res.status}`);
      }

      const data = JSON.parse(text);
      setBooks(data.books || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("FETCH BOOKS ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, token]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    socket.on("booksUpdated", () => {
      fetchBooks();
    });
    return () => {
      socket.off("booksUpdated");
    };
  }, [fetchBooks]);

  const baseUrl = import.meta.env.VITE_API_URL.replace(/\/$/, "");

  return (
    <>
      <Sidebar />

      <div className="bb-main">

        {/* ── Page header ── */}
        <header className="bb-header">
          <div>
            <p className="bb-eyebrow">Library Catalog</p>
            <h1 className="bb-title">Browse Books</h1>
          </div>
        </header>

        {/* ── Search ── */}
        <div className="bb-controls">
          <div className="bb-search-wrap">
            <SearchIcon />
            <input
              className="bb-search-input"
              placeholder="Search by title or author…"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="bb-empty">
            <div className="bb-spinner" />
            <p>Loading books…</p>
          </div>
        ) : books.length === 0 ? (
          <div className="bb-empty">
            <BookIcon />
            <p>No books found.</p>
          </div>
        ) : (
          <div className="bb-grid">
            {books.map((book) => {
              let coverUrl = null;
              if (book.cover_image) {
                coverUrl = book.cover_image.startsWith("http")
                  ? book.cover_image
                  : `${baseUrl}${book.cover_image.startsWith("/") ? "" : "/"}${book.cover_image}`;
              }

              return (
                <div key={book.id} className="bb-card" onClick={() => navigate(`/books/${book.id}`)}>
                  <div className="bb-cover">
                    <div className="bb-placeholder-wrap">
                      <BookPlaceholder title={book.title} />
                    </div>
                    {coverUrl && (
                      <img
                        src={coverUrl}
                        alt={book.title}
                        className="bb-cover-img"
                        onLoad={(e) => {
                          e.target.style.opacity = "1";
                          const wrap = e.target.parentNode.querySelector(".bb-placeholder-wrap");
                          if (wrap) wrap.style.display = "none";
                        }}
                        onError={(e) => { e.target.style.display = "none"; }}
                        style={{ opacity: 0, transition: "opacity 0.25s" }}
                      />
                    )}
                  </div>

                  <div className="bb-body">
                    <StatusPill status={book.status} />
                    <h3 className="bb-book-title" title={book.title}>{book.title}</h3>
                    <p className="bb-author">{book.author}</p>
                    {book.section && <p className="bb-section">{book.section}</p>}
                  </div>

                  <div className="bb-rule" />

                  <button
                    className="bb-view-btn"
                    onClick={(e) => { e.stopPropagation(); navigate(`/books/${book.id}`); }}
                  >
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div className="bb-pagination">
            <button className="bb-page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <PrevIcon /> Prev
            </button>
            <span className="bb-page-info">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <button className="bb-page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <NextIcon />
            </button>
          </div>
        )}
      </div>

      <BottomNav />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

        :root {
          --forest:    #14532D;
          --forest-lt: #3E7A4D;
          --gold:      #B8860B;
          --parchment: #FAF6EE;
          --sage:      #EEF3E7;
          --ink:       #241F18;
          --ink-soft:  #5C5546;
          --line:      #E4DFD3;
        }

        .bb-main {
          padding: 24px 20px 100px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
        }

        /* Mobile needs room for the fixed hamburger toggle button */
        @media (max-width: 899px) {
          .bb-main { padding-top: 74px; }
        }

        /* ── Header ── */
        .bb-header { margin-bottom: 22px; }
        .bb-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .bb-title {
          font-family: 'Fraunces', serif; font-size: 1.7rem;
          font-weight: 600; color: var(--forest); margin: 0;
          letter-spacing: -0.01em;
        }

        /* ── Controls ── */
        .bb-controls { margin-bottom: 20px; }
        .bb-search-wrap {
          position: relative;
          max-width: 420px;
        }
        .bb-search-wrap svg {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); color: var(--ink-soft);
          pointer-events: none;
        }
        .bb-search-input {
          width: 100%; padding: 10px 12px 10px 36px;
          border: 1px solid var(--line); border-radius: 6px;
          font-size: 0.875rem; font-family: 'Inter', sans-serif;
          background: white; color: var(--ink);
          outline: none; box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .bb-search-input:focus { border-color: var(--forest); }
        .bb-search-input::placeholder { color: #B0A89C; }

        /* ── Grid ── */
        .bb-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }
        @media (min-width: 640px) {
          .bb-grid { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }
        }
        @media (min-width: 900px) {
          .bb-grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 20px; }
        }
        @media (min-width: 1300px) {
          .bb-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
        }

        /* ── Card ── */
        .bb-card {
          background: white;
          border: 1px solid var(--line);
          border-radius: 8px;
          display: flex; flex-direction: column;
          overflow: hidden;
          cursor: pointer;
          transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s;
        }
        .bb-card:hover {
          box-shadow: 0 6px 24px rgba(20,83,45,0.10);
          transform: translateY(-2px);
          border-color: #D0CBBF;
        }

        .bb-cover {
          position: relative;
          height: 150px;
          overflow: hidden;
          background: linear-gradient(160deg, #1a6338 0%, #14532D 100%);
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        @media (min-width: 900px) { .bb-cover { height: 190px; } }

        .bb-placeholder-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
        .bb-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 100%; }
        .bb-placeholder-initial {
          font-family: 'Fraunces', serif; font-size: 2.2rem; font-weight: 600;
          color: rgba(255,255,255,0.55); line-height: 1;
        }
        .bb-cover-img {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; display: block; transition: transform 0.22s;
        }
        .bb-card:hover .bb-cover-img { transform: scale(1.03); }

        /* ── Body ── */
        .bb-body { padding: 12px 12px 6px; flex: 1; display: flex; flex-direction: column; gap: 4px; }

        .bb-status-pill {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.66rem; font-weight: 600; padding: 3px 8px;
          border-radius: 20px; letter-spacing: 0.02em; width: fit-content;
          margin-bottom: 2px;
        }
        .bb-pill-available   { background: #D4EDDA; color: #1A5C2A; }
        .bb-pill-unavailable { background: #FBDCD5; color: #A13D2B; }
        .bb-pill-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

        .bb-book-title {
          font-family: 'Fraunces', serif; font-size: 0.92rem; font-weight: 600;
          color: var(--ink); margin: 0;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden; line-height: 1.32;
        }
        .bb-author {
          font-size: 0.76rem; color: var(--ink-soft); margin: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .bb-section {
          font-size: 0.7rem; color: var(--gold); margin: 0;
          font-family: 'IBM Plex Mono', monospace;
        }

        .bb-rule {
          height: 1px; margin: 8px 12px 0;
          background: linear-gradient(90deg, var(--gold), transparent);
          opacity: 0.35;
        }

        .bb-view-btn {
          margin: 8px 12px 12px;
          padding: 8px;
          border: none; border-radius: 6px;
          background: var(--forest); color: white;
          font-size: 0.78rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: background 0.15s;
        }
        .bb-view-btn:hover { background: var(--forest-lt); }

        /* ── Empty / loading ── */
        .bb-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 14px; padding: 70px 0;
          color: var(--ink-soft); font-size: 0.88rem;
        }
        .bb-spinner {
          width: 26px; height: 26px;
          border: 3px solid var(--line); border-top-color: var(--forest);
          border-radius: 50%; animation: bb-spin 0.8s linear infinite;
        }
        @keyframes bb-spin { to { transform: rotate(360deg); } }

        /* ── Pagination ── */
        .bb-pagination {
          display: flex; justify-content: center; align-items: center; gap: 16px;
        }
        .bb-page-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 8px 16px; border-radius: 6px;
          border: 1px solid var(--line); background: white;
          color: var(--forest); font-size: 0.82rem; font-weight: 600;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: background 0.12s, border-color 0.12s;
        }
        .bb-page-btn:hover:not(:disabled) { background: var(--sage); border-color: var(--forest); }
        .bb-page-btn:disabled { opacity: 0.38; cursor: not-allowed; }
        .bb-page-info { font-size: 0.82rem; color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; }
        .bb-page-info strong { color: var(--ink); }
      `}</style>
    </>
  );
}