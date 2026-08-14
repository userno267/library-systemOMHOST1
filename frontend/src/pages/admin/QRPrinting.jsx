// src/pages/admin/QRPrintDashboard.jsx
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import AdminSidebar from "../../components/AdminSidebar";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Search:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  X:       () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Print:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  QR:      () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/></svg>,
  Prev:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Next:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Check:   () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Spinner: () => <div className="qr-spinner" />,
  Book:    () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
};

// ── Book placeholder ──────────────────────────────────────────────────────────
function CoverPlaceholder({ title }) {
  const initial = title?.charAt(0)?.toUpperCase() || "B";
  return (
    <div className="qr-cover-placeholder">
      <span className="qr-cover-initial">{initial}</span>
    </div>
  );
}

export default function QRPrintDashboard() {
  const [books, setBooks]               = useState([]);
  const [selectedBooks, setSelectedBooks] = useState({});
  const [loading, setLoading]           = useState(false);
  const [search, setSearch]             = useState("");
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [previewPDF, setPreviewPDF]     = useState(null);
  const [isPDFReady, setIsPDFReady]     = useState(false);

  const iframeRef = useRef(null);
  const token     = localStorage.getItem("token");
  const baseURL   = import.meta.env.VITE_API_URL;

  const apiHeaders = {
    Authorization: `Bearer ${token}`,
    "ngrok-skip-browser-warning": "true",
  };

  const selectedCount = Object.keys(selectedBooks).length;
  const totalQRs      = Object.values(selectedBooks).reduce((a, b) => a + b, 0);

  /* ── Fetch books ── */
  useEffect(() => { fetchBooks(); }, [page, search]);

  const fetchBooks = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/books`, {
        headers: apiHeaders,
        params: { page, limit: 12, search },
      });
      setBooks(res.data.books);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) { console.error(err); }
  };

  /* ── Auto-generate PDF on selection change ── */
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (selectedCount > 0) generatePreview();
      else { setPreviewPDF(null); setIsPDFReady(false); }
    }, 300);
    return () => clearTimeout(timeout);
  }, [selectedBooks]);

  /* ── Ctrl+P override ── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (!previewPDF || !iframeRef.current) return;
        if (!isPDFReady) { alert("PDF still loading, please wait…"); return; }
        try {
          const iframe = iframeRef.current;
          if (iframe.src !== previewPDF) { iframe.src = previewPDF; return; }
          setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }, 150);
        } catch (err) { console.error("Printing failed", err); }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewPDF, isPDFReady]);

  /* ── Select / copy helpers ── */
  const toggleSelectBook = (bookId) => {
    setSelectedBooks(prev => {
      if (prev[bookId]) { const { [bookId]: _, ...rest } = prev; return rest; }
      return { ...prev, [bookId]: 1 };
    });
  };

  const handleCopyChange = (bookId, value) => {
    setSelectedBooks(prev => ({ ...prev, [bookId]: Math.max(1, Number(value)) }));
  };

  const clearAll = () => { setSelectedBooks({}); };

  /* ── Generate PDF ── */
  const generatePreview = async () => {
    if (!selectedCount) return;
    setLoading(true); setIsPDFReady(false);
    try {
      const payload = Object.entries(selectedBooks).map(([bookId, copies]) => ({
        bookId: Number(bookId), copiesToPrint: copies,
      }));
      const res = await axios.post(
        `${baseURL}/api/books/print-qrcodes`,
        { books: payload },
        { headers: apiHeaders, responseType: "blob" }
      );
      const blob = new Blob([res.data], { type: "application/pdf" });
      setPreviewPDF(URL.createObjectURL(blob));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  /* ── Print ── */
  const handlePrintPDF = () => {
    if (!previewPDF || !iframeRef.current) return;
    iframeRef.current.src = previewPDF;
    iframeRef.current.onload = () => {
      setIsPDFReady(true);
      try { iframeRef.current?.contentWindow?.focus(); } catch (e) {}
    };
  };

  /* ── Cover URL ── */
  const coverUrl = (book) => {
    if (!book.cover_image) return null;
    if (book.cover_image.startsWith("http")) return book.cover_image;
    return `${baseURL}${book.cover_image.startsWith("/") ? "" : "/"}${book.cover_image}`;
  };

  return (
    <>
      <AdminSidebar />

      <div className="qr-main">

        {/* ── Page header ── */}
        <header className="qr-header">
          <div>
            <p className="qr-eyebrow">Library Operations</p>
            <h1 className="qr-title">QR Sticker Printing</h1>
          </div>

          {/* Selection summary pill */}
          {selectedCount > 0 && (
            <div className="qr-summary-pill">
              <Icons.QR />
              <span>
                <strong>{selectedCount}</strong> book{selectedCount !== 1 ? "s" : ""} ·{" "}
                <strong>{totalQRs}</strong> sticker{totalQRs !== 1 ? "s" : ""}
              </span>
              <button className="qr-clear-btn" onClick={clearAll} title="Clear selection">
                <Icons.X />
              </button>
            </div>
          )}
        </header>

        {/* ── Two-column layout: book picker | PDF preview ── */}
        <div className="qr-layout">

          {/* ── Left: book picker ── */}
          <div className="qr-picker-panel">

            {/* Search */}
            <div className="qr-search-wrap">
              <Icons.Search />
              <input
                className="qr-search-input"
                type="text"
                placeholder="Search by title or author…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && (
                <button className="qr-search-clear" onClick={() => setSearch("")}>
                  <Icons.X />
                </button>
              )}
            </div>

            {/* Book grid */}
            <div className="qr-book-grid">
              {books.length === 0 ? (
                <div className="qr-empty">
                  <Icons.Book />
                  <p>No books found.</p>
                </div>
              ) : books.map(book => {
                const isSelected = !!selectedBooks[book.id];
                const imgSrc     = coverUrl(book);
                return (
                  <div
                    key={book.id}
                    className={`qr-book-card ${isSelected ? "card-selected" : ""}`}
                    onClick={() => toggleSelectBook(book.id)}
                  >
                    {/* Selection indicator */}
                    <div className={`qr-select-ring ${isSelected ? "ring-active" : ""}`}>
                      {isSelected && <Icons.Check />}
                    </div>

                    {/* Cover */}
                    <div className="qr-cover">
                      <div className="qr-cover-placeholder-wrap">
                        <CoverPlaceholder title={book.title} />
                      </div>
                      {imgSrc && (
                        <img
                          src={imgSrc}
                          alt={book.title}
                          className="qr-cover-img"
                          onLoad={e => {
                            e.target.style.opacity = "1";
                            const wrap = e.target.parentNode.querySelector(".qr-cover-placeholder-wrap");
                            if (wrap) wrap.style.display = "none";
                          }}
                          onError={e => { e.target.style.display = "none"; }}
                          style={{ opacity: 0, transition: "opacity 0.2s" }}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="qr-book-info">
                      <p className="qr-book-title" title={book.title}>{book.title}</p>
                      {book.call_number && (
                        <p className="qr-book-meta">{book.call_number}</p>
                      )}
                      {book.volume && (
                        <p className="qr-book-meta">Vol. {book.volume}</p>
                      )}
                    </div>

                    {/* Copy count input (shown when selected) */}
                    {isSelected && (
                      <div className="qr-copy-row" onClick={e => e.stopPropagation()}>
                        <label className="qr-copy-label">Copies</label>
                        <div className="qr-copy-controls">
                          <button
                            className="qr-copy-step"
                            onClick={() => handleCopyChange(book.id, (selectedBooks[book.id] || 1) - 1)}
                          >−</button>
                          <input
                            className="qr-copy-input"
                            type="number"
                            min="1"
                            value={selectedBooks[book.id]}
                            onChange={e => handleCopyChange(book.id, e.target.value)}
                          />
                          <button
                            className="qr-copy-step"
                            onClick={() => handleCopyChange(book.id, (selectedBooks[book.id] || 1) + 1)}
                          >+</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="qr-pagination">
                <button className="qr-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <Icons.Prev /> Prev
                </button>
                <span className="qr-page-info">
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                </span>
                <button className="qr-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next <Icons.Next />
                </button>
              </div>
            )}
          </div>

          {/* ── Right: PDF preview panel ── */}
          <div className="qr-preview-panel">
            <div className="qr-preview-header">
              <span className="qr-preview-label">PDF Preview</span>
              {previewPDF && (
                <button
                  className="qr-print-btn"
                  onClick={handlePrintPDF}
                  disabled={!isPDFReady}
                >
                  <Icons.Print />
                  {isPDFReady ? "Print QR codes" : "Loading…"}
                </button>
              )}
            </div>

            <div className="qr-preview-body">
              {!selectedCount ? (
                <div className="qr-preview-empty">
                  <Icons.QR />
                  <p>Select books on the left to preview their QR stickers.</p>
                  <p className="qr-preview-hint">The PDF updates automatically as you select.</p>
                </div>
              ) : loading ? (
                <div className="qr-preview-empty">
                  <div className="qr-spinner" />
                  <p>Generating PDF…</p>
                </div>
              ) : previewPDF ? (
                <iframe
                  ref={iframeRef}
                  src={previewPDF}
                  className="qr-iframe"
                  onLoad={() => setIsPDFReady(true)}
                  title="QR sticker preview"
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

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

        /* ── Layout ── */
        .qr-main {
          margin-left: 248px;
          padding: 36px 40px 64px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
        }

        /* ── Header ── */
        .qr-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: 28px; flex-wrap: wrap; gap: 12px;
        }
        .qr-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .qr-title {
          font-family: 'Fraunces', serif;
          font-size: 2rem; font-weight: 600;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
        }

        /* Summary pill */
        .qr-summary-pill {
          display: flex; align-items: center; gap: 8px;
          background: var(--forest); color: white;
          padding: 8px 14px; border-radius: 20px;
          font-size: 0.82rem;
        }
        .qr-summary-pill strong { font-family: 'IBM Plex Mono', monospace; }
        .qr-clear-btn {
          background: rgba(255,255,255,0.15); border: none;
          border-radius: 50%; width: 20px; height: 20px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: white; padding: 0;
          transition: background 0.12s;
        }
        .qr-clear-btn:hover { background: rgba(255,255,255,0.28); }

        /* ── Two-col layout ── */
        .qr-layout {
          display: grid;
          grid-template-columns: 1fr 420px;
          gap: 24px;
          align-items: start;
        }

        /* ── Picker panel ── */
        .qr-picker-panel {
          background: white; border: 1px solid var(--line);
          border-radius: 8px; overflow: hidden;
        }

        /* Search */
        .qr-search-wrap {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 16px; border-bottom: 1px solid var(--line);
        }
        .qr-search-wrap svg { color: var(--ink-soft); flex-shrink: 0; }
        .qr-search-input {
          flex: 1; border: none; outline: none;
          font-size: 0.85rem; font-family: 'Inter', sans-serif;
          color: var(--ink); background: transparent;
        }
        .qr-search-input::placeholder { color: #B0A89C; }
        .qr-search-clear {
          background: none; border: none; cursor: pointer;
          color: var(--ink-soft); display: flex; padding: 2px;
        }
        .qr-search-clear:hover { color: var(--ink); }

        /* Book grid */
        .qr-book-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1px;
          background: var(--line);
        }

        .qr-empty {
          grid-column: 1 / -1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 12px; padding: 60px 0;
          color: var(--ink-soft); font-size: 0.88rem;
          background: white;
        }
        .qr-empty svg { opacity: 0.3; }

        /* Book card */
        .qr-book-card {
          background: white;
          padding: 14px 12px 10px;
          display: flex; flex-direction: column;
          align-items: center; gap: 8px;
          cursor: pointer; position: relative;
          transition: background 0.12s;
        }
        .qr-book-card:hover { background: #FDFAF5; }
        .qr-book-card.card-selected { background: #F0F7F2; }

        /* Selection ring */
        .qr-select-ring {
          position: absolute; top: 8px; right: 8px;
          width: 18px; height: 18px; border-radius: 50%;
          border: 1.5px solid var(--line);
          background: white;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.12s;
        }
        .qr-select-ring.ring-active {
          background: var(--forest); border-color: var(--forest); color: white;
        }

        /* Cover */
        .qr-cover {
          position: relative; width: 90px; height: 120px;
          border-radius: 4px; overflow: hidden; flex-shrink: 0;
        }
        .qr-cover-placeholder-wrap {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(160deg, #1a6338 0%, #14532D 100%);
        }
        .qr-cover-placeholder {
          display: flex; align-items: center; justify-content: center;
          width: 100%; height: 100%;
        }
        .qr-cover-initial {
          font-family: 'Fraunces', serif;
          font-size: 2rem; font-weight: 600;
          color: rgba(255,255,255,0.5);
        }
        .qr-cover-img {
          position: absolute; inset: 0;
          width: 100%; height: 100%; object-fit: cover;
        }

        /* Book info */
        .qr-book-info { width: 100%; text-align: center; }
        .qr-book-title {
          font-family: 'Fraunces', serif;
          font-size: 0.8rem; font-weight: 600; color: var(--ink);
          margin: 0; line-height: 1.3;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .qr-book-meta {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; color: var(--ink-soft);
          margin: 2px 0 0;
        }

        /* Copy controls */
        .qr-copy-row {
          width: 100%; display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding-top: 6px; border-top: 1px solid var(--line); margin-top: 2px;
        }
        .qr-copy-label {
          font-size: 0.65rem; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--ink-soft);
        }
        .qr-copy-controls {
          display: flex; align-items: center; gap: 4px;
        }
        .qr-copy-step {
          width: 22px; height: 22px; border-radius: 4px;
          border: 1px solid var(--line); background: var(--sage);
          color: var(--forest); font-size: 0.9rem; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          padding: 0; line-height: 1;
          transition: background 0.12s;
        }
        .qr-copy-step:hover { background: var(--line); }
        .qr-copy-input {
          width: 40px; text-align: center;
          border: 1px solid var(--line); border-radius: 4px;
          padding: 3px 4px; font-family: 'IBM Plex Mono', monospace;
          font-size: 0.82rem; color: var(--ink); outline: none;
        }
        .qr-copy-input:focus { border-color: var(--forest); }

        /* Pagination */
        .qr-pagination {
          display: flex; justify-content: center; align-items: center;
          gap: 14px; padding: 14px 16px;
          border-top: 1px solid var(--line);
        }
        .qr-page-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 6px 12px; border-radius: 5px;
          border: 1px solid var(--line); background: white;
          color: var(--forest); font-size: 0.8rem; font-weight: 600;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: background 0.12s;
        }
        .qr-page-btn:hover:not(:disabled) { background: var(--sage); border-color: var(--forest); }
        .qr-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .qr-page-info {
          font-size: 0.78rem; color: var(--ink-soft);
          font-family: 'IBM Plex Mono', monospace;
        }
        .qr-page-info strong { color: var(--ink); }

        /* ── Preview panel ── */
        .qr-preview-panel {
          position: sticky; top: 24px;
          background: white; border: 1px solid var(--line);
          border-radius: 8px; overflow: hidden;
          display: flex; flex-direction: column;
        }
        .qr-preview-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px; border-bottom: 1px solid var(--line);
        }
        .qr-preview-label {
          font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--ink-soft);
          font-family: 'IBM Plex Mono', monospace;
        }
        .qr-print-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--forest); color: white;
          border: none; padding: 8px 14px; border-radius: 5px;
          font-size: 0.8rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: background 0.15s;
        }
        .qr-print-btn:hover:not(:disabled) { background: var(--forest-lt); }
        .qr-print-btn:disabled { background: var(--line); color: var(--ink-soft); cursor: not-allowed; }

        .qr-preview-body { min-height: 520px; display: flex; flex-direction: column; }

        .qr-preview-empty {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 10px; padding: 48px 24px; text-align: center;
          color: var(--ink-soft); font-size: 0.85rem;
        }
        .qr-preview-empty svg { opacity: 0.25; }
        .qr-preview-hint { font-size: 0.76rem; color: #B0A89C; margin: 0; }

        .qr-iframe {
          width: 100%; flex: 1; min-height: 520px;
          border: none; display: block;
        }

        /* ── Spinner ── */
        .qr-spinner {
          width: 24px; height: 24px;
          border: 2.5px solid var(--line);
          border-top-color: var(--forest);
          border-radius: 50%;
          animation: qr-spin 0.7s linear infinite;
        }
        @keyframes qr-spin { to { transform: rotate(360deg); } }

        /* ── Responsive ── */
        @media (max-width: 1100px) {
          .qr-layout { grid-template-columns: 1fr; }
          .qr-preview-panel { position: static; }
        }
        @media (max-width: 1000px) {
          .qr-main { margin-left: 0; padding: 24px 20px 48px; }
        }
      `}</style>
    </>
  );
}