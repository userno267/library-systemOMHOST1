// src/pages/admin/AdminUserDetail.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar";
import QRCode from "qrcode";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Back:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Download: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Edit:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Book:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  QR:       () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/></svg>,
};

// ── Status badge config ───────────────────────────────────────────────────────
const STATUS = {
  returned:       { cls: "badge-returned",  label: "Returned" },
  borrowed:       { cls: "badge-borrowed",  label: "Borrowed" },
  pending_borrow: { cls: "badge-pending",   label: "Pending" },
  pending_return: { cls: "badge-pending",   label: "Pending Return" },
  overdue:        { cls: "badge-overdue",   label: "Overdue" },
};

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 96 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  if (!src || imgFailed) {
    return (
      <div className="ud-avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.36 }}>
        {initials}
      </div>
    );
  }
  return (
    <img
      src={src} alt={name}
      className="ud-avatar-img"
      style={{ width: size, height: size }}
      onError={() => setImgFailed(true)}
    />
  );
}

export default function AdminUserDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const token     = localStorage.getItem("token");
  const baseURL   = import.meta.env.VITE_API_URL;

  const [user,          setUser]          = useState(null);
  const [borrowHistory, setBorrowHistory] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [preview,       setPreview]       = useState(null);
  const [qrDataUrl,     setQrDataUrl]     = useState(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        setLoading(true);
        const resUser = await fetch(`${baseURL}/api/users/admin/${id}`, {
          headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
        });
        if (!resUser.ok) throw new Error("Failed user fetch");
        const userData = await resUser.json();

        if (userData.profile_image) {
          setPreview(userData.profile_image.startsWith("http")
            ? userData.profile_image
            : encodeURI(`${baseURL}${userData.profile_image}`)
          );
        }

        const qr = await QRCode.toDataURL(`USER:${userData.id}`, {
          errorCorrectionLevel: "H", margin: 1, width: 200,
        });
        setQrDataUrl(qr);

        const resHistory = await fetch(`${baseURL}/api/borrows/history/${id}`, {
          headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
        });
        const historyData = await resHistory.json();

        setUser(userData);
        setBorrowHistory(historyData);
      } catch (err) {
        console.error(err); setUser(null); setBorrowHistory([]);
      } finally { setLoading(false); }
    };
    fetch_();
  }, [id, token, baseURL]);

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `user-qr-${user?.full_name?.replace(/\s+/g, "-") || id}.png`;
    a.click();
  };

  if (loading) return (
    <>
      <AdminSidebar />
      <div className="ud-main ud-state">
        <div className="ud-spinner" /><span>Loading profile…</span>
      </div>
    </>
  );

  if (!user) return (
    <>
      <AdminSidebar />
      <div className="ud-main ud-state"><span>User not found.</span></div>
    </>
  );

  const InfoRow = ({ label, value }) => (
    <div className="ud-info-row">
      <span className="ud-info-label">{label}</span>
      <span className="ud-info-value">{value || "—"}</span>
    </div>
  );

  return (
    <>
      <AdminSidebar />

      <div className="ud-main">

        {/* ── Breadcrumb / back ── */}
        <div className="ud-topbar">
          <button className="ud-back-btn" onClick={() => navigate(-1)}>
            <Icons.Back /> Back
          </button>
          <button className="ud-edit-btn" onClick={() => navigate(`/admin/edit-user/${user.id}`)}>
            <Icons.Edit /> Edit User
          </button>
        </div>

        {/* ── Profile card ── */}
        <div className="ud-profile-card">

          {/* Left: avatar + name */}
          <div className="ud-profile-left">
            <Avatar src={preview} name={user.full_name} size={88} />
            <div className="ud-profile-name-block">
              <h1 className="ud-profile-name">{user.full_name}</h1>
              <span className={`ud-role-chip role-${user.role}`}>{user.role}</span>
            </div>
          </div>

          {/* Center: info fields */}
          <div className="ud-profile-info">
            <div className="ud-gold-rule" style={{ marginBottom: 16 }} />
            <div className="ud-info-grid">
              <InfoRow label="Email"  value={user.email} />
              <InfoRow label="LRN"    value={user.lrn} />
              <InfoRow label="Phone"  value={user.phone} />
              <InfoRow label="Joined" value={new Date(user.created_at).toLocaleDateString()} />
              {user.bio && <InfoRow label="Bio" value={user.bio} />}
            </div>
          </div>

          {/* Right: QR code */}
          {qrDataUrl && (
            <div className="ud-qr-panel">
              <p className="ud-qr-eyebrow"><Icons.QR /> Student QR Code</p>
              <img src={qrDataUrl} alt="User QR Code" className="ud-qr-img" />
              <p className="ud-qr-hint">Scan at the QR borrow station</p>
              <button className="ud-qr-download-btn" onClick={handleDownloadQR}>
                <Icons.Download /> Download QR
              </button>
            </div>
          )}
        </div>

        {/* ── Borrow history ── */}
        <div className="ud-section-header">
          <div className="ud-section-icon"><Icons.Book /></div>
          <div>
            <p className="ud-section-eyebrow">Activity</p>
            <h2 className="ud-section-title">Borrow History</h2>
          </div>
        </div>

        {borrowHistory.length === 0 ? (
          <div className="ud-empty">
            <Icons.Book />
            <span>No borrow history found for this user.</span>
          </div>
        ) : (
          <div className="ud-table-card">
            <div className="ud-table-wrap">
              <table className="ud-table">
                <thead>
                  <tr>
                    <th>Book Title</th>
                    <th>Type</th>
                    <th>Borrowed</th>
                    <th>Due</th>
                    <th>Returned</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowHistory.map(b => {
                    const cfg = STATUS[b.status] || { cls: "badge-default", label: b.status };
                    return (
                      <tr key={b.id}>
                        <td className="ud-book-title">{b.title}</td>
                        <td><span className={`ud-type-chip type-${b.type}`}>{b.type}</span></td>
                        <td className="ud-mono">{new Date(b.borrowed_at).toLocaleDateString()}</td>
                        <td className="ud-mono">{new Date(b.due_date).toLocaleDateString()}</td>
                        <td className="ud-mono">{b.returned_at ? new Date(b.returned_at).toLocaleDateString() : "—"}</td>
                        <td><span className={`ud-badge ${cfg.cls}`}>{cfg.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
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

        .ud-main {
          margin-left: 248px; padding: 36px 40px 64px;
          background: var(--parchment); min-height: 100vh;
          font-family: 'Inter', sans-serif; color: var(--ink); box-sizing: border-box;
        }
        .ud-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 14px;
          color: var(--ink-soft); font-size: 0.9rem;
        }
        .ud-spinner {
          width: 24px; height: 24px;
          border: 2.5px solid var(--line); border-top-color: var(--forest);
          border-radius: 50%; animation: ud-spin 0.7s linear infinite;
        }
        @keyframes ud-spin { to { transform: rotate(360deg); } }

        /* ── Topbar ── */
        .ud-topbar {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 24px;
        }
        .ud-back-btn {
          display: flex; align-items: center; gap: 6px;
          background: white; border: 1px solid var(--line);
          color: var(--ink-soft); padding: 8px 14px; border-radius: 6px;
          font-size: 0.82rem; font-weight: 500; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: border-color 0.15s, color 0.15s;
        }
        .ud-back-btn:hover { border-color: var(--forest); color: var(--forest); }

        .ud-edit-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--forest); color: white; border: none;
          padding: 8px 16px; border-radius: 6px; font-size: 0.82rem;
          font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif;
          transition: background 0.15s;
        }
        .ud-edit-btn:hover { background: var(--forest-lt); }

        /* ── Profile card ── */
        .ud-profile-card {
          display: flex; gap: 0; background: white;
          border: 1px solid var(--line); border-radius: 6px;
          overflow: hidden; margin-bottom: 28px; flex-wrap: wrap;
        }

        .ud-profile-left {
          display: flex; flex-direction: column; align-items: center;
          gap: 14px; padding: 28px 24px;
          border-right: 1px solid var(--line); flex-shrink: 0;
          background: var(--sage); min-width: 160px;
        }
        .ud-avatar-img {
          border-radius: 50%; object-fit: cover;
          border: 3px solid white; box-shadow: 0 2px 12px rgba(20,83,45,0.15);
        }
        .ud-avatar-fallback {
          border-radius: 50%; background: var(--forest); color: white;
          font-family: 'Fraunces', serif; font-weight: 600;
          display: flex; align-items: center; justify-content: center;
          border: 3px solid white; box-shadow: 0 2px 12px rgba(20,83,45,0.15);
          flex-shrink: 0;
        }
        .ud-profile-name-block { text-align: center; }
        .ud-profile-name {
          font-family: 'Fraunces', serif; font-size: 1.05rem; font-weight: 600;
          color: var(--forest); margin: 0 0 6px; line-height: 1.2;
        }
        .ud-role-chip {
          display: inline-block; padding: 3px 10px; border-radius: 20px;
          font-size: 0.7rem; font-weight: 600; text-transform: capitalize;
          letter-spacing: 0.03em;
        }
        .role-student { background: white; color: var(--forest); }
        .role-admin   { background: #EDE9FE; color: #4C1D95; }

        /* Info section */
        .ud-profile-info {
          flex: 1; padding: 24px 28px; min-width: 220px;
        }
        .ud-gold-rule {
          height: 1px; background: linear-gradient(90deg, var(--gold), transparent); opacity: 0.4;
        }
        .ud-info-grid { display: flex; flex-direction: column; gap: 10px; }
        .ud-info-row {
          display: flex; gap: 12px; align-items: baseline;
          padding-bottom: 10px; border-bottom: 1px solid var(--line);
        }
        .ud-info-row:last-child { border-bottom: none; padding-bottom: 0; }
        .ud-info-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.07em;
          color: var(--ink-soft); font-weight: 600; flex-shrink: 0; min-width: 60px;
        }
        .ud-info-value { font-size: 0.875rem; color: var(--ink); }

        /* QR panel */
        .ud-qr-panel {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 24px 24px;
          border-left: 1px solid var(--line); flex-shrink: 0;
        }
        .ud-qr-eyebrow {
          display: flex; align-items: center; gap: 6px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.10em;
          color: var(--gold); font-weight: 600; margin: 0;
        }
        .ud-qr-img {
          width: 160px; height: 160px; border-radius: 6px;
          border: 1px solid var(--line); padding: 6px; background: white;
        }
        .ud-qr-hint { font-size: 0.7rem; color: var(--ink-soft); margin: 0; }
        .ud-qr-download-btn {
          display: flex; align-items: center; gap: 5px;
          background: var(--sage); border: 1px solid var(--line);
          color: var(--forest); font-size: 0.76rem; font-weight: 600;
          padding: 6px 12px; border-radius: 5px; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: background 0.12s;
        }
        .ud-qr-download-btn:hover { background: #D4E8D4; }

        /* ── Section header ── */
        .ud-section-header {
          display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
        }
        .ud-section-icon {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 6px;
          background: var(--sage); color: var(--forest); flex-shrink: 0;
        }
        .ud-section-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--gold); margin: 0 0 2px; font-weight: 600;
        }
        .ud-section-title {
          font-family: 'Fraunces', serif; font-size: 1.2rem; font-weight: 600;
          color: var(--forest); margin: 0;
        }

        /* ── Empty ── */
        .ud-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 14px; padding: 60px 0;
          color: var(--ink-soft); font-size: 0.88rem;
          background: white; border: 1px solid var(--line); border-radius: 6px;
        }
        .ud-empty svg { opacity: 0.3; }

        /* ── Table ── */
        .ud-table-card { background: white; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
        .ud-table-wrap { overflow-x: auto; }
        .ud-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .ud-table thead th {
          padding: 10px 16px; background: var(--sage);
          text-align: left; font-size: 0.7rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.07em;
          color: var(--forest); border-bottom: 1px solid var(--line); white-space: nowrap;
        }
        .ud-table tbody td {
          padding: 11px 16px; border-bottom: 1px solid var(--line); color: var(--ink);
        }
        .ud-table tbody tr:last-child td { border-bottom: none; }
        .ud-table tbody tr:hover td { background: #FDFAF5; }

        .ud-book-title { font-weight: 500; }
        .ud-mono { font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem; color: var(--ink-soft); }

        .ud-type-chip {
          display: inline-block; padding: 2px 8px; border-radius: 20px;
          font-size: 0.68rem; font-weight: 600; text-transform: capitalize;
        }
        .type-physical { background: var(--sage); color: var(--forest); }
        .type-digital  { background: #E8F0FC; color: #1D4CA0; }

        .ud-badge {
          display: inline-block; padding: 3px 10px; border-radius: 20px;
          font-size: 0.71rem; font-weight: 600; white-space: nowrap; letter-spacing: 0.02em;
        }
        .badge-returned      { background: #D1FAE5; color: #064E3B; }
        .badge-borrowed      { background: #DBEAFE; color: #1E3A8A; }
        .badge-pending       { background: #FEF3C7; color: #92400E; }
        .badge-overdue       { background: #FBDCD5; color: var(--rust); }
        .badge-default       { background: var(--sage); color: var(--ink-soft); }

        @media (max-width: 1000px) {
          .ud-main { margin-left: 0; padding: 24px 20px 48px; }
          .ud-profile-card { flex-direction: column; }
          .ud-profile-left { border-right: none; border-bottom: 1px solid var(--line); flex-direction: row; }
          .ud-qr-panel { border-left: none; border-top: 1px solid var(--line); }
        }
      `}</style>
    </>
  );
}