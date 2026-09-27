import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import socket from "../socket";

// ── Icons ──────────────────────────────────────────────────────────────────
const Icons = {
  Info:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  Tag:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  Book:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  QR:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/></svg>,
  Read:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  Image: () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
};

function MetaRow({ label, value }) {
  return (
    <div className="bd-meta-row">
      <span className="bd-meta-label">{label}</span>
      <span className="bd-meta-value">{value || "—"}</span>
    </div>
  );
}

function SectionCard({ icon, title, children }) {
  return (
    <div className="bd-card">
      <div className="bd-card-head">
        <div className="bd-card-head-icon">{icon}</div>
        <p className="bd-card-title">{title}</p>
      </div>
      <div className="bd-gold-rule" />
      <div className="bd-card-body">{children}</div>
    </div>
  );
}

// ─── Similar books ─────────────────────────────────────────────────────────
function SimilarBooksSkeleton() {
  return (
    <div className="bd-similar-grid">
      {Array.from({ length: 5 }).map((_, i) => (
        <div className="bd-similar-card bd-similar-skel" key={i} />
      ))}
    </div>
  );
}
function SimilarBooks({ books, loading }) {
  if (loading) {
    return (
      <div className="bd-similar-section">
        <p className="bd-similar-heading">You might also like</p>
        <SimilarBooksSkeleton />
      </div>
    );
  }
  if (!books.length) return null;

  return (
    <div className="bd-similar-section">
      <p className="bd-similar-heading">You might also like</p>
      <div className="bd-similar-grid">
        {books.map((b) => {
          const coverUrl = b.cover_image
            ? (b.cover_image.startsWith("http") ? b.cover_image : `${import.meta.env.VITE_API_URL}${b.cover_image}`)
            : "/placeholder-book.png";
          return (
            <Link to={`/books/${b.book_id}`} className="bd-similar-card" key={b.book_id}>
              <img src={coverUrl} alt={b.title} onError={(e) => (e.target.src = "/placeholder-book.png")} />
              <p className="bd-similar-title">{b.title}</p>
              <p className="bd-similar-author">{b.author}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [borrowStatus, setBorrowStatus] = useState(null);

  const [similarBooks, setSimilarBooks] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(true);

  const token = localStorage.getItem("token");
  const userId = token ? JSON.parse(atob(token.split(".")[1])).id : null;

  const fetchBook = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/books/${id}`, {
        headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
      });
      setBook(res.data);
      setBorrowStatus(res.data.borrowStatus || null);
    } catch (err) {
      console.error("Failed to load book:", err);
    }
  };

  const fetchWishlistStatus = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/wishlist/${id}`, {
        headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
      });
      setInWishlist(res.data.inWishlist);
    } catch (err) {
      console.error("Failed to fetch wishlist status:", err);
    }
  };

  const fetchSimilarBooks = async () => {
    setLoadingSimilar(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/recommendations/${id}/similar`, {
        headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
      });
      setSimilarBooks(res.data.similar ?? []);
    } catch (err) {
      console.error("Failed to fetch similar books:", err);
      setSimilarBooks([]);
    } finally {
      setLoadingSimilar(false);
    }
  };

  useEffect(() => {
    fetchBook();
    fetchWishlistStatus();
    fetchSimilarBooks();
  }, [id]);

  useEffect(() => {
    if (!token || !userId) return;
    if (!socket.connected) socket.connect();
    socket.auth = { token };
    socket.emit("join", `user_${userId}`);

    const handleBorrowUpdate = (data) => {
      if (Number(data.bookId) === Number(id)) fetchBook();
    };
    socket.on("borrowUpdate", handleBorrowUpdate);
    return () => socket.off("borrowUpdate", handleBorrowUpdate);
  }, [id, token, userId]);

  const handleBorrow = async () => {
    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/borrow`, { book_id: id }, {
        headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
      });
      alert("Request sent. Waiting for librarian approval.");
      fetchBook();
    } catch (err) {
      alert(err.response?.data?.message || "Borrow failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/return`, { book_id: id }, {
        headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
      });
      alert("Return request sent. Please wait for librarian approval.");
      fetchBook();
    } catch (err) {
      alert(err.response?.data?.message || "Return failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleWishlist = async () => {
    if (!token) return;
    try {
      if (!inWishlist) {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/wishlist`, { book_id: id }, {
          headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
        });
        setInWishlist(true);
      } else {
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/wishlist/${id}`, {
          headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
        });
        setInWishlist(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!book) {
    return (
      <>
        <Sidebar />
        <div className="bd-main bd-loading">
          <div className="bd-spinner" />
          <span>Loading book…</span>
        </div>
        <BottomNav />
      </>
    );
  }

  const coverUrl = book.cover_image
    ? (book.cover_image.startsWith("http") ? book.cover_image : `${import.meta.env.VITE_API_URL}${book.cover_image}`)
    : null;

  const STATUS_LABEL = {
    pending_borrow: "Awaiting Approval",
    borrowed: "Borrowed",
    pending_return: "Return Pending",
    returned: "Returned",
    rejected: "Rejected",
  };

  return (
    <>
      <Sidebar />

      <div className="bd-main">

        {/* ── Page header ── */}
        <header className="bd-header">
          <p className="bd-eyebrow">Book Detail</p>
          <h1 className="bd-title">Catalog Entry</h1>
        </header>

        <div className="bd-layout">

          {/* ══════ LEFT COLUMN ══════ */}
          <aside className="bd-left">
            <div className="bd-cover-card">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={book.title}
                  className="bd-cover-img"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              ) : (
                <div className="bd-cover-placeholder">
                  <Icons.Image />
                  <span>No cover image</span>
                </div>
              )}
            </div>

            <div className="bd-badge-strip">
              <span className={`bd-badge bd-badge--${book.type}`}>
                {book.type === "physical" ? "Physical" : "Digital"}
              </span>
              {book.type === "physical" && book.copies != null && (
                <span className="bd-badge bd-badge--copies">
                  {book.copies} {book.copies === 1 ? "copy" : "copies"}
                </span>
              )}
              {borrowStatus && (
                <span className="bd-badge bd-badge--status">{STATUS_LABEL[borrowStatus] || borrowStatus}</span>
              )}
            </div>

            {book.qr_code_text && (
              <SectionCard icon={<Icons.QR />} title="Scan to Share">
                <div className="bd-qr-body">
                  <img src={book.qr_code_text} alt="QR Code" className="bd-qr-img" />
                </div>
              </SectionCard>
            )}
          </aside>

          {/* ══════ RIGHT COLUMN ══════ */}
          <div className="bd-right">

            <div className="bd-hero-card">
              <h2 className="bd-book-title">{book.title}</h2>
              <p className="bd-book-author">{book.author}</p>
              {book.section && <span className="bd-section-chip">{book.section}</span>}
            </div>

            <SectionCard icon={<Icons.Info />} title="Cataloguing Details">
              <div className="bd-meta-grid">
                <MetaRow label="Publisher" value={book.publisher} />
                <MetaRow label="Copyright Date" value={book.copyright_date} />
                <MetaRow label="Place of Publication" value={book.place_of_publication} />
                <MetaRow label="Volume" value={book.volume} />
                <MetaRow label="Call Number" value={book.call_number} />
                <MetaRow label="ISBN" value={book.isbn} />
              </div>
            </SectionCard>

            <SectionCard icon={<Icons.Book />} title="Description">
              <p className="bd-description">{book.description || "No description provided for this title."}</p>
            </SectionCard>

            {book.subjects?.length > 0 && (
              <SectionCard icon={<Icons.Tag />} title="Subjects">
                <div className="bd-tags">
                  {book.subjects.map((s) => (
                    <span key={s.id} className="bd-tag">{s.name}</span>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* ── Actions ── */}
            <div className="bd-actions">
              {book.type === "digital" && (
                <button className="bd-btn-primary" onClick={() => navigate(`/EbookView/${book.id}`)}>
                  <Icons.Read /> Read Book
                </button>
              )}

              {book.type === "physical" && !borrowStatus && book.copies > 0 && (
                <button className="bd-btn-primary" disabled={loading} onClick={handleBorrow}>
                  {loading ? "Sending request…" : "Borrow Book"}
                </button>
              )}

              {book.type === "physical" && !borrowStatus && book.copies === 0 && (
                <button className="bd-btn-ghost" onClick={toggleWishlist}>
                  {inWishlist ? "Wishlisted ✓" : "Add to Wishlist"}
                </button>
              )}

              {borrowStatus === "pending_borrow" && (
                <button className="bd-btn-disabled" disabled>Waiting for approval…</button>
              )}

              {borrowStatus === "borrowed" && (
                <button className="bd-btn-danger" onClick={handleReturn} disabled={loading}>
                  {loading ? "Sending request…" : "Return Book"}
                </button>
              )}

              {borrowStatus === "pending_return" && (
                <button className="bd-btn-disabled" disabled>Return pending approval…</button>
              )}

              {borrowStatus === "returned" && (
                <button className="bd-btn-disabled" disabled>Returned</button>
              )}
            </div>
          </div>
        </div>

        <SimilarBooks books={similarBooks} loading={loadingSimilar} />
      </div>

      <BottomNav />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

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

        .bd-main {
          padding: 24px 20px 100px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
        }
        @media (max-width: 899px) { .bd-main { padding-top: 74px; } }

        .bd-loading {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; color: var(--ink-soft); font-size: 0.9rem;
        }
        .bd-spinner {
          width: 22px; height: 22px;
          border: 2.5px solid var(--line); border-top-color: var(--forest);
          border-radius: 50%; animation: bd-spin 0.7s linear infinite;
        }
        @keyframes bd-spin { to { transform: rotate(360deg); } }

        /* ── Header ── */
        .bd-header { margin-bottom: 20px; }
        .bd-eyebrow {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .bd-title {
          font-family: 'Fraunces', serif; font-size: 1.6rem; font-weight: 600;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
        }

        /* ── Layout ── */
        .bd-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          align-items: start;
          margin-bottom: 28px;
        }
        @media (min-width: 700px) {
          .bd-layout { grid-template-columns: 260px 1fr; gap: 20px; }
        }
        @media (min-width: 1100px) {
          .bd-layout { grid-template-columns: 300px 1fr; gap: 24px; }
        }

        .bd-left  { display: flex; flex-direction: column; gap: 14px; }
        .bd-right { display: flex; flex-direction: column; gap: 14px; }

        /* ── Cover ── */
        .bd-cover-card {
          border-radius: 8px; overflow: hidden; border: 1px solid var(--line);
          background: white; box-shadow: 0 4px 16px rgba(36,31,24,0.08);
        }
        .bd-cover-img { width: 100%; height: 320px; object-fit: cover; display: block; }
        @media (min-width: 700px) { .bd-cover-img { height: 380px; } }
        .bd-cover-placeholder {
          width: 100%; height: 320px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 10px; color: #c0b8ae; background: #FDFAF5;
        }
        @media (min-width: 700px) { .bd-cover-placeholder { height: 380px; } }
        .bd-cover-placeholder span { font-size: 0.78rem; }

        /* ── Badge strip ── */
        .bd-badge-strip { display: flex; gap: 8px; flex-wrap: wrap; }
        .bd-badge {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.7rem; font-weight: 600;
          padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .bd-badge--physical { background: var(--sage); color: var(--forest); }
        .bd-badge--digital  { background: #E8F0FE; color: #2B4CA0; }
        .bd-badge--copies   { background: #FFF8E7; color: var(--gold); border: 1px solid #F0D88A; }
        .bd-badge--status   { background: #FEF3C7; color: #92400E; }

        /* ── Hero ── */
        .bd-hero-card {
          background: white; border: 1px solid var(--line); border-radius: 8px;
          padding: 20px 22px; border-left: 4px solid var(--forest);
        }
        .bd-book-title {
          font-family: 'Fraunces', serif; font-size: 1.35rem; font-weight: 700;
          color: var(--ink); margin: 0 0 6px; line-height: 1.25;
        }
        .bd-book-author { font-size: 0.9rem; color: var(--ink-soft); margin: 0 0 10px; }
        .bd-section-chip {
          display: inline-block; font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
          padding: 3px 9px; border-radius: 4px; background: var(--sage); color: var(--forest);
        }

        /* ── Section card ── */
        .bd-card { background: white; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
        .bd-card-head { display: flex; align-items: center; gap: 10px; padding: 14px 18px 12px; }
        .bd-card-head-icon {
          display: flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 6px;
          background: var(--sage); color: var(--forest); flex-shrink: 0;
        }
        .bd-card-title { font-family: 'Fraunces', serif; font-size: 0.9rem; font-weight: 600; color: var(--forest); margin: 0; }
        .bd-gold-rule { height: 1px; margin: 0 18px; background: linear-gradient(90deg, var(--gold), transparent); opacity: 0.4; }
        .bd-card-body { padding: 14px 18px; }

        .bd-meta-grid { display: grid; grid-template-columns: 1fr; gap: 0; }
        @media (min-width: 480px) { .bd-meta-grid { grid-template-columns: 1fr 1fr; } }
        .bd-meta-row {
          display: flex; flex-direction: column; gap: 3px;
          padding: 9px 10px; border-bottom: 1px solid #f0ebe2;
        }
        .bd-meta-label {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.62rem;
          text-transform: uppercase; letter-spacing: 0.08em; color: #8a7a6a; font-weight: 500;
        }
        .bd-meta-value { font-size: 0.86rem; color: var(--ink); font-weight: 500; }

        .bd-description { font-size: 0.88rem; line-height: 1.7; color: var(--ink-soft); margin: 0; }

        .bd-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .bd-tag {
          background: var(--sage); color: var(--forest); padding: 5px 12px;
          border-radius: 20px; font-size: 0.78rem; font-weight: 600; border: 1px solid #d5e8ca;
        }

        .bd-qr-body { display: flex; justify-content: center; padding: 4px 0; }
        .bd-qr-img { width: 150px; border-radius: 4px; }

        /* ── Actions ── */
        .bd-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .bd-btn-primary, .bd-btn-danger, .bd-btn-ghost, .bd-btn-disabled {
          flex: 1; min-width: 180px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 13px; border-radius: 7px; font-size: 0.9rem; font-weight: 600;
          font-family: 'Inter', sans-serif; cursor: pointer; border: none;
          transition: background 0.15s;
        }
        .bd-btn-primary { background: var(--forest); color: white; }
        .bd-btn-primary:hover:not(:disabled) { background: var(--forest-lt); }
        .bd-btn-danger  { background: var(--rust); color: white; }
        .bd-btn-danger:hover:not(:disabled) { background: #8B3222; }
        .bd-btn-ghost {
          background: transparent; color: var(--forest); border: 1.5px solid var(--forest);
        }
        .bd-btn-ghost:hover { background: var(--sage); }
        .bd-btn-disabled { background: #eee; color: #999; cursor: not-allowed; }
        .bd-btn-primary:disabled, .bd-btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Similar books ── */
        .bd-similar-section { margin-top: 8px; }
        .bd-similar-heading {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.7rem;
          text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-soft);
          margin: 0 0 12px; font-weight: 600;
        }
        .bd-similar-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
        }
        @media (min-width: 500px)  { .bd-similar-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 900px)  { .bd-similar-grid { grid-template-columns: repeat(5, 1fr); } }

        .bd-similar-card {
          background: white; border: 1px solid var(--line); border-radius: 8px;
          padding: 8px; text-decoration: none; display: block;
          transition: box-shadow 0.15s, transform 0.15s;
        }
        .bd-similar-card:hover { box-shadow: 0 4px 14px rgba(20,83,45,0.10); transform: translateY(-2px); }
        .bd-similar-card img { width: 100%; height: 110px; object-fit: cover; border-radius: 6px; margin-bottom: 6px; }
        .bd-similar-title {
          font-size: 0.74rem; font-weight: 600; color: var(--forest); margin: 0;
          line-height: 1.25; overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .bd-similar-author { font-size: 0.68rem; color: var(--ink-soft); margin: 2px 0 0; }

        .bd-similar-skel {
          height: 150px;
          background: linear-gradient(90deg, var(--sage) 25%, #f5f5f5 50%, var(--sage) 75%);
          background-size: 400px 100%; animation: bd-shimmer 1.4s ease-in-out infinite;
        }
        @keyframes bd-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
      `}</style>
    </>
  );
}