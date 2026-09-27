// src/pages/ScanQR.jsx
// Handles three QR types:
//   BOOK:id        → navigate to book detail (existing)
//   ATTENDANCE:... → record time in / time out
//   anything else  → show invalid message

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";

// ── Icons ──────────────────────────────────────────────────────────────────
const Icons = {
  Scan:    () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/></svg>,
  In:      () => <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
  Out:     () => <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Warning: () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Refresh: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.28-3.41"/></svg>,
};

export default function ScanQR() {
  const navigate = useNavigate();
  const baseURL  = import.meta.env.VITE_API_URL;
  const token    = localStorage.getItem("token");

  const [attendanceResult, setAttendanceResult] = useState(null);
  // { action: "time_in"|"time_out", message: string, time: string }
  const [attendanceError, setAttendanceError]   = useState(null);
  const [scanning, setScanning]                 = useState(true);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: 250 },
      false
    );

    scanner.render(
      async (decodedText) => {

        /* ── BOOK QR ── */
        if (decodedText.startsWith("BOOK:")) {
          const bookId = decodedText.split(":")[1];
          scanner.clear().catch(() => {});
          navigate(`/books/${bookId}`);
          return;
        }

        /* ── ATTENDANCE QR ── */
        if (decodedText.startsWith("ATTENDANCE:")) {
          // Stop scanner so it doesn't fire twice
          scanner.clear().catch(() => {});
          setScanning(false);
          setAttendanceResult(null);
          setAttendanceError(null);

          try {
            const res = await fetch(`${baseURL}/api/attendance/scan`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
              }
            });

            const data = await res.json();

            if (!res.ok) {
              setAttendanceError(data.message || "Attendance failed");
              return;
            }

            setAttendanceResult(data);
          } catch (err) {
            setAttendanceError("Server error. Please try again.");
          }
          return;
        }

        /* ── INVALID ── */
        setAttendanceError(`Unrecognized QR code: "${decodedText}"`);
      },
      (error) => {
        console.warn(error);
      }
    );

    return () => scanner.clear().catch(() => {});
  }, [navigate]);

  /* ── reset: start a new scan ── */
  const handleScanAgain = () => {
    setAttendanceResult(null);
    setAttendanceError(null);
    setScanning(true);
    // reload the page to reinitialize the scanner cleanly
    window.location.reload();
  };

  const formatTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <Sidebar />

      <div className="sq-main">

        {/* ── Page header ── */}
        <header className="sq-header">
          <p className="sq-eyebrow">Attendance &amp; Books</p>
          <h1 className="sq-title">Scan QR Code</h1>
        </header>

        {/* ── SCANNER ── */}
        {scanning && (
          <div className="sq-card">
            <div className="sq-card-head">
              <div className="sq-card-head-icon"><Icons.Scan /></div>
              <div>
                <p className="sq-card-title">Point your camera at a code</p>
                <p className="sq-card-sub">Scan a book QR to view it, or the library attendance QR to time in/out</p>
              </div>
            </div>
            <div className="sq-gold-rule" />
            <div className="sq-scanner-wrap">
              <div id="reader" className="sq-scanner-box" />
            </div>
          </div>
        )}

        {/* ── ATTENDANCE SUCCESS ── */}
        {attendanceResult && (
          <div className={`sq-result-card sq-result--${attendanceResult.action}`}>
            <div className="sq-result-icon">
              {attendanceResult.action === "time_in" ? <Icons.In /> : <Icons.Out />}
            </div>
            <p className="sq-result-eyebrow">
              {attendanceResult.action === "time_in" ? "Time In" : "Time Out"}
            </p>
            <h2 className="sq-result-time">{formatTime(attendanceResult.time)}</h2>
            <p className="sq-result-msg">{attendanceResult.message}</p>
            <button className="sq-again-btn" onClick={handleScanAgain}>
              <Icons.Refresh /> Scan Again
            </button>
          </div>
        )}

        {/* ── ATTENDANCE ERROR ── */}
        {attendanceError && (
          <div className="sq-result-card sq-result--error">
            <div className="sq-result-icon sq-result-icon--error"><Icons.Warning /></div>
            <p className="sq-result-eyebrow sq-result-eyebrow--error">Scan Failed</p>
            <p className="sq-result-msg">{attendanceError}</p>
            <button className="sq-again-btn" onClick={handleScanAgain}>
              <Icons.Refresh /> Try Again
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
          --rust:      #A13D2B;
          --parchment: #FAF6EE;
          --sage:      #EEF3E7;
          --ink:       #241F18;
          --ink-soft:  #5C5546;
          --line:      #E4DFD3;
        }

        .sq-main {
          padding: 24px 20px 100px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
          display: flex; flex-direction: column; align-items: center;
        }
        @media (max-width: 899px) { .sq-main { padding-top: 74px; } }

        /* ── Header ── */
        .sq-header { width: 100%; max-width: 420px; margin-bottom: 18px; text-align: center; }
        .sq-eyebrow {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .sq-title {
          font-family: 'Fraunces', serif; font-size: 1.55rem; font-weight: 600;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
        }

        /* ── Scanner card ── */
        .sq-card {
          width: 100%; max-width: 420px;
          background: white; border: 1px solid var(--line);
          border-radius: 8px; overflow: hidden;
        }
        .sq-card-head {
          display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 14px;
        }
        .sq-card-head-icon {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 6px;
          background: var(--sage); color: var(--forest); flex-shrink: 0;
        }
        .sq-card-title {
          font-family: 'Fraunces', serif; font-weight: 600;
          font-size: 0.95rem; color: var(--forest); margin: 0 0 3px;
        }
        .sq-card-sub { font-size: 0.78rem; color: var(--ink-soft); margin: 0; line-height: 1.45; }
        .sq-gold-rule {
          height: 1px; margin: 0 20px;
          background: linear-gradient(90deg, var(--gold), transparent); opacity: 0.4;
        }

        .sq-scanner-wrap { display: flex; justify-content: center; padding: 20px; }
        .sq-scanner-box {
          width: 100%; max-width: 300px;
          border-radius: 8px; overflow: hidden;
          border: 1px solid var(--line);
        }

        /* ── Result card ── */
        .sq-result-card {
          width: 100%; max-width: 420px;
          background: white; border-radius: 8px;
          padding: 32px 24px; text-align: center;
          border: 1px solid var(--line); border-top: 4px solid var(--forest);
        }
        .sq-result--time_out { border-top-color: var(--rust); }
        .sq-result--error    { border-top-color: var(--gold); }

        .sq-result-icon {
          display: flex; align-items: center; justify-content: center;
          width: 64px; height: 64px; border-radius: 50%;
          background: var(--sage); color: var(--forest);
          margin: 0 auto 14px;
        }
        .sq-result--time_out .sq-result-icon { background: #FBDCD5; color: var(--rust); }
        .sq-result-icon--error { background: #FFF3E0; color: #B8860B; }

        .sq-result-eyebrow {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
          letter-spacing: 0.12em; text-transform: uppercase; color: var(--forest);
          margin: 0 0 6px; font-weight: 600;
        }
        .sq-result--time_out .sq-result-eyebrow { color: var(--rust); }
        .sq-result-eyebrow--error { color: #92400E; }

        .sq-result-time {
          font-family: 'Fraunces', serif; font-size: 2rem; font-weight: 700;
          color: var(--ink); margin: 0 0 10px;
        }
        .sq-result-msg { font-size: 0.85rem; color: var(--ink-soft); margin: 0 0 22px; line-height: 1.5; }

        .sq-again-btn {
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--forest); color: white; border: none;
          padding: 11px 26px; border-radius: 7px;
          font-size: 0.875rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: background 0.15s;
        }
        .sq-again-btn:hover { background: var(--forest-lt); }
      `}</style>
    </>
  );
}