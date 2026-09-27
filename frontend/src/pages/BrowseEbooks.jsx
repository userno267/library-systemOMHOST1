import { useEffect, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

// ── Placeholder cover (matches admin BookManagement / student BrowseBooks) ────
function BookPlaceholder({ title }) {
  const initial = title?.charAt(0)?.toUpperCase() || "B";
  return (
    <div className="be-placeholder">
      <svg width="34" height="46" viewBox="0 0 40 52" fill="none">
        <rect x="4" y="2" width="32" height="48" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
        <rect x="1" y="4" width="5" height="44" rx="2" fill="rgba(0,0,0,0.18)"/>
        <line x1="10" y1="16" x2="34" y2="16" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
        <line x1="10" y1="22" x2="30" y2="22" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
        <line x1="10" y1="28" x2="28" y2="28" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      </svg>
      <span className="be-placeholder-initial">{initial}</span>
    </div>
  );
}

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const EbookIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#C4BFB5" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
);
const ReadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
);
const PrevIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
);
const NextIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
);

export default function BrowseEbooks() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const limit = 12; // matches admin grid density
  const token = localStorage.getItem("token");

  /* ===========================
     FETCH EBOOKS (unchanged logic)
  =========================== */
  const fetchEbooks = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page,
        limit,
        search
      });

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/books/ebooks?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true"
          }
        }
      );

      const text = await res.text();

      if (!res.ok) {
        console.error("EBOOK FETCH ERROR:", text);
        throw new Error("Failed to fetch e-books");
      }

      const data = JSON.parse(text);
      setBooks(data.books || []);
      setTotalPages(data.totalPages || 1);

    } catch (err) {
      console.error("FETCH EBOOKS ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, token]);

  useEffect(() => {
    fetchEbooks();
  }, [fetchEbooks]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"]
    });

    socket.on("booksUpdated", fetchEbooks);

    return () => socket.disconnect();
  }, [fetchEbooks]);

  return (
    <>
      <Sidebar />

      <div className="be-main">

        {/* ── Page header ── */}
        <header className="be-header">
          <div>
            <p className="be-eyebrow">Digital Collection</p>
            <h1 className="be-title">E-Books</h1>
          </div>
        </header>

        {/* ── Search ── */}
        <div className="be-controls">
          <div className="be-search-wrap">
            <SearchIcon />
            <input
              className="be-search-input"
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
          <div className="be-empty">
            <div className="be-spinner" />
            <p>Loading e-books…</p>
          </div>
        ) : books.length === 0 ? (
          <div className="be-empty">
            <EbookIcon />
            <p>No e-books found.</p>
          </div>
        ) : (
          <div className="be-grid">
            {books.map((book) => {
              const coverUrl = book.cover_image
                ? (book.cover_image.startsWith("http")
                    ? book.cover_image
                    : `${import.meta.env.VITE_API_URL}${book.cover_image}`)
                : null;

              return (
                <div key={book.id} className="be-card" onClick={() => navigate(`/books/${book.id}`)}>
                  <div className="be-cover">
                    <div className="be-placeholder-wrap">
                      <BookPlaceholder title={book.title} />
                    </div>
                    {coverUrl && (
                      <img
                        src={coverUrl}
                        alt={book.title}
                        loading="lazy"
                        className="be-cover-img"
                        onLoad={(e) => {
                          e.target.style.opacity = "1";
                          const wrap = e.target.parentNode.querySelector(".be-placeholder-wrap");
                          if (wrap) wrap.style.display = "none";
                        }}
                        onError={(e) => { e.target.style.display = "none"; }}
                        style={{ opacity: 0, transition: "opacity 0.25s" }}
                      />
                    )}
                    <span className="be-type-chip">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                      Digital
                    </span>
                  </div>

                  <div className="be-body">
                    <h3 className="be-book-title" title={book.title}>{book.title}</h3>
                    <p className="be-author">{book.author}</p>
                  </div>

                  <div className="be-rule" />

                  <button
                    className="be-read-btn"
                    onClick={(e) => { e.stopPropagation(); navigate(`/books/${book.id}`); }}
                  >
                    <ReadIcon /> Read
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div className="be-pagination">
            <button className="be-page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <PrevIcon /> Prev
            </button>
            <span className="be-page-info">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>
            <button className="be-page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
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
          --digital:   #1D4CA0;
          --digital-bg:#E8F0FC;
        }

        .be-main {
          padding: 24px 20px 100px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
        }

        @media (max-width: 899px) {
          .be-main { padding-top: 74px; }
        }

        /* ── Header ── */
        .be-header { margin-bottom: 22px; }
        .be-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .be-title {
          font-family: 'Fraunces', serif; font-size: 1.7rem;
          font-weight: 600; color: var(--forest); margin: 0;
          letter-spacing: -0.01em;
        }

        /* ── Controls ── */
        .be-controls { margin-bottom: 20px; }
        .be-search-wrap { position: relative; max-width: 420px; }
        .be-search-wrap svg {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); color: var(--ink-soft);
          pointer-events: none;
        }
        .be-search-input {
          width: 100%; padding: 10px 12px 10px 36px;
          border: 1px solid var(--line); border-radius: 6px;
          font-size: 0.875rem; font-family: 'Inter', sans-serif;
          background: white; color: var(--ink);
          outline: none; box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .be-search-input:focus { border-color: var(--forest); }
        .be-search-input::placeholder { color: #B0A89C; }

        /* ── Grid ── */
        .be-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }
        @media (min-width: 640px) {
          .be-grid { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }
        }
        @media (min-width: 900px) {
          .be-grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 20px; }
        }
        @media (min-width: 1300px) {
          .be-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
        }

        /* ── Card ── */
        .be-card {
          background: white;
          border: 1px solid var(--line);
          border-radius: 8px;
          display: flex; flex-direction: column;
          overflow: hidden;
          cursor: pointer;
          transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s;
        }
        .be-card:hover {
          box-shadow: 0 6px 24px rgba(29,76,160,0.12);
          transform: translateY(-2px);
          border-color: #D0CBBF;
        }

        .be-cover {
          position: relative;
          height: 150px;
          overflow: hidden;
          background: linear-gradient(160deg, #2358b8 0%, #1D4CA0 100%);
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        @media (min-width: 900px) { .be-cover { height: 190px; } }

        .be-placeholder-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
        .be-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 100%; }
        .be-placeholder-initial {
          font-family: 'Fraunces', serif; font-size: 2.2rem; font-weight: 600;
          color: rgba(255,255,255,0.55); line-height: 1;
        }
        .be-cover-img {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; display: block; transition: transform 0.22s;
        }
        .be-card:hover .be-cover-img { transform: scale(1.03); }

        .be-type-chip {
          position: absolute; top: 8px; right: 8px;
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.64rem; font-weight: 600;
          padding: 3px 8px; border-radius: 20px;
          background: rgba(255,255,255,0.92); color: var(--digital);
          letter-spacing: 0.02em;
        }

        /* ── Body ── */
        .be-body { padding: 12px 12px 6px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .be-book-title {
          font-family: 'Fraunces', serif; font-size: 0.92rem; font-weight: 600;
          color: var(--ink); margin: 0;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden; line-height: 1.32;
        }
        .be-author {
          font-size: 0.76rem; color: var(--ink-soft); margin: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .be-rule {
          height: 1px; margin: 8px 12px 0;
          background: linear-gradient(90deg, var(--gold), transparent);
          opacity: 0.35;
        }

        .be-read-btn {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          margin: 8px 12px 12px;
          padding: 8px;
          border: none; border-radius: 6px;
          background: var(--digital); color: white;
          font-size: 0.78rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: background 0.15s;
        }
        .be-read-btn:hover { background: #163d82; }

        /* ── Empty / loading ── */
        .be-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 14px; padding: 70px 0;
          color: var(--ink-soft); font-size: 0.88rem;
        }
        .be-spinner {
          width: 26px; height: 26px;
          border: 3px solid var(--line); border-top-color: var(--forest);
          border-radius: 50%; animation: be-spin 0.8s linear infinite;
        }
        @keyframes be-spin { to { transform: rotate(360deg); } }

        /* ── Pagination ── */
        .be-pagination {
          display: flex; justify-content: center; align-items: center; gap: 16px;
        }
        .be-page-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 8px 16px; border-radius: 6px;
          border: 1px solid var(--line); background: white;
          color: var(--forest); font-size: 0.82rem; font-weight: 600;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: background 0.12s, border-color 0.12s;
        }
        .be-page-btn:hover:not(:disabled) { background: var(--sage); border-color: var(--forest); }
        .be-page-btn:disabled { opacity: 0.38; cursor: not-allowed; }
        .be-page-info { font-size: 0.82rem; color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; }
        .be-page-info strong { color: var(--ink); }
      `}</style>
    </>
  );
}