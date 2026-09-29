import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import BottomNav, { notificationBus } from "../components/BottomNav";
import socket from "../socket";
import { showBrowserNotification } from "../utils/browserNotifications";

// ── Icons ──────────────────────────────────────────────────────────────────
const Icons = {
  Bell:     () => <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#C4BFB5" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Clock:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Warning:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Book:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Megaphone:() => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>,
  Check:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Chevron:  ({ open }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"/></svg>,
};

const TYPE_CONFIG = {
  due_soon: { icon: <Icons.Clock />,     label: "Due Soon",  cls: "np-type--due" },
  overdue:  { icon: <Icons.Warning />,   label: "Overdue",   cls: "np-type--overdue" },
  wishlist: { icon: <Icons.Book />,      label: "Wishlist",  cls: "np-type--wishlist" },
  admin:    { icon: <Icons.Megaphone />, label: "Admin",     cls: "np-type--admin" },
  system:   { icon: <Icons.Bell />,      label: "System",    cls: "np-type--system" },
};

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || { icon: <Icons.Bell />, label: type || "Notice", cls: "np-type--system" };
  return (
    <span className={`np-type-badge ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function NotificationsPage() {
  const { user, token } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const baseURL = import.meta.env.VITE_API_URL.replace(/\/$/, "");

  /* ===========================
     FETCH NOTIFICATIONS
  =========================== */
  useEffect(() => {
    if (!user || !token) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${baseURL}/api/notifications`, {
          headers: {
            "ngrok-skip-browser-warning": "true",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setNotifications(
          Array.isArray(data)
            ? data.map((n) => ({ ...n, expanded: false, isRead: !!n.is_read }))
            : []
        );
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user, token]);

  /* ===========================
     SOCKET
  =========================== */
  useEffect(() => {
    if (!user || !token) return;

    socket.auth = { token };
    if (!socket.connected) socket.connect();

    const handleConnect = () => socket.emit("join", user.id);
    socket.on("connect", handleConnect);

    const handleNotification = (data) => {
      setNotifications((prev) => [
        { ...data, expanded: false, isRead: false },
        ...prev,
      ]);

      // Popup notification (browser-native), in addition to updating the list
      showBrowserNotification(data);
    };
    socket.on("newNotification", handleNotification);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("newNotification", handleNotification);
    };
  }, [user, token]);

  /* ===========================
     TOGGLE EXPAND (mark single read)
  =========================== */
  const toggleExpand = async (id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, expanded: !n.expanded, isRead: true } : n
      )
    );

    try {
      await fetch(`${baseURL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          "ngrok-skip-browser-warning": "true",
          Authorization: `Bearer ${token}`,
        },
      });

      notificationBus.emit();
    } catch (err) {
      console.error(`Failed to mark notification ${id} as read:`, err);
    }
  };

  /* ===========================
     MARK ALL AS READ
  =========================== */
  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await fetch(`${baseURL}/api/notifications/read-all`, {
        method: "PATCH",
        headers: {
          "ngrok-skip-browser-warning": "true",
          Authorization: `Bearer ${token}`,
        },
      });

      notificationBus.emit();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const formatWhen = (dt) => {
    if (!dt) return "";
    const d = new Date(dt);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="np-main np-loading">
          <div className="np-spinner" />
          <span>Loading notifications…</span>
        </div>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <Sidebar />

      <div className="np-main">

        {/* ── Page header ── */}
        <header className="np-header">
          <div>
            <p className="np-eyebrow">Updates</p>
            <h1 className="np-title">
              Notifications
              {unreadCount > 0 && <span className="np-unread-pill">{unreadCount} new</span>}
            </h1>
          </div>
          {notifications.length > 0 && (
            <button className="np-read-all-btn" onClick={markAllAsRead}>
              <Icons.Check /> Mark all as read
            </button>
          )}
        </header>

        {/* ── List ── */}
        {notifications.length === 0 ? (
          <div className="np-empty">
            <Icons.Bell />
            <p className="np-empty-title">No notifications yet</p>
            <p className="np-empty-sub">Updates about your borrows and fines will show up here.</p>
          </div>
        ) : (
          <ul className="np-list">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`np-item ${n.isRead ? "np-item--read" : "np-item--unread"}`}
                onClick={() => toggleExpand(n.id)}
              >
                <div className="np-item-row">
                  <div className="np-item-main">
                    <div className="np-item-top">
                      <TypeBadge type={n.type} />
                      {!n.isRead && <span className="np-dot" />}
                    </div>
                    <p className="np-item-message">{n.title || n.message}</p>
                  </div>
                  <div className="np-item-side">
                    <span className="np-item-time">{formatWhen(n.created_at)}</span>
                    <Icons.Chevron open={n.expanded} />
                  </div>
                </div>

                {n.expanded && (
                  <div className="np-details">
                    <p className="np-detail-row"><span>Type</span>{n.type}</p>
                    <p className="np-detail-row"><span>Sent</span>{new Date(n.created_at).toLocaleString()}</p>
                    <p className="np-detail-message">{n.message}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
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

        .np-main {
          padding: 24px 20px 100px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
        }
        @media (max-width: 899px) { .np-main { padding-top: 74px; } }

        .np-loading {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; color: var(--ink-soft); font-size: 0.9rem;
        }
        .np-spinner {
          width: 22px; height: 22px;
          border: 2.5px solid var(--line); border-top-color: var(--forest);
          border-radius: 50%; animation: np-spin 0.7s linear infinite;
        }
        @keyframes np-spin { to { transform: rotate(360deg); } }

        /* ── Header ── */
        .np-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 12px; margin-bottom: 20px; flex-wrap: wrap;
        }
        .np-eyebrow {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .np-title {
          font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 600;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
          display: flex; align-items: center; gap: 10px;
        }
        .np-unread-pill {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.66rem; font-weight: 600;
          background: var(--rust); color: white; padding: 3px 9px;
          border-radius: 20px; letter-spacing: 0.02em;
        }

        .np-read-all-btn {
          display: flex; align-items: center; gap: 6px;
          background: white; border: 1px solid var(--line);
          color: var(--forest); padding: 8px 14px; border-radius: 6px;
          font-size: 0.8rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: background 0.12s, border-color 0.12s;
          white-space: nowrap; height: fit-content;
        }
        .np-read-all-btn:hover { background: var(--sage); border-color: var(--forest); }

        /* ── List ── */
        .np-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }

        .np-item {
          background: white; border: 1px solid var(--line);
          border-radius: 8px; padding: 14px 16px; cursor: pointer;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .np-item:hover { box-shadow: 0 3px 12px rgba(20,83,45,0.08); }
        .np-item--unread { border-left: 3px solid var(--forest); }
        .np-item--read { opacity: 0.78; }

        .np-item-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
        .np-item-main { flex: 1; min-width: 0; }
        .np-item-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .np-item-message {
          margin: 0; font-size: 0.88rem; color: var(--ink); font-weight: 500;
          line-height: 1.4;
        }
        .np-item--read .np-item-message { font-weight: 400; color: var(--ink-soft); }

        .np-item-side {
          display: flex; align-items: center; gap: 8px; flex-shrink: 0;
          color: var(--ink-soft);
        }
        .np-item-time {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.7rem;
          white-space: nowrap;
        }

        .np-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--rust); flex-shrink: 0; }

        /* Type badges */
        .np-type-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 0.66rem; font-weight: 600; padding: 3px 9px;
          border-radius: 20px; letter-spacing: 0.02em; white-space: nowrap;
        }
        .np-type--due       { background: #FEF3C7; color: #92400E; }
        .np-type--overdue   { background: #FBDCD5; color: var(--rust); }
        .np-type--wishlist  { background: #E8F0FE; color: #2B4CA0; }
        .np-type--admin     { background: #EDE9FE; color: #4C1D95; }
        .np-type--system    { background: var(--sage); color: var(--forest); }

        /* Details */
        .np-details {
          margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line);
          display: flex; flex-direction: column; gap: 6px;
        }
        .np-detail-row {
          display: flex; gap: 8px; margin: 0; font-size: 0.78rem; color: var(--ink-soft);
          text-transform: capitalize;
        }
        .np-detail-row span {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.66rem;
          text-transform: uppercase; letter-spacing: 0.06em; color: #8a7a6a;
          min-width: 40px;
        }
        .np-detail-message {
          margin: 4px 0 0; font-size: 0.84rem; color: var(--ink); line-height: 1.5;
        }

        /* Empty */
        .np-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 10px; padding: 70px 20px; text-align: center;
          color: var(--ink-soft); font-size: 0.88rem;
          background: white; border: 1px dashed var(--line); border-radius: 8px;
        }
        .np-empty-title { margin: 0; font-weight: 600; font-size: 0.95rem; color: var(--ink); }
        .np-empty-sub { margin: 0; font-size: 0.8rem; }
      `}</style>
    </>
  );
}