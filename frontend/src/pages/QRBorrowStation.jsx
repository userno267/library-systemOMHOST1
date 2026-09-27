// src/pages/QRBorrowStation.jsx

import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";

const STATUS = {
  IDLE:           "idle",
  USER_SCANNED:   "user_scanned",
  REVIEW:         "review",
  LOADING:        "loading",
  SUCCESS:        "success",
  ERROR:          "error",
};

// ── Icons ──────────────────────────────────────────────────────────────────
const Icons = {
  User:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Book:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Check:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X:       () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Refresh: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.28-3.41"/></svg>,
  Warning: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

export default function QRBorrowStation() {
  const baseURL = import.meta.env.VITE_API_URL;
  const token   = localStorage.getItem("token");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };

  const [resolvedUser, setResolvedUser] = useState(null);
  const [resolvedBook, setResolvedBook] = useState(null);
  const [status, setStatus]             = useState(STATUS.IDLE);
  const [message, setMessage]           = useState("");
  const [wrongScan, setWrongScan]       = useState("");

  const scannerRef      = useRef(null);
  const resolvedUserRef = useRef(null);

  useEffect(() => { resolvedUserRef.current = resolvedUser; }, [resolvedUser]);

  const startScanner = (divId, expectedPrefix, onSuccess) => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }

    const scanner = new Html5QrcodeScanner(divId, { fps: 10, qrbox: 220 }, false);

    scanner.render(
      (decodedText) => {
        if (!decodedText.startsWith(expectedPrefix)) {
          const expected = expectedPrefix === "USER:" ? "student" : "book";
          const got      = decodedText.startsWith("USER:") ? "student"
                         : decodedText.startsWith("BOOK:") ? "book"
                         : "unknown";

          setWrongScan(`That's a ${got} QR. Please scan a ${expected} QR.`);

          setTimeout(() => {
            setWrongScan("");
            startScanner(divId, expectedPrefix, onSuccess);
          }, 2500);

          return;
        }

        setWrongScan("");
        scanner.clear().catch(() => {});
        scannerRef.current = null;
        onSuccess(decodedText);
      },
      (err) => console.warn(err)
    );

    scannerRef.current = scanner;
  };

  useEffect(() => {
    return () => { if (scannerRef.current) scannerRef.current.clear().catch(() => {}); };
  }, []);

  useEffect(() => {
    if (status === STATUS.IDLE) {
      setTimeout(() => startScanner("user-reader", "USER:", handleUserScanned), 300);
    }
  }, [status]);

  useEffect(() => {
    if (status === STATUS.USER_SCANNED) {
      setTimeout(() => startScanner("book-reader", "BOOK:", handleBookScanned), 300);
    }
  }, [status]);

  const handleUserScanned = async (raw) => {
    const userId = raw.split(":")[1];

    if (!userId || isNaN(userId)) {
      setMessage("Invalid student QR");
      setStatus(STATUS.ERROR);
      return;
    }

    try {
      const url = `${baseURL}/api/users/admin/${userId}`;
      const res  = await fetch(url, { headers });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Student not found");

      setResolvedUser(data);
      setMessage("");
      setStatus(STATUS.USER_SCANNED);
    } catch (err) {
      setMessage(err.message);
      setStatus(STATUS.ERROR);
    }
  };

  const handleBookScanned = async (raw) => {
    const bookId = raw.split(":")[1];

    if (!bookId || isNaN(bookId)) {
      setMessage("Invalid book QR");
      setStatus(STATUS.ERROR);
      return;
    }

    try {
      const url  = `${baseURL}/api/books/${bookId}`;
      const res  = await fetch(url, { headers });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Book not found");

      setResolvedBook(data);
      setMessage("");
      setStatus(STATUS.REVIEW);
    } catch (err) {
      setMessage(err.message);
      setStatus(STATUS.ERROR);
    }
  };

  const submitBorrow = async () => {
    const currentUser = resolvedUserRef.current;

    if (!currentUser || !resolvedBook) {
      setMessage("Data missing. Please restart.");
      setStatus(STATUS.ERROR);
      return;
    }

    setStatus(STATUS.LOADING);

    try {
      const url = `${baseURL}/api/admin/borrow`;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ user_id: currentUser.id, book_id: resolvedBook.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Borrow failed");
        setStatus(STATUS.ERROR);
        return;
      }

      setStatus(STATUS.SUCCESS);
      setMessage("Book borrowed successfully!");
    } catch (err) {
      setMessage("Server error. Please try again.");
      setStatus(STATUS.ERROR);
    }
  };

  const handleReset = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setResolvedUser(null);
    setResolvedBook(null);
    setMessage("");
    setWrongScan("");
    setStatus(STATUS.IDLE);
  };

  const activeStep =
    status === STATUS.IDLE         ? 0 :
    status === STATUS.USER_SCANNED ? 1 :
    status === STATUS.REVIEW       ? 2 : 2;

  const steps = [
    { label: "Scan Student", icon: <Icons.User />, done: !!resolvedUser },
    { label: "Scan Book",    icon: <Icons.Book />, done: !!resolvedBook },
    { label: "Confirm",      icon: <Icons.Check />, done: status === STATUS.SUCCESS },
  ];

  return (
    <>
      <Sidebar />

      <div className="qbs-main">

        {/* ── Page header ── */}
        <header className="qbs-header">
          <p className="qbs-eyebrow">Circulation Desk</p>
          <h1 className="qbs-title">QR Borrow Station</h1>
          <p className="qbs-subtitle">Scan a student's QR, then the book's QR, to record a borrow</p>
        </header>

        {/* ── Step indicator ── */}
        <div className="qbs-steps">
          {steps.map((s, i) => (
            <div key={i} className={`qbs-step ${s.done ? "qbs-step--done" : ""} ${i === activeStep ? "qbs-step--active" : ""}`}>
              <div className="qbs-step-circle">{s.done ? <Icons.Check /> : s.icon}</div>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Main card ── */}
        <div className="qbs-card">

          {wrongScan && (
            <div className="qbs-wrong-scan">
              <Icons.Warning /> {wrongScan}
            </div>
          )}

          {/* STEP 1 — STUDENT SCANNER */}
          {status === STATUS.IDLE && (
            <div className="qbs-scan-section">
              <div className="qbs-scan-label">
                <div className="qbs-scan-icon"><Icons.User /></div>
                <div>
                  <strong>Scan Student QR</strong>
                  <p>Student opens Profile → Show QR</p>
                </div>
              </div>
              <div id="user-reader" className="qbs-scanner-box" />
            </div>
          )}

          {/* STUDENT RESOLVED */}
          {resolvedUser && (
            <div className="qbs-resolved-box">
              <div className="qbs-resolved-icon"><Icons.User /></div>
              <div>
                <strong>{resolvedUser.full_name}</strong>
                <p>LRN: {resolvedUser.lrn || "—"}</p>
              </div>
            </div>
          )}

          {/* STEP 2 — BOOK SCANNER */}
          {status === STATUS.USER_SCANNED && (
            <div className="qbs-scan-section" style={{ marginTop: 16 }}>
              <div className="qbs-scan-label">
                <div className="qbs-scan-icon"><Icons.Book /></div>
                <div>
                  <strong>Scan Book QR</strong>
                  <p>Scan the sticker on the book or its detail page</p>
                </div>
              </div>
              <div id="book-reader" className="qbs-scanner-box" />
            </div>
          )}

          {/* BOOK RESOLVED */}
          {resolvedBook && status !== STATUS.REVIEW && (
            <div className="qbs-resolved-box" style={{ marginTop: 10 }}>
              <div className="qbs-resolved-icon"><Icons.Book /></div>
              <div>
                <strong>{resolvedBook.title}</strong>
                <p>{resolvedBook.copies ?? 0} available</p>
              </div>
            </div>
          )}

          {/* STEP 3 — REVIEW & CONFIRM */}
          {status === STATUS.REVIEW && (
            <div className="qbs-review-section">
              <p className="qbs-review-eyebrow">Ready to Confirm</p>
              <h3 className="qbs-review-title">Review Borrow</h3>

              <div className="qbs-review-item">
                <span className="qbs-review-label">Student</span>
                <div className="qbs-review-value">
                  <Icons.User />
                  <strong>{resolvedUser?.full_name}</strong>
                </div>
              </div>

              <div className="qbs-review-item">
                <span className="qbs-review-label">Book</span>
                <div className="qbs-review-value">
                  <Icons.Book />
                  <strong>{resolvedBook?.title}</strong>
                </div>
              </div>

              <div className="qbs-button-group">
                <button
                  className="qbs-confirm-btn"
                  onClick={submitBorrow}
                  disabled={status === STATUS.LOADING}
                >
                  <Icons.Check /> Confirm &amp; Borrow
                </button>
                <button
                  className="qbs-cancel-btn"
                  onClick={handleReset}
                  disabled={status === STATUS.LOADING}
                >
                  <Icons.X /> Cancel
                </button>
              </div>
            </div>
          )}

          {/* LOADING */}
          {status === STATUS.LOADING && (
            <div className="qbs-msg qbs-msg--loading">
              <div className="qbs-btn-spinner" /> Creating borrow record…
            </div>
          )}

          {/* RESULT MESSAGE */}
          {message && (
            <div className={`qbs-msg ${status === STATUS.SUCCESS ? "qbs-msg--success" : "qbs-msg--error"}`}>
              {status === STATUS.SUCCESS ? <Icons.Check /> : <Icons.Warning />} {message}
            </div>
          )}

          {/* RESET BUTTON */}
          {(status === STATUS.SUCCESS || status === STATUS.ERROR) && (
            <button className="qbs-reset-btn" onClick={handleReset}>
              <Icons.Refresh /> New Transaction
            </button>
          )}

        </div>

        {/* ── Instructions ── */}
        <div className="qbs-instructions">
          <p className="qbs-instructions-eyebrow">Steps</p>
          <ol>
            <li>Student opens <strong>Profile</strong></li>
            <li>Scan their QR code</li>
            <li>Scan the book's QR sticker</li>
            <li>Review and confirm</li>
          </ol>
        </div>
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

        .qbs-main {
          padding: 24px 20px 100px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
          max-width: 540px;
          margin: 0 auto;
        }
        @media (max-width: 899px) { .qbs-main { padding-top: 74px; } }

        /* ── Header ── */
        .qbs-header { margin-bottom: 20px; text-align: center; }
        .qbs-eyebrow {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .qbs-title {
          font-family: 'Fraunces', serif; font-size: 1.5rem; font-weight: 600;
          color: var(--forest); margin: 0 0 4px; letter-spacing: -0.01em;
        }
        .qbs-subtitle { font-size: 0.8rem; color: var(--ink-soft); margin: 0; }

        /* ── Steps ── */
        .qbs-steps { display: flex; margin-bottom: 20px; gap: 0; }
        .qbs-step {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          flex: 1; font-size: 0.72rem; color: #B0A89C; text-align: center;
          position: relative;
        }
        .qbs-step:not(:last-child)::after {
          content: ''; position: absolute; top: 15px; right: -50%;
          width: 100%; height: 2px; background: var(--line); z-index: 0;
        }
        .qbs-step--done:not(:last-child)::after { background: var(--forest-lt); }
        .qbs-step-circle {
          width: 30px; height: 30px; border-radius: 50%;
          background: white; border: 1.5px solid var(--line);
          display: flex; align-items: center; justify-content: center;
          color: var(--ink-soft); z-index: 1; position: relative;
        }
        .qbs-step--active .qbs-step-circle { background: var(--forest); border-color: var(--forest); color: white; }
        .qbs-step--done .qbs-step-circle   { background: var(--forest-lt); border-color: var(--forest-lt); color: white; }
        .qbs-step--active { color: var(--forest); font-weight: 600; }
        .qbs-step--done   { color: var(--forest-lt); }

        /* ── Card ── */
        .qbs-card {
          background: white; border: 1px solid var(--line);
          border-radius: 8px; padding: 20px; margin-bottom: 20px;
        }

        /* Wrong scan */
        .qbs-wrong-scan {
          display: flex; align-items: center; gap: 8px;
          background: #FFF3E0; border: 1px solid #F6D860; color: #92400E;
          border-radius: 6px; padding: 10px 14px; font-size: 0.82rem;
          font-weight: 600; margin-bottom: 14px;
        }

        /* Scan section */
        .qbs-scan-section {
          border: 1px solid var(--line); border-radius: 8px;
          padding: 16px; background: #FDFAF5;
        }
        .qbs-scan-label { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 14px; }
        .qbs-scan-icon {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 6px;
          background: var(--sage); color: var(--forest); flex-shrink: 0;
        }
        .qbs-scan-label strong { display: block; color: var(--forest); font-size: 0.9rem; font-family: 'Fraunces', serif; }
        .qbs-scan-label p { margin: 2px 0 0; font-size: 0.78rem; color: var(--ink-soft); }

        .qbs-scanner-box {
          width: 100%; max-width: 300px; margin: 0 auto;
          border-radius: 8px; overflow: hidden; border: 1px solid var(--line);
        }

        /* Resolved box */
        .qbs-resolved-box {
          display: flex; align-items: center; gap: 12px;
          background: var(--sage); border: 1px solid #C5DCBB;
          border-radius: 8px; padding: 12px 14px; margin-top: 14px;
        }
        .qbs-resolved-icon {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 6px;
          background: white; color: var(--forest); flex-shrink: 0;
        }
        .qbs-resolved-box strong { display: block; color: var(--forest); font-size: 0.9rem; font-family: 'Fraunces', serif; }
        .qbs-resolved-box p { margin: 2px 0 0; font-size: 0.78rem; color: var(--ink-soft); }

        /* Review */
        .qbs-review-section {
          background: #FDFAF5; border: 1px solid var(--line);
          border-radius: 8px; padding: 18px;
        }
        .qbs-review-eyebrow {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.66rem;
          letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold);
          margin: 0 0 3px; font-weight: 600; text-align: center;
        }
        .qbs-review-title {
          font-family: 'Fraunces', serif; font-size: 1.05rem; font-weight: 600;
          color: var(--forest); margin: 0 0 16px; text-align: center;
        }
        .qbs-review-item { margin-bottom: 12px; }
        .qbs-review-label {
          display: block; font-size: 0.7rem; color: var(--ink-soft); margin-bottom: 5px;
          text-transform: uppercase; font-weight: 600; letter-spacing: 0.06em;
        }
        .qbs-review-value {
          display: flex; align-items: center; gap: 8px;
          background: white; padding: 10px 12px; border-radius: 6px;
          border: 1px solid var(--line); color: var(--ink-soft);
        }
        .qbs-review-value strong { color: var(--forest); font-size: 0.9rem; }

        .qbs-button-group { display: flex; gap: 8px; margin-top: 16px; }
        .qbs-confirm-btn, .qbs-cancel-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 11px; border: none; border-radius: 7px;
          font-weight: 600; font-size: 0.85rem; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: background 0.15s;
        }
        .qbs-confirm-btn { background: var(--forest); color: white; }
        .qbs-confirm-btn:hover:not(:disabled) { background: var(--forest-lt); }
        .qbs-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .qbs-cancel-btn { background: #FBDCD5; color: var(--rust); }
        .qbs-cancel-btn:hover:not(:disabled) { background: #F5C7BE; }
        .qbs-cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Messages */
        .qbs-msg {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 14px; border-radius: 6px; font-size: 0.85rem;
          margin-top: 14px; font-weight: 600;
        }
        .qbs-msg--success { background: var(--sage); color: var(--forest); }
        .qbs-msg--error   { background: #FBDCD5; color: var(--rust); }
        .qbs-msg--loading { background: #FFF3E0; color: #92400E; }

        .qbs-btn-spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(146,64,14,0.25); border-top-color: #92400E;
          border-radius: 50%; animation: qbs-spin 0.7s linear infinite;
        }
        @keyframes qbs-spin { to { transform: rotate(360deg); } }

        .qbs-reset-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; margin-top: 14px; padding: 12px;
          background: var(--forest); color: white; border: none;
          border-radius: 7px; font-weight: 600; font-size: 0.875rem; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: background 0.15s;
        }
        .qbs-reset-btn:hover { background: var(--forest-lt); }

        /* Instructions */
        .qbs-instructions {
          background: white; border: 1px solid var(--line);
          border-radius: 8px; padding: 16px 18px;
        }
        .qbs-instructions-eyebrow {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.66rem;
          letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold);
          margin: 0 0 10px; font-weight: 600;
        }
        .qbs-instructions ol {
          padding-left: 18px; margin: 0;
          display: flex; flex-direction: column; gap: 5px;
        }
        .qbs-instructions li { font-size: 0.82rem; color: var(--ink-soft); line-height: 1.4; }
        .qbs-instructions strong { color: var(--forest); }
      `}</style>
    </>
  );
}