import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";

import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";

pdfjs.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js";

const Icons = {
  Prev: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  Next: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};

export default function EbookView() {
  const { id } = useParams();

  const [book, setBook] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  const token = localStorage.getItem("token");
  const baseUrl = import.meta.env.VITE_API_URL.replace(/\/$/, "");

  const pdfOptions = useMemo(
    () => ({ cMapUrl: "cmaps/", cMapPacked: true }),
    []
  );

  const pageWidth = useMemo(
    () => Math.min(window.innerWidth - 32, 900),
    []
  );

  useEffect(() => {
    // reset view state whenever we navigate to a different book,
    // otherwise the previous book's page number/count can linger
    setBook(null);
    setNumPages(null);
    setPageNumber(1);
    setPageInput("1");
    fetchBook();
  }, [id]);

  // keep the input box in sync when page changes via the buttons
  useEffect(() => {
    setPageInput(String(pageNumber));
  }, [pageNumber]);

  const fetchBook = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/books/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      const data = await res.json();
      setBook(data);
    } catch (err) {
      console.error("Failed to load ebook:", err);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const goToPage = () => {
    const parsed = parseInt(pageInput, 10);
    if (!numPages || isNaN(parsed)) {
      setPageInput(String(pageNumber));
      return;
    }
    const clamped = Math.min(Math.max(parsed, 1), numPages);
    setPageNumber(clamped);
    setPageInput(String(clamped));
  };

  const handlePageInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      goToPage();
      e.target.blur();
    }
  };

  if (!book) {
    return (
      <>
        <Sidebar />
        <div className="ev-main">
          <div className="ev-state">
            <div className="ev-spinner" />
            <span>Loading book…</span>
          </div>
        </div>
        <BottomNav />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
          :root { --forest: #14532D; --parchment: #FAF6EE; --line: #E4DFD3; --ink-soft: #5C5546; }
          .ev-main { padding: 80px 16px 100px; background: var(--parchment); min-height: 100vh; font-family: 'Inter', sans-serif; }
          .ev-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 80px 0; color: var(--ink-soft); font-size: 0.88rem; }
          .ev-spinner { width: 24px; height: 24px; border: 2.5px solid var(--line); border-top-color: var(--forest); border-radius: 50%; animation: ev-spin 0.7s linear infinite; }
          @keyframes ev-spin { to { transform: rotate(360deg); } }
        `}</style>
      </>
    );
  }

  const coverUrl = book.cover_image
    ? `${baseUrl}${book.cover_image}`
    : "/placeholder-book.png";

  const pdfUrl = `${baseUrl}/api/books/view/${book.id}`;

  const pdfFile = {
    url: pdfUrl,
    httpHeaders: {
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
    },
    withCredentials: false,
  };

  return (
    <>
      <Sidebar />

      <div className="ev-main">
        <div className="ev-container">

          {/* BOOK INFO */}
          <div className="ev-card">
            <img
              src={coverUrl}
              alt={book.title}
              className="ev-cover"
              onError={(e) => (e.target.src = "/placeholder-book.png")}
            />

            <div className="ev-info">
              <h2 className="ev-book-title">{book.title}</h2>
              <p className="ev-meta"><strong>Author:</strong> {book.author}</p>
              {book.section && <p className="ev-meta"><strong>Section:</strong> {book.section}</p>}
              {book.description && (
                <p className="ev-desc">{book.description}</p>
              )}
            </div>

            {/* PDF READER */}
            <div className="ev-reader">
              <Document
                file={pdfFile}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(e) => console.error("PDF error:", e)}
                renderMode="canvas"
                options={pdfOptions}
              >
                <Page
                  key={`page-${pageNumber}`}
                  pageNumber={pageNumber}
                  width={pageWidth}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />

                {/* Preload the next couple pages off-screen so pdf.js has
                    already fetched/parsed them by the time the user clicks
                    Next — makes navigation feel instant. */}
                {numPages && pageNumber + 1 <= numPages && (
                  <div className="ev-preload" aria-hidden="true">
                    <Page
                      key={`preload-${pageNumber + 1}`}
                      pageNumber={pageNumber + 1}
                      width={pageWidth}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                    />
                  </div>
                )}
                {numPages && pageNumber + 2 <= numPages && (
                  <div className="ev-preload" aria-hidden="true">
                    <Page
                      key={`preload-${pageNumber + 2}`}
                      pageNumber={pageNumber + 2}
                      width={pageWidth}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                    />
                  </div>
                )}
              </Document>
            </div>

            {/* PAGINATION */}
            {numPages > 1 && (
              <div className="ev-pagination">
                <button
                  className="ev-page-btn"
                  onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}
                  disabled={pageNumber === 1}
                >
                  <Icons.Prev /> Prev
                </button>

                <div className="ev-page-jump">
                  <span>Page</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={numPages}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onKeyDown={handlePageInputKeyDown}
                    onBlur={goToPage}
                    aria-label="Go to page"
                  />
                  <span>/ {numPages}</span>
                </div>

                <button
                  className="ev-page-btn"
                  onClick={() =>
                    setPageNumber((p) => Math.min(p + 1, numPages))
                  }
                  disabled={pageNumber === numPages}
                >
                  Next <Icons.Next />
                </button>
              </div>
            )}
          </div>
        </div>
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

        .ev-main {
          padding: 80px 16px 100px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
        }

        @media (max-width: 768px) {
          .ev-main { margin-left: 0; }
        }

        .ev-container {
          max-width: 900px;
          margin: 0 auto;
        }

        .ev-card {
          background: white;
          border: 1px solid var(--line);
          padding: 18px;
          border-radius: 10px;
        }

        .ev-cover {
          width: 120px;
          display: block;
          margin: 0 auto 12px;
          border-radius: 8px;
          border: 1px solid var(--line);
        }

        .ev-info {
          text-align: center;
          margin-bottom: 14px;
        }

        .ev-book-title {
          font-family: 'Fraunces', serif;
          color: var(--forest);
          font-size: 1.15rem;
          font-weight: 600;
          margin: 0 0 6px;
        }

        .ev-meta {
          font-size: 0.85rem;
          color: var(--ink-soft);
          margin: 2px 0;
        }
        .ev-meta strong { color: var(--ink); }

        .ev-desc {
          margin-top: 8px;
          font-size: 0.8rem;
          color: var(--ink-soft);
          line-height: 1.5;
        }

        .ev-reader {
          display: flex;
          justify-content: center;
          margin-top: 10px;
          position: relative;
        }

        canvas {
          border-radius: 6px;
          box-shadow: 0 2px 10px rgba(36,31,24,0.08);
        }

        .ev-preload {
          position: absolute;
          top: 0;
          left: -99999px;
          width: 0;
          height: 0;
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
        }

        .ev-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
        }

        .ev-page-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 7px 14px;
          border: 1px solid var(--line);
          border-radius: 6px;
          background: white;
          color: var(--forest);
          font-weight: 600;
          font-size: 0.82rem;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: background 0.12s, border-color 0.12s;
        }
        .ev-page-btn:hover:not(:disabled) { background: var(--sage); border-color: var(--forest); }
        .ev-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .ev-page-jump {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.82rem;
          color: var(--ink-soft);
        }

        .ev-page-jump input {
          width: 52px;
          text-align: center;
          padding: 5px 6px;
          border: 1px solid var(--line);
          border-radius: 5px;
          font-size: 0.82rem;
          font-family: 'IBM Plex Mono', monospace;
          color: var(--ink);
          outline: none;
          transition: border-color 0.15s;
        }

        .ev-page-jump input:focus {
          border-color: var(--forest);
        }
      `}</style>
    </>
  );
}