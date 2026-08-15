// src/pages/admin/AdminNotifications.jsx
import { useState, useContext } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { AuthContext } from "../../context/AuthContext";

const Icons = {
  Bell:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Send:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Users:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  User:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Check:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Warning: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

export default function AdminNotifications() {
  const { token } = useContext(AuthContext);

  const [title,   setTitle]   = useState("");
  const [message, setMessage] = useState("");
  const [userId,  setUserId]  = useState("");
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState(null); // { type: "success"|"error", text: string }

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      showToast("error", "Title and message are required.");
      return;
    }

    try {
      setLoading(true);
      const res  = await fetch(
        `${import.meta.env.VITE_API_URL}/api/notifications/admin/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({ title, message, userId: userId || null }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showToast("success", userId
        ? `Notification sent to user #${userId}.`
        : "Announcement sent to all students."
      );
      setTitle(""); setMessage(""); setUserId("");
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to send notification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isAllStudents = !userId.trim();
  const charCount     = message.length;
  const charLimit     = 500;

  return (
    <>
      <AdminSidebar />

      <div className="an-main">

        {/* ── Toast ── */}
        {toast && (
          <div className={`an-toast an-toast--${toast.type}`}>
            {toast.type === "success" ? <Icons.Check /> : <Icons.Warning />}
            <span>{toast.text}</span>
          </div>
        )}

        {/* ── Page header ── */}
        <header className="an-header">
          <div>
            <p className="an-eyebrow">Communication</p>
            <h1 className="an-title">Announcements</h1>
          </div>
        </header>

        {/* ── Two-column layout ── */}
        <div className="an-layout">

          {/* ── Form card ── */}
          <div className="an-card an-form-card">

            {/* Card header with gold rule */}
            <div className="an-card-head">
              <div className="an-card-head-icon"><Icons.Bell /></div>
              <div>
                <h2 className="an-card-title">Send Notification</h2>
                <p className="an-card-sub">Compose and dispatch a message to students</p>
              </div>
            </div>
            <div className="an-gold-rule" />

            {/* Audience indicator */}
            <div className={`an-audience ${isAllStudents ? "audience-all" : "audience-single"}`}>
              {isAllStudents ? <Icons.Users /> : <Icons.User />}
              <span>
                {isAllStudents
                  ? "Broadcasting to all students"
                  : `Sending to user #${userId}`}
              </span>
            </div>

            {/* Form fields */}
            <div className="an-form">
              <div className="an-field">
                <label className="an-label" htmlFor="noti-title">
                  Notification title
                  <span className="an-required">*</span>
                </label>
                <input
                  id="noti-title"
                  className="an-input"
                  type="text"
                  placeholder="e.g. Library hours update"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={120}
                />
                <p className="an-hint">Keep it short and descriptive — this is the first line students see.</p>
              </div>

              <div className="an-field">
                <label className="an-label" htmlFor="noti-message">
                  Message body
                  <span className="an-required">*</span>
                </label>
                <textarea
                  id="noti-message"
                  className="an-textarea"
                  placeholder="Write the full announcement here…"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  maxLength={charLimit}
                />
                <p className={`an-char-count ${charCount > charLimit * 0.9 ? "an-char-warn" : ""}`}>
                  {charCount} / {charLimit}
                </p>
              </div>

              <div className="an-field">
                <label className="an-label" htmlFor="noti-userid">
                  Target user ID
                  <span className="an-optional">optional</span>
                </label>
                <input
                  id="noti-userid"
                  className="an-input"
                  type="number"
                  placeholder="Leave blank to send to all students"
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  min="1"
                />
                <p className="an-hint">Enter a specific user ID to send a direct notification.</p>
              </div>

              <button
                className="an-send-btn"
                onClick={handleSend}
                disabled={loading || !title.trim() || !message.trim()}
              >
                {loading ? (
                  <>
                    <div className="an-btn-spinner" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Icons.Send />
                    {isAllStudents ? "Send to all students" : `Send to user #${userId}`}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Tips card ── */}
          <div className="an-card an-tips-card">
            <h3 className="an-tips-title">Writing tips</h3>
            <div className="an-gold-rule" style={{ marginBottom: 16 }} />
            <ul className="an-tips-list">
              <li>
                <strong>Be specific.</strong> Mention dates, times, and room numbers when relevant — vague announcements get ignored.
              </li>
              <li>
                <strong>Lead with the action.</strong> Students read the title first. If they need to do something, say it there: "Return books by Friday."
              </li>
              <li>
                <strong>Keep it short.</strong> Under 200 characters in the body is ideal. If it needs to be longer, break it into bullet points.
              </li>
              <li>
                <strong>Target when possible.</strong> Use the User ID field to notify a specific student rather than broadcasting to everyone.
              </li>
            </ul>

            <div className="an-tips-divider" />

            <div className="an-broadcast-info">
              <Icons.Users />
              <div>
                <p className="an-broadcast-label">Broadcast mode</p>
                <p className="an-broadcast-sub">Leaving User ID blank sends the notification to every registered student in the system.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

        :root {
          --forest:    #14532D;
          --forest-lt: #3E7A4D;
          --gold:      #B8860B;
          --espresso:  #5C3D2E;
          --rust:      #A13D2B;
          --parchment: #FAF6EE;
          --sage:      #EEF3E7;
          --ink:       #241F18;
          --ink-soft:  #5C5546;
          --line:      #E4DFD3;
        }

        /* ── Layout ── */
        .an-main {
          margin-left: 248px;
          padding: 36px 40px 64px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
        }

        /* ── Toast ── */
        .an-toast {
          position: fixed; top: 20px; right: 24px; z-index: 999;
          display: flex; align-items: center; gap: 10px;
          padding: 12px 18px; border-radius: 8px;
          font-size: 0.875rem; font-weight: 500;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
          animation: an-slide-in 0.2s ease;
          max-width: 360px;
        }
        .an-toast--success { background: var(--forest); color: white; }
        .an-toast--error   { background: var(--rust);   color: white; }
        @keyframes an-slide-in {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Header ── */
        .an-header { margin-bottom: 28px; }
        .an-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .an-title {
          font-family: 'Fraunces', serif;
          font-size: 2rem; font-weight: 600;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
        }

        /* ── Two-col layout ── */
        .an-layout {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }

        /* ── Cards ── */
        .an-card {
          background: white; border: 1px solid var(--line);
          border-radius: 6px; overflow: hidden;
        }

        /* Form card header */
        .an-card-head {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 22px 24px 16px;
        }
        .an-card-head-icon {
          width: 36px; height: 36px; border-radius: 6px;
          background: var(--sage); color: var(--forest);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .an-card-title {
          font-family: 'Fraunces', serif;
          font-size: 1.1rem; font-weight: 600;
          color: var(--forest); margin: 0 0 3px;
        }
        .an-card-sub {
          font-size: 0.8rem; color: var(--ink-soft); margin: 0;
        }

        /* Gold rule — catalog-card signature element */
        .an-gold-rule {
          height: 1px; margin: 0 24px;
          background: linear-gradient(90deg, var(--gold), transparent);
          opacity: 0.45;
        }

        /* Audience pill */
        .an-audience {
          display: flex; align-items: center; gap: 8px;
          margin: 16px 24px;
          padding: 9px 14px; border-radius: 6px;
          font-size: 0.82rem; font-weight: 500;
          border: 1px solid var(--line);
          transition: background 0.15s, border-color 0.15s;
        }
        .audience-all    { background: var(--sage);  color: var(--forest); border-color: #C5DCBB; }
        .audience-single { background: #FEF3C7;      color: #92400E;       border-color: #F6D860; }

        /* Form */
        .an-form { padding: 8px 24px 24px; display: flex; flex-direction: column; gap: 20px; }

        .an-field { display: flex; flex-direction: column; gap: 6px; }

        .an-label {
          font-size: 0.75rem; font-weight: 600;
          color: var(--ink-soft); text-transform: uppercase;
          letter-spacing: 0.07em;
          display: flex; align-items: center; gap: 6px;
        }
        .an-required {
          color: var(--rust); font-size: 0.7rem; font-weight: 700;
        }
        .an-optional {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.62rem; color: var(--ink-soft);
          background: var(--sage); padding: 1px 7px;
          border-radius: 10px; font-weight: 500;
          text-transform: none; letter-spacing: 0;
        }

        .an-input, .an-textarea {
          width: 100%; box-sizing: border-box;
          border: 1px solid var(--line); border-radius: 6px;
          padding: 10px 13px;
          font-size: 0.875rem; font-family: 'Inter', sans-serif;
          color: var(--ink); background: var(--parchment);
          outline: none; transition: border-color 0.15s, background 0.15s;
        }
        .an-input:focus, .an-textarea:focus {
          border-color: var(--forest); background: white;
        }
        .an-input::placeholder, .an-textarea::placeholder { color: #B0A89C; }

        .an-textarea { min-height: 130px; resize: vertical; line-height: 1.6; }

        .an-hint {
          font-size: 0.75rem; color: var(--ink-soft); margin: 0;
          line-height: 1.5;
        }
        .an-char-count {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.7rem; color: var(--ink-soft);
          text-align: right; margin: 0;
        }
        .an-char-warn { color: var(--rust); }

        /* Send button */
        .an-send-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 12px;
          background: var(--forest); color: white;
          border: none; border-radius: 6px;
          font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600;
          cursor: pointer; transition: background 0.15s;
          margin-top: 4px;
        }
        .an-send-btn:hover:not(:disabled) { background: var(--forest-lt); }
        .an-send-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .an-btn-spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.35); border-top-color: white;
          border-radius: 50%; animation: an-spin 0.7s linear infinite;
        }
        @keyframes an-spin { to { transform: rotate(360deg); } }

        /* ── Tips card ── */
        .an-tips-card { padding: 22px 22px 20px; }
        .an-tips-title {
          font-family: 'Fraunces', serif;
          font-size: 0.95rem; font-weight: 600;
          color: var(--forest); margin: 0 0 10px;
        }

        .an-tips-list {
          list-style: none; margin: 0; padding: 0;
          display: flex; flex-direction: column; gap: 14px;
        }
        .an-tips-list li {
          font-size: 0.82rem; color: var(--ink-soft); line-height: 1.55;
          padding-left: 12px; border-left: 2px solid var(--line);
        }
        .an-tips-list li strong { color: var(--ink); font-weight: 600; }

        .an-tips-divider {
          height: 1px; background: var(--line); margin: 18px 0;
        }

        .an-broadcast-info {
          display: flex; gap: 10px; align-items: flex-start;
          color: var(--ink-soft);
        }
        .an-broadcast-info svg { flex-shrink: 0; margin-top: 2px; }
        .an-broadcast-label {
          font-size: 0.78rem; font-weight: 600; color: var(--ink);
          margin: 0 0 3px;
        }
        .an-broadcast-sub {
          font-size: 0.75rem; color: var(--ink-soft); margin: 0;
          line-height: 1.5;
        }

        /* ── Responsive ── */
        @media (max-width: 1000px) {
          .an-main   { margin-left: 0; padding: 24px 20px 48px; }
          .an-layout { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}