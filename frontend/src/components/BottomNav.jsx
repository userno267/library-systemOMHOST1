import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaHome, FaUser, FaBell, FaQrcode } from "react-icons/fa";
import { useEffect, useState, useContext } from "react";
import socket from "../socket";
import { AuthContext } from "../context/AuthContext";
import { requestNotificationPermission, showBrowserNotification } from "../utils/browserNotifications";

// Keep in sync with Sidebar.jsx's DESKTOP_BREAKPOINT — above this width
// the persistent sidebar covers navigation, so the bottom bar hides itself
// via CSS (not unmounted, so its socket-driven badge state doesn't reset).
export const notificationBus = {
  _listeners: [],
  on(fn) { this._listeners.push(fn); },
  off(fn) { this._listeners = this._listeners.filter(l => l !== fn); },
  emit() { this._listeners.forEach(fn => fn()); },
};

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);

  const baseURL = import.meta.env.VITE_API_URL;

  const handleScanClick = () => navigate("/scan");

  const fetchUnread = async () => {
    if (!user || !token) return;
    try {
      const res = await fetch(`${baseURL}/api/notifications/unread-count`, {
        headers: {
          "ngrok-skip-browser-warning": "true",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (typeof data.count === "number") {
        setUnreadCount(data.count);
      }
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  };

  useEffect(() => {
    if (user && token) fetchUnread();
  }, [user?.id, token]);

  useEffect(() => {
    notificationBus.on(fetchUnread);
    return () => notificationBus.off(fetchUnread);
  }, [user?.id, token]);

  useEffect(() => {
    if (user && token) {
      requestNotificationPermission();
    }
  }, [user?.id, token]);

  useEffect(() => {
    if (!user?.id || !token) return;

    socket.auth = { token };
    if (!socket.connected) socket.connect();

    const handleConnect = () => socket.emit("join", user.id);

    const handleNewNotification = (data) => {
      setUnreadCount((prev) => prev + 1);
      showBrowserNotification(data);
    };

    socket.on("connect", handleConnect);
    socket.on("newNotification", handleNewNotification);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("newNotification", handleNewNotification);
    };
  }, [user?.id, token]);

  const navItems = [
    { type: "link", href: "/home", icon: <FaHome />, label: "Home" },
    { type: "link", href: "/Profile", icon: <FaUser />, label: "Profile" },
    {
      type: "link",
      href: "/Notification",
      icon: <FaBell />,
      label: "Alerts",
      badge: unreadCount,
    },
    {
      type: "button",
      icon: <FaQrcode />,
      label: "Scan",
      onClick: handleScanClick,
    },
  ];

  return (
    <nav className="bn-bottom-nav">
      {navItems.map((item, index) =>
        item.type === "link" ? (
          <Link
            key={index}
            to={item.href}
            className={`bn-nav-item ${location.pathname === item.href ? "bn-active" : ""}`}
          >
            <div className="bn-icon-wrapper">
              {item.icon}
              {item.badge > 0 && <span className="bn-badge">{item.badge}</span>}
            </div>
            <span>{item.label}</span>
          </Link>
        ) : (
          <button key={index} onClick={item.onClick} className="bn-nav-item">
            <div className="bn-icon-wrapper">{item.icon}</div>
            <span>{item.label}</span>
          </button>
        )
      )}

      <style jsx>{`
        .bn-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 65px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #14532D;
          box-shadow: 0 -3px 12px rgba(0, 0, 0, 0.2);
          padding: 0 8px;
          padding-bottom: env(safe-area-inset-bottom);
          z-index: 999;
          overflow: visible;
        }

        /* Hide on tablet/desktop — persistent Sidebar covers nav there */
        @media (min-width: 900px) {
          .bn-bottom-nav { display: none; }
        }

        .bn-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,0.75);
          font-size: 0.75rem;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: none;
          position: relative;
          transition: all 0.25s ease;
          z-index: 1;
        }

        .bn-nav-item svg {
          font-size: 1.3rem;
          margin-bottom: 3px;
          transition: transform 0.2s ease;
        }

        .bn-icon-wrapper { position: relative; overflow: visible; }

        .bn-badge {
          position: absolute;
          top: -6px;
          right: -10px;
          background: #A13D2B;
          color: white;
          font-size: 0.6rem;
          padding: 2px 6px;
          border-radius: 12px;
          font-weight: bold;
          min-width: 18px;
          text-align: center;
          z-index: 100;
          box-shadow: 0 0 0 2px #14532D;
        }

        .bn-nav-item.bn-active {
          color: #B8860B;
          font-weight: 600;
          transform: translateY(-4px);
        }

        .bn-nav-item.bn-active svg { transform: scale(1.12); }
        .bn-nav-item:hover { color: #fff; }
      `}</style>
    </nav>
  );
}