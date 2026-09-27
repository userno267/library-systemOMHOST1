import { useEffect, useState, useContext, useMemo } from "react";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import socket from "../socket";

// ── Icons ──────────────────────────────────────────────────────────────────
const Icons = {
  Search:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Book:    () => <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#C4BFB5" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Clock:   () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Return:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>,
  Reject:  () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Prev:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Next:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
};

// ── Placeholder cover (matches BrowseBooks / StudentHome) ────────────────────
function BookPlaceholder({ title }) {
  const initial = title?.charAt(0)?.toUpperCase() || "B";
  return (
    <div className="ub-placeholder">
      <svg width="30" height="40" viewBox="0 0 40 52" fill="none">
        <rect x="4" y="2" width="32" height="48" rx="3" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
        <rect x="1" y="4" width="5" height="44" rx="2" fill="rgba(0,0,0,0.18)"/>
        <line x1="10" y1="16" x2="34" y2="16" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
        <line x1="10" y1="22" x2="30" y2="22" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
        <line x1="10" y1="28" x2="28" y2="28" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      </svg>
      <span className="ub-placeholder-initial">{initial}</span>
    </div>
  );
}

const STATUS_LABEL = {
  pending_borrow: "Awaiting Approval",
  borrowed: "Borrowed",
  pending_return: "Return Pending",
  returned: "Returned",
  rejected: "Rejected",
};

function StatusBadge({ status, dueDate }) {
  const overdue = status === "borrowed" && dueDate && new Date(dueDate) < new Date();
  const label = overdue ? "Overdue" : STATUS_LABEL[status] || status;
  const cls = overdue
    ? "ub-badge--overdue"
    : status === "borrowed"       ? "ub-badge--borrowed"
    : status === "pending_borrow" ? "ub-badge--pending"
    : status === "pending_return" ? "ub-badge--pending"
    : status === "rejected"       ? "ub-badge--rejected"
    : "ub-badge--returned";
  return <span className={`ub-badge ${cls}`}>{label}</span>;
}

function EmptyState({ text }) {
  return (
    <div className="ub-empty">
      <Icons.Book />
      <p>{text}</p>
    </div>
  );
}

export default function UserBorrowPage() {
  const { token, user } = useContext(AuthContext);

  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const limit = 8;
  const baseURL = import.meta.env.VITE_API_URL.replace(/\/$/, "");

  /* ===========================
     FETCH BORROWS
  =========================== */
  const fetchBorrows = async () => {
    try {
      const res = await fetch(`${baseURL}/api/borrows/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!res.ok) throw new Error("Failed to fetch borrows");

      const data = await res.json();
      setBorrows(data);
    } catch (err) {
      console.error("BORROW FETCH ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchBorrows();
  }, [token]);

  /* ===========================
     SOCKET
  =========================== */
  useEffect(() => {
    if (!token || !user) return;

    socket.auth = { token };
    if (!socket.connected) socket.connect();
    socket.emit("join", user.id);

    const handleBorrowUpdate = () => fetchBorrows();
    socket.on("borrowUpdate", handleBorrowUpdate);

    return () => socket.off("borrowUpdate", handleBorrowUpdate);
  }, [token, user]);

  /* ===========================
     RETURN BOOK
  =========================== */
  const handleReturn = async (book_id) => {
    if (!window.confirm("Return this book?")) return;

    try {
      const res = await fetch(`${baseURL}/api/return`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ book_id }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Return failed");
        return;
      }

      fetchBorrows();
    } catch (err) {
      console.error("RETURN ERROR:", err);
    }
  };

  /* ===========================
     FILTER + SPLIT DATA
  =========================== */
  const filtered = useMemo(() => {
    return borrows.filter((b) =>
      b.title?.toLowerCase().includes(search.toLowerCase())
    );
  }, [borrows, search]);

  const currentBorrows = filtered.filter((b) => !b.returned_at);
  const historyBorrows = filtered.filter((b) => b.returned_at);

  /* ===========================
     PAGINATION
  =========================== */
  const paginate = (data, page) => {
    const start = (page - 1) * limit;
    return data.slice(start, start + limit);
  };

  const paginatedCurrent  = paginate(currentBorrows, currentPage);
  const paginatedHistory  = paginate(historyBorrows, historyPage);
  const currentTotalPages = Math.max(1, Math.ceil(currentBorrows.length / limit));
  const historyTotalPages = Math.max(1, Math.ceil(historyBorrows.length / limit));

  const coverUrl = (b) =>
    b.cover_image
      ? (b.cover_image.startsWith("http")
          ? b.cover_image
          : `${baseURL}${b.cover_image.startsWith("/") ? "" : "/"}${b.cover_image}`)
      : null;

  /* ===========================
     ACTION BUTTON
  =========================== */
  const BorrowActionButton = ({ borrow }) => {
    switch (borrow.status) {
      case "pending_borrow":
        return <button className="ub-btn-disabled" disabled><Icons.Clock /> Awaiting Approval</button>;
      case "borrowed":
        return (
          <button className="ub-btn-return" onClick={() => handleReturn(borrow.book_id)}>
            <Icons.Return /> Return Book
          </button>
        );
      case "pending_return":
        return <button className="ub-btn-disabled" disabled><Icons.Clock /> Return Pending</button>;
      case "rejected":
        return <button className="ub-btn-rejected" disabled><Icons.Reject /> Rejected</button>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="ub-main ub-loading">
          <div className="ub-spinner" />
          <span>Loading your borrows…</span>
        </div>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <Sidebar />

      <div className="ub-main">

        {/* ── Page header ── */}
        <header className="ub-header">
          <p className="ub-eyebrow">My Account</p>
          <h1 className="ub-title">Borrowed Books</h1>
        </header>

        {/* ── Search ── */}
        <div className="ub-controls">
          <div className="ub-search-wrap">
            <Icons.Search />
            <input
              className="ub-search-input"
              placeholder="Search by book title…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
                setHistoryPage(1);
              }}
            />
          </div>
        </div>

        {/* ── Currently borrowed ── */}
        <section className="ub-section">
          <div className="ub-section-head">
            <p className="ub-section-eyebrow">Active</p>
            <h2 className="ub-section-title">Currently Borrowed</h2>
          </div>

          {paginatedCurrent.length === 0 ? (
            <EmptyState text="No active borrows right now." />
          ) : (
            <div className="ub-grid">
              {paginatedCurrent.map((b) => {
                const img = coverUrl(b);
                const overdue = b.status === "borrowed" && new Date(b.due_date) < new Date();
                return (
                  <div className="ub-card" key={b.id}>
                    <div className="ub-cover">
                      {img ? (
                        <img src={img} alt={b.title} onError={(e) => { e.target.style.display = "none"; }} />
                      ) : (
                        <BookPlaceholder title={b.title} />
                      )}
                    </div>
                    <div className="ub-body">
                      <StatusBadge status={b.status} dueDate={b.due_date} />
                      <h3 className="ub-book-title" title={b.title}>{b.title}</h3>
                      <p className={`ub-due ${overdue ? "ub-due--overdue" : ""}`}>
                        Due {new Date(b.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="ub-rule" />
                    <div className="ub-actions">
                      <BorrowActionButton borrow={b} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {currentTotalPages > 1 && (
            <div className="ub-pagination">
              <button className="ub-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                <Icons.Prev /> Prev
              </button>
              <span className="ub-page-info">
                Page <strong>{currentPage}</strong> of <strong>{currentTotalPages}</strong>
              </span>
              <button className="ub-page-btn" disabled={currentPage === currentTotalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                Next <Icons.Next />
              </button>
            </div>
          )}
        </section>

        {/* ── History ── */}
        <section className="ub-section">
          <div className="ub-section-head">
            <p className="ub-section-eyebrow">Archive</p>
            <h2 className="ub-section-title">Borrow History</h2>
          </div>

          {paginatedHistory.length === 0 ? (
            <EmptyState text="No borrow history found." />
          ) : (
            <div className="ub-grid">
              {paginatedHistory.map((b) => {
                const img = coverUrl(b);
                return (
                  <div className="ub-card ub-card--history" key={b.id}>
                    <div className="ub-cover ub-cover--dim">
                      {img ? (
                        <img src={img} alt={b.title} onError={(e) => { e.target.style.display = "none"; }} />
                      ) : (
                        <BookPlaceholder title={b.title} />
                      )}
                    </div>
                    <div className="ub-body">
                      <StatusBadge status={b.status} />
                      <h3 className="ub-book-title" title={b.title}>{b.title}</h3>
                      <p className="ub-history-dates">
                        Borrowed {new Date(b.borrowed_at).toLocaleDateString()}
                        <br />
                        Returned {new Date(b.returned_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {historyTotalPages > 1 && (
            <div className="ub-pagination">
              <button className="ub-page-btn" disabled={historyPage === 1} onClick={() => setHistoryPage((p) => p - 1)}>
                <Icons.Prev /> Prev
              </button>
              <span className="ub-page-info">
                Page <strong>{historyPage}</strong> of <strong>{historyTotalPages}</strong>
              </span>
              <button className="ub-page-btn" disabled={historyPage === historyTotalPages} onClick={() => setHistoryPage((p) => p + 1)}>
                Next <Icons.Next />
              </button>
            </div>
          )}
        </section>
      </div>

      <BottomNav />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

        :root {
          --forest:    #14532D;
          --forest-lt: #3E7A4D;
          --gold:      #B8860B;
          --rust:      #A13D2B;
          --parchment: #FAF6EE;
          --sage:      #EEF3E7;
          --ink:       #241F18;
          --ink-soft:  #5C5546;
          --line:      #E4DFD3;
        }

        .ub-main {
          padding: 24px 20px 100px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
        }
        @media (max-width: 899px) { .ub-main { padding-top: 74px; } }

        .ub-loading {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; color: var(--ink-soft); font-size: 0.9rem;
        }
        .ub-spinner {
          width: 22px; height: 22px;
          border: 2.5px solid var(--line); border-top-color: var(--forest);
          border-radius: 50%; animation: ub-spin 0.7s linear infinite;
        }
        @keyframes ub-spin { to { transform: rotate(360deg); } }

        /* ── Header ── */
        .ub-header { margin-bottom: 20px; }
        .ub-eyebrow {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .ub-title {
          font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 600;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
        }

        /* ── Controls ── */
        .ub-controls { margin-bottom: 24px; }
        .ub-search-wrap { position: relative; max-width: 420px; }
        .ub-search-wrap svg {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); color: var(--ink-soft);
          pointer-events: none;
        }
        .ub-search-input {
          width: 100%; padding: 10px 12px 10px 36px;
          border: 1px solid var(--line); border-radius: 6px;
          font-size: 0.875rem; font-family: 'Inter', sans-serif;
          background: white; color: var(--ink);
          outline: none; box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .ub-search-input:focus { border-color: var(--forest); }
        .ub-search-input::placeholder { color: #B0A89C; }

        /* ── Section ── */
        .ub-section { margin-bottom: 34px; }
        .ub-section-head { margin-bottom: 14px; }
        .ub-section-eyebrow {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.66rem;
          letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold);
          margin: 0 0 3px; font-weight: 600;
        }
        .ub-section-title {
          font-family: 'Fraunces', serif; font-size: 1.15rem; font-weight: 600;
          color: var(--forest); margin: 0;
        }

        /* ── Grid ── */
        .ub-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        @media (min-width: 640px) {
          .ub-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
        }
        @media (min-width: 1200px) {
          .ub-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 18px; }
        }

        /* ── Card ── */
        .ub-card {
          background: white; border: 1px solid var(--line);
          border-radius: 8px; overflow: hidden;
          display: flex; flex-direction: column;
        }
        .ub-card--history { opacity: 0.92; }

        .ub-cover {
          height: 140px; overflow: hidden; flex-shrink: 0;
          background: linear-gradient(160deg, #1a6338 0%, #14532D 100%);
          display: flex; align-items: center; justify-content: center;
        }
        .ub-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .ub-cover--dim { filter: grayscale(0.25) brightness(0.95); }

        .ub-placeholder {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; width: 100%; height: 100%;
        }
        .ub-placeholder-initial {
          font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 600;
          color: rgba(255,255,255,0.55); line-height: 1;
        }

        .ub-body { padding: 10px 12px 4px; display: flex; flex-direction: column; gap: 5px; }
        .ub-book-title {
          font-family: 'Fraunces', serif; font-size: 0.86rem; font-weight: 600;
          color: var(--ink); margin: 0;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden; line-height: 1.3;
        }
        .ub-due { font-size: 0.72rem; color: var(--ink-soft); margin: 0; }
        .ub-due--overdue { color: var(--rust); font-weight: 600; }
        .ub-history-dates {
          font-size: 0.68rem; color: var(--ink-soft); margin: 0; line-height: 1.5;
          font-family: 'IBM Plex Mono', monospace;
        }

        /* ── Status badge ── */
        .ub-badge {
          display: inline-flex; align-items: center; width: fit-content;
          font-size: 0.64rem; font-weight: 600; padding: 3px 8px;
          border-radius: 20px; letter-spacing: 0.02em;
        }
        .ub-badge--borrowed { background: #DBEAFE; color: #1E3A8A; }
        .ub-badge--pending  { background: #FEF3C7; color: #92400E; }
        .ub-badge--returned { background: var(--sage); color: var(--forest); }
        .ub-badge--rejected { background: #eee; color: #9e9e9e; }
        .ub-badge--overdue  { background: #FBDCD5; color: var(--rust); }

        /* ── Rule + actions ── */
        .ub-rule {
          height: 1px; margin: 8px 12px 0;
          background: linear-gradient(90deg, var(--gold), transparent);
          opacity: 0.35;
        }
        .ub-actions { padding: 8px 12px 12px; }

        .ub-btn-return, .ub-btn-disabled, .ub-btn-rejected {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 8px; border-radius: 6px; font-size: 0.76rem; font-weight: 600;
          font-family: 'Inter', sans-serif; border: none; cursor: pointer;
          transition: background 0.15s;
        }
        .ub-btn-return { background: var(--rust); color: white; }
        .ub-btn-return:hover { background: #8B3222; }
        .ub-btn-disabled { background: #FEF3C7; color: #92400E; cursor: not-allowed; }
        .ub-btn-rejected { background: #eee; color: #9e9e9e; cursor: not-allowed; }

        /* ── Empty ── */
        .ub-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 10px; padding: 48px 20px; background: white;
          border: 1px dashed var(--line); border-radius: 8px;
          color: var(--ink-soft); font-size: 0.85rem;
        }

        /* ── Pagination ── */
        .ub-pagination {
          display: flex; justify-content: center; align-items: center; gap: 16px;
          margin-top: 16px;
        }
        .ub-page-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 7px 14px; border-radius: 6px;
          border: 1px solid var(--line); background: white;
          color: var(--forest); font-size: 0.8rem; font-weight: 600;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: background 0.12s, border-color 0.12s;
        }
        .ub-page-btn:hover:not(:disabled) { background: var(--sage); border-color: var(--forest); }
        .ub-page-btn:disabled { opacity: 0.38; cursor: not-allowed; }
        .ub-page-info { font-size: 0.8rem; color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; }
        .ub-page-info strong { color: var(--ink); }
      `}</style>
    </>
  );
}