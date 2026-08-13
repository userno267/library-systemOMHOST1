// src/components/AdminSidebar.jsx

import { useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

// SVG icons — inline, no emoji, no external deps
const Icons = {
  Dashboard: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  Books: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  Borrow: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  QR: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/>
      <path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/>
    </svg>
  ),
  Attendance: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Users: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Chat: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Reports: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  Logout: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutUser } = useContext(AuthContext);

  const navGroups = [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", path: "/admin/dashboard", Icon: Icons.Dashboard },
      ],
    },
    {
      title: "Library",
      items: [
        { label: "Book Management",   path: "/admin/BookManagement",         Icon: Icons.Books },
        { label: "Borrow Management", path: "/admin/ActiveBorrowManagement", Icon: Icons.Borrow },
        { label: "QR Printing",       path: "/admin/QRPrinting",             Icon: Icons.QR },
        { label: "Attendance",        path: "/admin/AttendanceManagement",   Icon: Icons.Attendance },
      ],
    },
    {
      title: "Users",
      items: [
        { label: "User Management", path: "/admin/UserManagement", Icon: Icons.Users },
        { label: "Chat",            path: "/admin/ChatManagement", Icon: Icons.Chat },
      ],
    },
    {
      title: "Analytics",
      items: [
        { label: "Reports", path: "/admin/Report", Icon: Icons.Reports },
      ],
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    logoutUser();
    navigate("/login");
  };

  return (
    <>
      {/* Google Fonts — load once here; move to index.html if preferred */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700&family=Inter:wght@400;500;600&display=swap');`}</style>

      <aside className="sidebar">

        {/* ── Brand mark ── */}
        <div className="brand">
          <div className="brand-mark">
            {/* Minimal open-book SVG mark */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">LibPortal</span>
            <span className="brand-role">Admin Console</span>
          </div>
        </div>

        {/* ── Gold rule under brand ── */}
        <div className="gold-rule" />

        {/* ── Nav groups (scrollable) ── */}
        <nav className="nav-scroll">
          {navGroups.map((group) => (
            <div key={group.title} className="nav-group">
              <p className="group-label">{group.title}</p>

              {group.items.map(({ label, path, Icon }) => {
                const active = location.pathname === path;
                return (
                  <Link
                    key={label}
                    to={path}
                    className={`nav-link${active ? " nav-link--active" : ""}`}
                  >
                    <span className="nav-icon"><Icon /></span>
                    <span className="nav-label">{label}</span>
                    {active && <span className="active-pip" aria-hidden="true" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="sidebar-footer">
          <div className="gold-rule" style={{ marginBottom: "14px" }} />
          <button className="logout-btn" onClick={handleLogout}>
            <Icons.Logout />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <style jsx>{`
        /* ── Tokens ── */
        .sidebar {
          --forest:    #14532D;
          --forest-md: #1a6b38;
          --forest-lt: #1e7d40;
          --gold:      #B8860B;
          --gold-dim:  rgba(184,134,11,0.18);
          --ink:       #241F18;
          --parchment: #FAF6EE;
          --sage:      #EEF3E7;
          --white-8:   rgba(255,255,255,0.08);
          --white-14:  rgba(255,255,255,0.14);
          --white-24:  rgba(255,255,255,0.24);
          --white-60:  rgba(255,255,255,0.60);
          --white-80:  rgba(255,255,255,0.80);

          position: fixed;
          top: 0; left: 0;
          width: 248px;
          height: 100dvh;
          background: var(--forest);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          font-family: 'Inter', system-ui, sans-serif;
          /* Subtle left-edge texture: thin espresso border */
          border-right: 1px solid rgba(0,0,0,0.18);
        }

        /* ── Brand ── */
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 22px 20px 16px;
        }
        .brand-mark {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(184,134,11,0.12);
          border: 1px solid rgba(184,134,11,0.30);
          border-radius: 6px;
          flex-shrink: 0;
        }
        .brand-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .brand-name {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 1.05rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.01em;
          line-height: 1.2;
        }
        .brand-role {
          font-size: 0.65rem;
          font-weight: 500;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--gold);
          opacity: 0.9;
        }

        /* ── Gold rule ── */
        .gold-rule {
          height: 1px;
          margin: 0 20px;
          background: linear-gradient(90deg, var(--gold) 0%, transparent 100%);
          opacity: 0.45;
        }

        /* ── Scrollable nav ── */
        .nav-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 18px 12px 8px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.12) transparent;
        }
        .nav-scroll::-webkit-scrollbar { width: 3px; }
        .nav-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 99px; }

        /* ── Group ── */
        .nav-group {
          margin-bottom: 24px;
        }
        .group-label {
          font-size: 0.625rem;
          font-weight: 600;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: var(--gold);
          opacity: 0.75;
          padding: 0 8px;
          margin: 0 0 6px;
        }

        /* ── Nav link ── */
        .nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px 9px 12px;
          border-radius: 6px;
          color: var(--white-80);
          text-decoration: none;
          font-size: 0.82rem;
          font-weight: 450;
          margin-bottom: 2px;
          transition: background 0.15s, color 0.15s;
        }
        .nav-link:hover {
          background: var(--white-14);
          color: #fff;
        }
        .nav-link--active {
          background: var(--white-8);
          color: #fff;
          font-weight: 550;
        }
        /* Left accent bar on active */
        .nav-link--active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 20%;
          bottom: 20%;
          width: 2.5px;
          border-radius: 99px;
          background: var(--gold);
        }

        .nav-icon {
          display: flex;
          align-items: center;
          opacity: 0.75;
          flex-shrink: 0;
        }
        .nav-link--active .nav-icon,
        .nav-link:hover .nav-icon {
          opacity: 1;
        }
        .nav-label {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Small active pip (right side) */
        .active-pip {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--gold);
          flex-shrink: 0;
          margin-left: auto;
        }

        /* ── Footer / logout ── */
        .sidebar-footer {
          padding: 0 12px 20px;
        }
        .logout-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.10);
          background: transparent;
          color: var(--white-60);
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          text-align: left;
        }
        .logout-btn:hover {
          background: rgba(255,255,255,0.07);
          color: #fff;
          border-color: rgba(255,255,255,0.20);
        }
      `}</style>
    </>
  );
}