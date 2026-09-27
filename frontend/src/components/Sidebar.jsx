// NOTE: this file replaces frontend/src/components/Sidebar.jsx
import { useState, useEffect, useContext, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaBookOpen,
  FaBook,
  FaLaptop,
  FaComments,
  FaBars,
  FaSignOutAlt,
  FaQrcode,
  FaReceipt,
  FaTimes,
} from "react-icons/fa";
import { AuthContext } from "../context/AuthContext";

// Tablet/desktop breakpoint — at and above this width the sidebar is
// persistent (like AdminSidebar); below it, it's a drawer + bottom nav.
const DESKTOP_BREAKPOINT = 900;

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= DESKTOP_BREAKPOINT : false
  );
  const sidebarRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { logoutUser, user } = useContext(AuthContext);

  const isAdmin = user?.role === "admin";

  const navGroups = [
    {
      title: "Library",
      items: [
        { path: "/home", icon: <FaHome />, label: "Home" },
        { path: "/BrowseBooks", icon: <FaBookOpen />, label: "Browse Books" },
        { path: "/UserBorrowPage", icon: <FaBook />, label: "Borrowed Books" },
        { path: "/BrowseEbooks", icon: <FaLaptop />, label: "E-books" },
      ],
    },
    {
      title: "Account",
      items: [
        { path: "/SupportChat", icon: <FaComments />, label: "Chat Librarian" },
        { path: "/transactions", icon: <FaReceipt />, label: "My Fines" },
        ...(isAdmin
          ? [{ path: "/qr-borrow", icon: <FaQrcode />, label: "QR Borrow Station" }]
          : []),
      ],
    },
  ];

  // ================= RESPONSIVE MODE =================
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      setIsDesktop(desktop);
      // On desktop the sidebar is always "open" (persistent); on mobile
      // it starts closed so it doesn't cover content until toggled.
      setOpen(desktop);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ================= OUTSIDE CLICK CLOSE (mobile only) =================
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !isDesktop &&
        open &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, isDesktop]);

  const handleNavClick = () => {
    if (!isDesktop) setOpen(false);
  };

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  return (
    <>
      {/* ================= OVERLAY (mobile only) ================= */}
      {open && !isDesktop && (
        <div className="sb-overlay" onClick={() => setOpen(false)} />
      )}

      {/* ================= TOGGLE BUTTON (mobile only) ================= */}
      {!isDesktop && (
        <button className="sb-toggle-btn" onClick={() => setOpen((v) => !v)}>
          {open ? <FaTimes /> : <FaBars />}
        </button>
      )}

      {/* ================= SIDEBAR ================= */}
      <aside
        ref={sidebarRef}
        className={`sb-sidebar ${open ? "sb-open" : ""} ${isDesktop ? "sb-desktop" : ""}`}
      >
        {/* Brand */}
        <div className="sb-brand">
          <div className="sb-brand-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <div className="sb-brand-text">
            <span className="sb-brand-name">LibPortal</span>
            <span className="sb-brand-role">
              {isAdmin ? "Admin · Student View" : "Student"}
            </span>
          </div>
        </div>

        <div className="sb-gold-rule" />

        {/* Nav groups */}
        <nav className="sb-nav-scroll">
          {navGroups.map((group) => (
            <div key={group.title} className="sb-nav-group">
              <p className="sb-group-label">{group.title}</p>
              {group.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={handleNavClick}
                    className={`sb-nav-link ${active ? "sb-nav-link--active" : ""}`}
                  >
                    <span className="sb-nav-icon">{item.icon}</span>
                    <span className="sb-nav-label">{item.label}</span>
                    {active && <span className="sb-active-pip" aria-hidden="true" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer / logout */}
        <div className="sb-sidebar-footer">
          <div className="sb-gold-rule" style={{ marginBottom: "14px" }} />
          <button className="sb-logout-btn" onClick={handleLogout}>
            <FaSignOutAlt />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700&family=Inter:wght@400;500;600&display=swap');

        .sb-sidebar {
          --forest:    #14532D;
          --gold:      #B8860B;
          --white-8:   rgba(255,255,255,0.08);
          --white-14:  rgba(255,255,255,0.14);
          --white-60:  rgba(255,255,255,0.60);
          --white-80:  rgba(255,255,255,0.80);

          position: fixed;
          top: 0;
          left: 0;
          width: 248px;
          height: 100dvh;
          background: var(--forest);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          font-family: 'Inter', system-ui, sans-serif;
          border-right: 1px solid rgba(0,0,0,0.18);
          z-index: 2000;
          transform: translateX(-100%);
          transition: transform 0.25s ease;
        }

        .sb-sidebar.sb-open {
          transform: translateX(0);
        }

        /* Persistent mode — no slide, no overlay, no toggle */
        .sb-sidebar.sb-desktop {
          transform: translateX(0);
          transition: none;
        }

        /* ── Toggle button (mobile) ── */
        .sb-toggle-btn {
          position: fixed;
          top: 15px;
          left: 15px;
          background: var(--forest, #14532D);
          border: none;
          color: #fff;
          padding: 10px;
          border-radius: 10px;
          z-index: 2100;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        }

        .sb-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 1500;
          backdrop-filter: blur(2px);
        }

        /* ── Brand ── */
        .sb-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 22px 20px 16px;
        }
        .sb-brand-mark {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          background: rgba(184,134,11,0.12);
          border: 1px solid rgba(184,134,11,0.30);
          border-radius: 6px;
          flex-shrink: 0;
        }
        .sb-brand-text { display: flex; flex-direction: column; gap: 1px; }
        .sb-brand-name {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 1.02rem;
          font-weight: 700;
          color: #fff;
        }
        .sb-brand-role {
          font-size: 0.62rem;
          font-weight: 500;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: var(--gold);
          opacity: 0.9;
        }

        .sb-gold-rule {
          height: 1px;
          margin: 0 20px;
          background: linear-gradient(90deg, var(--gold) 0%, transparent 100%);
          opacity: 0.45;
        }

        /* ── Nav ── */
        .sb-nav-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 18px 12px 8px;
        }
        .sb-nav-group { margin-bottom: 22px; }
        .sb-group-label {
          font-size: 0.62rem;
          font-weight: 600;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: var(--gold);
          opacity: 0.75;
          padding: 0 8px;
          margin: 0 0 6px;
        }

        .sb-nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 10px 10px 12px;
          border-radius: 6px;
          color: var(--white-80);
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 450;
          margin-bottom: 2px;
          transition: background 0.15s, color 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .sb-nav-link:hover { background: var(--white-14); color: #fff; }
        .sb-nav-link--active {
          background: var(--white-8);
          color: #fff;
          font-weight: 550;
        }
        .sb-nav-link--active::before {
          content: '';
          position: absolute;
          left: -12px;
          top: 20%;
          bottom: 20%;
          width: 2.5px;
          border-radius: 99px;
          background: var(--gold);
        }
        .sb-nav-icon { display: flex; align-items: center; opacity: 0.75; flex-shrink: 0; }
        .sb-nav-link--active .sb-nav-icon,
        .sb-nav-link:hover .sb-nav-icon { opacity: 1; }
        .sb-nav-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sb-active-pip {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--gold); flex-shrink: 0; margin-left: auto;
        }

        /* ── Footer ── */
        .sb-sidebar-footer { padding: 0 12px 20px; }
        .sb-logout-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.10);
          background: transparent;
          color: var(--white-60);
          font-family: 'Inter', sans-serif;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          text-align: left;
        }
        .sb-logout-btn:hover {
          background: rgba(255,255,255,0.07);
          color: #fff;
          border-color: rgba(255,255,255,0.20);
        }
      `}</style>
    </>
  );
}