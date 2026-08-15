// src/pages/admin/ViewBook.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Book:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  QR:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/></svg>,
  Info:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  Tag:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  File:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Read:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  Back:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Download: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Image:    () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
};

// ── Metadata row ─────────────────────────────────────────────────────────────
function MetaRow({ label, value }) {
  return (
    <div className="vb-meta-row">
      <span className="vb-meta-label">{label}</span>
      <span className="vb-meta-value">{value || "—"}</span>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ icon, title, children }) {
  return (
    <div className="vb-card">
      <div className="vb-card-head">
        <div className="vb-card-head-icon">{icon}</div>
        <p className="vb-card-title">{title}</p>
      </div>
      <div className="vb-gold-rule" />
      <div className="vb-card-body">{children}</div>
    </div>
  );
}

export default function ViewBook() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [book, setBook] = useState(null);
  const token = localStorage.getItem("token");
  const API   = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await axios.get(`${API}/api/books/${id}`, {
          headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
        });
        setBook(res.data.book || res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchBook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!book) {
    return (
      <>
        <AdminSidebar />
        <div className="vb-main vb-loading">
          <div className="vb-spinner" />
          <span>Loading book…</span>
        </div>
      </>
    );
  }

  const coverUrl = book.cover_image
    ? book.cover_image.startsWith("http") ? book.cover_image : `${API}${book.cover_image}`
    : null;

  const fileUrl  = book.file_path
    ? book.file_path.startsWith("http") ? book.file_path : `${API}${book.file_path}`
    : null;

  const fileName = book.file_path?.split("/").pop();

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      <AdminSidebar />

      <div className="vb-main">

        {/* ── Page header ── */}
        <header className="vb-header">
          <div>
            <p className="vb-eyebrow">Library Inventory</p>
            <h1 className="vb-title">Book Details</h1>
          </div>
          <button className="vb-btn-ghost" onClick={() => navigate(-1)}>
            <Icons.Back /> Back
          </button>
        </header>

        <div className="vb-layout">

          {/* ══════ LEFT COLUMN ══════ */}
          <aside className="vb-left">

            {/* Cover */}
            <div className="vb-cover-card">
              {coverUrl ? (
                <img src={coverUrl} alt={book.title} className="vb-cover-img" />
              ) : (
                <div className="vb-cover-placeholder">
                  <Icons.Image />
                  <span>No cover image</span>
                </div>
              )}
            </div>

            {/* Type + Copies badge strip */}
            <div className="vb-badge-strip">
              <span className={`vb-badge vb-badge--${book.type}`}>
                {book.type === "physical" ? "Physical" : "Digital"}
              </span>
              {book.type === "physical" && book.copies != null && (
                <span className="vb-badge vb-badge--copies">
                  {book.copies} {book.copies === 1 ? "copy" : "copies"}
                </span>
              )}
            </div>

            {/* QR Code */}
            {book.qr_code_text && (
              <SectionCard icon={<Icons.QR />} title="QR Code">
                <div className="vb-qr-body">
                  <img src={book.qr_code_text} alt="QR Code" className="vb-qr-img" />
                </div>
              </SectionCard>
            )}

          </aside>

          {/* ══════ RIGHT COLUMN ══════ */}
          <div className="vb-right">

            {/* Title + Author hero */}
            <div className="vb-hero-card">
              <h2 className="vb-book-title">{book.title}</h2>
              <p className="vb-book-author">{book.author}</p>
              {book.section && (
                <span className="vb-section-chip">{book.section}</span>
              )}
            </div>

            {/* Cataloguing details */}
            <SectionCard icon={<Icons.Info />} title="Cataloguing Details">
              <div className="vb-meta-grid">
                <MetaRow label="ISBN"            value={book.isbn} />
                <MetaRow label="Publisher"       value={book.publisher} />
                <MetaRow label="Place of Publication" value={book.place_of_publication} />
                <MetaRow label="Copyright Date"  value={book.copyright_date} />
                <MetaRow label="Volume"          value={book.volume} />
                <MetaRow label="Call Number"     value={book.call_number} />
              </div>
            </SectionCard>

            {/* Description */}
            <SectionCard icon={<Icons.Book />} title="Description">
              <p className="vb-description">
                {book.description || "No description provided for this title."}
              </p>
            </SectionCard>

            {/* Subjects */}
            <SectionCard icon={<Icons.Tag />} title="Subjects">
              {book.subjects?.length ? (
                <div className="vb-tags">
                  {book.subjects.map((s, i) => (
                    <span key={i} className="vb-tag">{s.name}</span>
                  ))}
                </div>
              ) : (
                <p className="vb-empty-note">No subjects assigned.</p>
              )}
            </SectionCard>

            {/* Book file */}
            {fileUrl && (
              <SectionCard icon={<Icons.File />} title="Book File">
                <div className="vb-file-row">
                  <span className="vb-file-name vb-mono">{fileName}</span>
                  <a href={fileUrl} target="_blank" rel="noreferrer" className="vb-file-link">
                    <Icons.Download /> View / Download
                  </a>
                </div>
              </SectionCard>
            )}

            {/* Actions */}
            <div className="vb-actions">
              {fileUrl && (
                <button
                  className="vb-btn-primary"
                  onClick={() => navigate(`/admin/books/${book.id}/read`)}
                >
                  <Icons.Read /> Read Book
                </button>
              )}
              <button className="vb-btn-ghost" onClick={() => navigate(-1)}>
                <Icons.Back /> Back
              </button>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        :root {
          --forest:    #14532D;
          --forest-lt: #3E7A4D;
          --gold:      #B8860B;
          --espresso:  #5C3D2E;
          --parchment: #FAF6EE;
          --sage:      #EEF3E7;
          --ink:       #241F18;
          --ink-soft:  #5C5546;
          --line:      #E4DFD3;
        }

        /* ── Layout ── */
        .vb-main {
          margin-left: 248px;
          padding: 36px 40px 64px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
        }
        .vb-loading {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; color: var(--ink-soft); font-size: 0.9rem;
        }
        .vb-spinner {
          width: 20px; height: 20px;
          border: 2px solid rgba(20,83,45,0.2); border-top-color: var(--forest);
          border-radius: 50%; animation: vb-spin 0.7s linear infinite;
        }
        @keyframes vb-spin { to { transform: rotate(360deg); } }

        /* ── Header ── */
        .vb-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: 28px; flex-wrap: wrap; gap: 12px;
        }
        .vb-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .vb-title {
          font-family: 'Fraunces', serif; font-size: 2rem;
          font-weight: 600; color: var(--forest); margin: 0;
          letter-spacing: -0.01em;
        }

        /* ── Two-column layout ── */
        .vb-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
          align-items: start;
        }
        .vb-left  { display: flex; flex-direction: column; gap: 16px; }
        .vb-right { display: flex; flex-direction: column; gap: 16px; }

        /* ── Cover ── */
        .vb-cover-card {
          border-radius: 8px; overflow: hidden;
          border: 1px solid var(--line);
          background: white;
          box-shadow: 0 4px 16px rgba(36,31,24,0.08);
        }
        .vb-cover-img {
          width: 100%; height: 380px;
          object-fit: cover; display: block;
          transition: transform 0.3s ease;
        }
        .vb-cover-img:hover { transform: scale(1.03); }
        .vb-cover-placeholder {
          width: 100%; height: 380px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 12px; color: #c0b8ae; background: #FDFAF5;
        }
        .vb-cover-placeholder span { font-size: 0.8rem; }

        /* ── Badge strip ── */
        .vb-badge-strip { display: flex; gap: 8px; flex-wrap: wrap; }
        .vb-badge {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.72rem; font-weight: 600;
          padding: 4px 10px; border-radius: 4px;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .vb-badge--physical { background: var(--sage); color: var(--forest); }
        .vb-badge--digital  { background: #E8F0FE; color: #2B4CA0; }
        .vb-badge--copies   { background: #FFF8E7; color: var(--gold); border: 1px solid #F0D88A; }

        /* ── QR ── */
        .vb-qr-body { display: flex; justify-content: center; padding: 8px 0 4px; }
        .vb-qr-img  { width: 160px; border-radius: 4px; }

        /* ── Hero card (title/author) ── */
        .vb-hero-card {
          background: white; border: 1px solid var(--line);
          border-radius: 8px; padding: 22px 24px;
          border-left: 4px solid var(--forest);
        }
        .vb-book-title {
          font-family: 'Fraunces', serif; font-size: 1.5rem;
          font-weight: 700; color: var(--ink); margin: 0 0 6px;
          line-height: 1.25;
        }
        .vb-book-author {
          font-size: 0.95rem; color: var(--ink-soft); margin: 0 0 12px;
        }
        .vb-section-chip {
          display: inline-block;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.7rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.08em;
          padding: 3px 9px; border-radius: 4px;
          background: var(--sage); color: var(--forest);
        }

        /* ── Section card ── */
        .vb-card {
          background: white; border: 1px solid var(--line);
          border-radius: 8px; overflow: hidden;
        }
        .vb-card-head {
          display: flex; align-items: center; gap: 10px; padding: 14px 20px 12px;
        }
        .vb-card-head-icon {
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 6px;
          background: var(--sage); color: var(--forest); flex-shrink: 0;
        }
        .vb-card-title {
          font-family: 'Fraunces', serif; font-size: 0.95rem;
          font-weight: 600; color: var(--forest); margin: 0;
        }
        .vb-gold-rule {
          height: 1px; margin: 0 20px;
          background: linear-gradient(90deg, var(--gold), transparent); opacity: 0.4;
        }
        .vb-card-body { padding: 16px 20px; }

        /* ── Metadata grid ── */
        .vb-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
        }
        .vb-meta-row {
          display: flex; flex-direction: column; gap: 3px;
          padding: 10px 12px;
          border-bottom: 1px solid #f0ebe2;
          border-right: 1px solid #f0ebe2;
        }
        .vb-meta-row:nth-child(even) { border-right: none; }
        .vb-meta-row:nth-last-child(-n+2) { border-bottom: none; }
        .vb-meta-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.63rem; text-transform: uppercase;
          letter-spacing: 0.08em; color: #8a7a6a; font-weight: 500;
        }
        .vb-meta-value {
          font-size: 0.875rem; color: var(--ink); font-weight: 500;
        }

        /* ── Description ── */
        .vb-description {
          font-size: 0.9rem; line-height: 1.7;
          color: var(--ink-soft); margin: 0;
        }

        /* ── Subjects ── */
        .vb-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .vb-tag {
          background: var(--sage); color: var(--forest);
          padding: 5px 12px; border-radius: 20px;
          font-size: 0.8rem; font-weight: 600;
          border: 1px solid #d5e8ca;
        }
        .vb-empty-note { font-size: 0.85rem; color: #8a7a6a; margin: 0; }

        /* ── File ── */
        .vb-file-row {
          display: flex; align-items: center;
          justify-content: space-between; gap: 12px; flex-wrap: wrap;
        }
        .vb-file-name {
          font-size: 0.82rem; color: var(--ink-soft);
          word-break: break-all;
        }
        .vb-mono { font-family: 'IBM Plex Mono', monospace; }
        .vb-file-link {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 6px;
          border: 1.5px solid var(--forest); color: var(--forest);
          font-size: 0.8rem; font-weight: 600;
          text-decoration: none; white-space: nowrap;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .vb-file-link:hover { background: var(--sage); }

        /* ── Actions ── */
        .vb-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .vb-btn-primary {
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--forest); color: white;
          border: none; padding: 10px 20px; border-radius: 7px;
          font-family: 'Inter', sans-serif; font-size: 0.875rem;
          font-weight: 600; cursor: pointer;
          transition: background 0.15s;
        }
        .vb-btn-primary:hover { background: var(--forest-lt, #3E7A4D); }
        .vb-btn-ghost {
          display: inline-flex; align-items: center; gap: 7px;
          background: transparent; color: var(--forest);
          border: 1.5px solid var(--forest); padding: 9px 18px;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 0.875rem; font-weight: 600; cursor: pointer;
          transition: background 0.15s;
        }
        .vb-btn-ghost:hover { background: var(--sage); }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .vb-main   { margin-left: 0; padding: 24px 20px 48px; }
          .vb-layout { grid-template-columns: 1fr; }
          .vb-cover-img, .vb-cover-placeholder { height: 280px; }
        }
        @media (max-width: 520px) {
          .vb-meta-grid { grid-template-columns: 1fr; }
          .vb-meta-row  { border-right: none; }
          .vb-meta-row:nth-last-child(-n+2) { border-bottom: 1px solid #f0ebe2; }
          .vb-meta-row:last-child { border-bottom: none; }
        }
      `}</style>
    </>
  );
}