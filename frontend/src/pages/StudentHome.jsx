import { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import { AuthContext } from "../context/AuthContext";

// ── Placeholder cover (matches admin BookManagement / student browse pages) ───
function BookPlaceholder({ title }) {
  const initial = title?.charAt(0)?.toUpperCase() || "B";
  return (
    <div className="sh-placeholder">
      <svg width="34" height="46" viewBox="0 0 40 52" fill="none">
        <rect x="4" y="2" width="32" height="48" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
        <rect x="1" y="4" width="5" height="44" rx="2" fill="rgba(0,0,0,0.18)"/>
        <line x1="10" y1="16" x2="34" y2="16" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
        <line x1="10" y1="22" x2="30" y2="22" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
        <line x1="10" y1="28" x2="28" y2="28" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      </svg>
      <span className="sh-placeholder-initial">{initial}</span>
    </div>
  );
}

const SparkleIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>
);
const PeopleIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const BookIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#C4BFB5" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function RecommendationSkeleton({ count = 6 }) {
  return (
    <div className="sh-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="sh-skel-card" key={i}>
          <div className="sh-skel-cover sh-skel-pulse" />
          <div className="sh-skel-body">
            <div className="sh-skel-title sh-skel-pulse" />
            <div className="sh-skel-author sh-skel-pulse" />
            <div className="sh-skel-btn sh-skel-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="sh-empty">
      <BookIcon />
      <p className="sh-empty-title">No recommendations yet</p>
      <p className="sh-empty-sub">Borrow a few books and we'll suggest ones you'll love.</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StudentHome() {
  const { token } = useContext(AuthContext);
  const [books, setBooks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [source, setSource]   = useState(null);

  useEffect(() => {
    if (token) fetchRecommendations();
  }, [token]);

  const fetchRecommendations = async () => {
    if (!token) {
      setError("Authentication token not found");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/recommendations`,
        {
          headers: {
            "ngrok-skip-browser-warning": "true",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();

      // Handle both old bare-array and new { recommendations, source } shape
      if (Array.isArray(data)) {
        setBooks(data);
      } else {
        setBooks(data.recommendations ?? []);
        setSource(data.source ?? null);
      }
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
      setError("Could not load recommendations");
    } finally {
      setLoading(false);
    }
  };

  const subtitleText =
    source === "popular_fallback"
      ? "Most popular in the library"
      : "Based on your borrowing history";

  return (
    <>
      <Sidebar />

      <div className="sh-main">

        {/* ── Page header ── */}
        <header className="sh-header">
          <p className="sh-eyebrow">For You</p>
          <h1 className="sh-title">Recommended Books</h1>
          <p className="sh-subtitle">{subtitleText}</p>
        </header>

        {loading && <RecommendationSkeleton count={6} />}

        {!loading && error && (
          <div className="sh-empty sh-empty-error">
            <p className="sh-empty-title">{error}</p>
          </div>
        )}

        {!loading && !error && books.length === 0 && <EmptyState />}

        {!loading && !error && books.length > 0 && (
          <div className="sh-grid">
            {books.map((book) => {
              const id = book.book_id ?? book.id;
              const coverUrl = book.cover_image
                ? (book.cover_image.startsWith("http")
                    ? book.cover_image
                    : `${import.meta.env.VITE_API_URL}${book.cover_image}`)
                : null;
              const available = book.copies > 0;

              return (
                <Link to={`/books/${id}`} className="sh-card" key={id}>
                  <div className="sh-cover">
                    <div className="sh-placeholder-wrap">
                      <BookPlaceholder title={book.title} />
                    </div>
                    {coverUrl && (
                      <img
                        src={coverUrl}
                        alt={book.title}
                        loading="lazy"
                        className="sh-cover-img"
                        onLoad={(e) => {
                          e.target.style.opacity = "1";
                          const wrap = e.target.parentNode.querySelector(".sh-placeholder-wrap");
                          if (wrap) wrap.style.display = "none";
                        }}
                        onError={(e) => { e.target.style.display = "none"; }}
                        style={{ opacity: 0, transition: "opacity 0.25s" }}
                      />
                    )}
                    {book.reason && book.reason !== "popular" && (
                      <span className="sh-reason-chip">
                        {book.reason === "collaborative" ? <PeopleIcon /> : <SparkleIcon />}
                        {book.reason === "collaborative" ? "Students like you" : "Based on your reads"}
                      </span>
                    )}
                  </div>

                  <div className="sh-body">
                    <h3 className="sh-book-title" title={book.title}>{book.title}</h3>
                    <p className="sh-author">{book.author}</p>
                    {book.section && <p className="sh-section">{book.section}</p>}
                    <span className={`sh-copies ${available ? "sh-copies--ok" : "sh-copies--out"}`}>
                      <span className="sh-copies-dot" />
                      {available
                        ? `${book.copies} cop${book.copies === 1 ? "y" : "ies"} available`
                        : "Currently unavailable"}
                    </span>
                  </div>

                  <div className="sh-rule" />

                  <span className="sh-view-btn">View Details</span>
                </Link>
              );
            })}
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

        .sh-main {
          padding: 24px 20px 100px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
        }

        @media (max-width: 899px) {
          .sh-main { padding-top: 74px; }
        }

        /* ── Header ── */
        .sh-header { margin-bottom: 22px; }
        .sh-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .sh-title {
          font-family: 'Fraunces', serif; font-size: 1.7rem;
          font-weight: 600; color: var(--forest); margin: 0 0 4px;
          letter-spacing: -0.01em;
        }
        .sh-subtitle { font-size: 0.85rem; color: var(--ink-soft); margin: 0; }

        /* ── Grid (shared by real cards and skeleton) ── */
        .sh-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (min-width: 640px) {
          .sh-grid { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }
        }
        @media (min-width: 900px) {
          .sh-grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 20px; }
        }
        @media (min-width: 1300px) {
          .sh-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
        }

        /* ── Card ── */
        .sh-card {
          background: white;
          border: 1px solid var(--line);
          border-radius: 8px;
          display: flex; flex-direction: column;
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s;
        }
        .sh-card:hover {
          box-shadow: 0 6px 24px rgba(20,83,45,0.10);
          transform: translateY(-2px);
          border-color: #D0CBBF;
        }

        .sh-cover {
          position: relative;
          height: 150px;
          overflow: hidden;
          background: linear-gradient(160deg, #1a6338 0%, #14532D 100%);
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        @media (min-width: 900px) { .sh-cover { height: 190px; } }

        .sh-placeholder-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
        .sh-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 100%; }
        .sh-placeholder-initial {
          font-family: 'Fraunces', serif; font-size: 2.2rem; font-weight: 600;
          color: rgba(255,255,255,0.55); line-height: 1;
        }
        .sh-cover-img {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; display: block; transition: transform 0.22s;
        }
        .sh-card:hover .sh-cover-img { transform: scale(1.03); }

        .sh-reason-chip {
          position: absolute; bottom: 8px; left: 8px; right: 8px;
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.62rem; font-weight: 600;
          padding: 4px 8px; border-radius: 20px;
          background: rgba(255,255,255,0.92); color: var(--forest);
          width: fit-content; max-width: calc(100% - 16px);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ── Body ── */
        .sh-body { padding: 12px 12px 6px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .sh-book-title {
          font-family: 'Fraunces', serif; font-size: 0.92rem; font-weight: 600;
          color: var(--ink); margin: 0;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden; line-height: 1.32;
        }
        .sh-author {
          font-size: 0.76rem; color: var(--ink-soft); margin: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sh-section {
          font-size: 0.7rem; color: var(--gold); margin: 0;
          font-family: 'IBM Plex Mono', monospace;
        }
        .sh-copies {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 0.7rem; margin-top: 4px; width: fit-content;
        }
        .sh-copies--ok  { color: #1A5C2A; }
        .sh-copies--out { color: #A13D2B; }
        .sh-copies-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

        .sh-rule {
          height: 1px; margin: 8px 12px 0;
          background: linear-gradient(90deg, var(--gold), transparent);
          opacity: 0.35;
        }

        .sh-view-btn {
          display: block; text-align: center;
          margin: 8px 12px 12px;
          padding: 8px;
          border: none; border-radius: 6px;
          background: var(--forest); color: white;
          font-size: 0.78rem; font-weight: 600;
          font-family: 'Inter', sans-serif;
          transition: background 0.15s;
        }
        .sh-card:hover .sh-view-btn { background: var(--forest-lt); }

        /* ── Skeleton ── */
        .sh-skel-card {
          background: white; border: 1px solid var(--line);
          border-radius: 8px; overflow: hidden;
        }
        .sh-skel-cover { width: 100%; height: 150px; }
        @media (min-width: 900px) { .sh-skel-cover { height: 190px; } }
        .sh-skel-body { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
        .sh-skel-title  { height: 12px; border-radius: 4px; width: 82%; }
        .sh-skel-author { height: 10px; border-radius: 4px; width: 55%; }
        .sh-skel-btn    { height: 30px; border-radius: 6px; width: 100%; margin-top: 6px; }
        .sh-skel-pulse {
          background: linear-gradient(90deg, var(--sage) 25%, #f5f5f5 50%, var(--sage) 75%);
          background-size: 400px 100%;
          animation: sh-shimmer 1.4s ease-in-out infinite;
        }
        @keyframes sh-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }

        /* ── Empty / error ── */
        .sh-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 10px; padding: 70px 20px; text-align: center;
          color: var(--ink-soft); font-size: 0.88rem;
        }
        .sh-empty-title { margin: 0; font-weight: 600; font-size: 0.95rem; color: var(--ink); }
        .sh-empty-sub { margin: 0; font-size: 0.8rem; }
        .sh-empty-error .sh-empty-title { color: #A13D2B; font-weight: 500; }
      `}</style>
    </>
  );
}