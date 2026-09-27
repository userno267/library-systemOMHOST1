import { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import QRCode from "qrcode";

// ── Icons ──────────────────────────────────────────────────────────────────
const Icons = {
  User:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  QR:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/></svg>,
  Download: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Camera:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Save:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Check:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
};

// ── Avatar: fixed-size frame, never reflows regardless of load/error state ──
function Avatar({ src, name, size = 108 }) {
  const [failed, setFailed] = useState(false);
  const initials = (name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="pf-avatar-frame" style={{ width: size, height: size }}>
      {src && !failed ? (
        <img
          src={src}
          alt={name || "Profile"}
          className="pf-avatar-img"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="pf-avatar-initials" style={{ fontSize: size * 0.34 }}>{initials || <Icons.User />}</span>
      )}
    </div>
  );
}

export default function Profile() {
  const { token } = useContext(AuthContext);
  const baseURL = import.meta.env.VITE_API_URL;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [userId, setUserId] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);       // local blob preview of a newly chosen file
  const [existingImage, setExistingImage] = useState(null); // resolved URL of the saved image, or null
  const [qrDataUrl, setQrDataUrl] = useState(null);

  const fileInputRef = useRef(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  /* ===========================
     LOAD PROFILE
  =========================== */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${baseURL}/api/users/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        setUserId(data.id);
        setName(data.full_name || "");
        setPhone(data.phone || "");
        setBio(data.bio || "");

        if (data.profile_image) {
          const fullURL = data.profile_image.startsWith("http")
            ? data.profile_image
            : `${baseURL}${data.profile_image.startsWith("/") ? "" : "/"}${data.profile_image}`;
          setExistingImage(fullURL);
        } else {
          setExistingImage(null);
        }

        // Format matches existing book QR convention: "BOOK:id" → "USER:id"
        const qrText = `USER:${data.id}`;
        const dataUrl = await QRCode.toDataURL(qrText, {
          width: 220,
          margin: 2,
          color: { dark: "#14532D", light: "#ffffff" },
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error("Failed to load profile:", err);
        showToast("error", "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  /* ===========================
     UPDATE PROFILE
  =========================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("phone", phone);
    formData.append("bio", bio);
    if (image) formData.append("profile_image", image);

    try {
      const res = await fetch(`${baseURL}/api/users/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      showToast("success", "Profile updated successfully.");
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      console.error("Failed to update profile:", err);
      showToast("error", "Failed to update profile.");
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  /* ===========================
     DOWNLOAD QR
  =========================== */
  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `student-qr-${userId}.png`;
    link.click();
  };

  const avatarSrc = preview || existingImage || null;

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="pf-main pf-loading">
          <div className="pf-spinner" />
          <span>Loading profile…</span>
        </div>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <Sidebar />

      <div className="pf-main">

        {toast && (
          <div className={`pf-toast pf-toast--${toast.type}`}>
            {toast.type === "success" && <Icons.Check />}
            {toast.text}
          </div>
        )}

        {/* ── Page header ── */}
        <header className="pf-header">
          <p className="pf-eyebrow">My Account</p>
          <h1 className="pf-title">Profile</h1>
        </header>

        <div className="pf-layout">

          {/* ══════ LEFT: QR card ══════ */}
          <div className="pf-card pf-qr-card">
            <div className="pf-card-head">
              <div className="pf-card-head-icon"><Icons.QR /></div>
              <div>
                <p className="pf-card-title">My Library QR</p>
                <p className="pf-card-sub">Show this to the librarian to borrow books</p>
              </div>
            </div>
            <div className="pf-gold-rule" />

            <div className="pf-qr-body">
              {qrDataUrl && <img src={qrDataUrl} alt="Student QR Code" className="pf-qr-img" />}
              <p className="pf-qr-id">ID #{userId}</p>
              <button className="pf-qr-download-btn" onClick={handleDownloadQR}>
                <Icons.Download /> Download QR
              </button>
            </div>
          </div>

          {/* ══════ RIGHT: Edit form card ══════ */}
          <div className="pf-card">
            <div className="pf-card-head">
              <div className="pf-card-head-icon"><Icons.User /></div>
              <div>
                <p className="pf-card-title">Account Details</p>
                <p className="pf-card-sub">Update your photo and personal information</p>
              </div>
            </div>
            <div className="pf-gold-rule" />

            <form onSubmit={handleSubmit} className="pf-form">

              <div className="pf-avatar-row">
                <Avatar src={avatarSrc} name={name} size={96} />
                <div className="pf-avatar-actions">
                  <button
                    type="button"
                    className="pf-photo-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Icons.Camera /> {avatarSrc ? "Change photo" : "Add photo"}
                  </button>
                  <p className="pf-avatar-hint">JPG or PNG, square images look best.</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                </div>
              </div>

              <div className="pf-field">
                <label className="pf-label">Full Name</label>
                <input
                  className="pf-input"
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="pf-field">
                <label className="pf-label">Phone</label>
                <input
                  className="pf-input"
                  type="text"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="pf-field">
                <label className="pf-label">Bio</label>
                <textarea
                  className="pf-textarea"
                  placeholder="A short line about yourself…"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <button type="submit" className="pf-submit-btn" disabled={saving}>
                {saving ? (
                  <><div className="pf-btn-spinner" /> Saving…</>
                ) : (
                  <><Icons.Save /> Save Changes</>
                )}
              </button>
            </form>
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
          --rust:      #A13D2B;
          --parchment: #FAF6EE;
          --sage:      #EEF3E7;
          --ink:       #241F18;
          --ink-soft:  #5C5546;
          --line:      #E4DFD3;
        }

        .pf-main {
          padding: 24px 20px 100px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
          position: relative;
        }
        @media (max-width: 899px) { .pf-main { padding-top: 74px; } }

        .pf-loading {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; color: var(--ink-soft); font-size: 0.9rem;
        }
        .pf-spinner {
          width: 22px; height: 22px;
          border: 2.5px solid var(--line); border-top-color: var(--forest);
          border-radius: 50%; animation: pf-spin 0.7s linear infinite;
        }
        @keyframes pf-spin { to { transform: rotate(360deg); } }

        /* ── Toast ── */
        .pf-toast {
          position: fixed; top: 16px; right: 16px; z-index: 999;
          display: flex; align-items: center; gap: 8px;
          padding: 11px 16px; border-radius: 8px; font-size: 0.85rem;
          font-weight: 500; box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          animation: pf-slide-in 0.2s ease;
        }
        .pf-toast--success { background: var(--forest); color: white; }
        .pf-toast--error   { background: var(--rust);   color: white; }
        @keyframes pf-slide-in {
          from { transform: translateY(-12px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }

        /* ── Header ── */
        .pf-header { margin-bottom: 20px; }
        .pf-eyebrow {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .pf-title {
          font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 600;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
        }

        /* ── Layout ── */
        .pf-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          align-items: start;
        }
        @media (min-width: 760px) {
          .pf-layout { grid-template-columns: 280px 1fr; gap: 20px; }
        }

        /* ── Card ── */
        .pf-card {
          background: white; border: 1px solid var(--line);
          border-radius: 8px; overflow: hidden;
        }
        .pf-card-head {
          display: flex; align-items: center; gap: 12px; padding: 16px 20px 14px;
        }
        .pf-card-head-icon {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 6px;
          background: var(--sage); color: var(--forest); flex-shrink: 0;
        }
        .pf-card-title {
          font-family: 'Fraunces', serif; font-weight: 600;
          font-size: 0.98rem; color: var(--forest); margin: 0 0 2px;
        }
        .pf-card-sub { font-size: 0.75rem; color: var(--ink-soft); margin: 0; }
        .pf-gold-rule {
          height: 1px; margin: 0 20px;
          background: linear-gradient(90deg, var(--gold), transparent); opacity: 0.4;
        }

        /* ── QR card ── */
        .pf-qr-body {
          display: flex; flex-direction: column; align-items: center;
          padding: 20px 20px 22px; gap: 8px;
        }
        .pf-qr-img {
          width: 100%; max-width: 190px; border-radius: 6px;
          border: 1px solid var(--line); padding: 8px; background: white;
        }
        .pf-qr-id {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.76rem;
          color: var(--ink-soft); margin: 4px 0 2px;
        }
        .pf-qr-download-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--sage); color: var(--forest);
          border: 1px solid #D0CBBF; padding: 7px 14px; border-radius: 6px;
          font-size: 0.8rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: background 0.12s;
        }
        .pf-qr-download-btn:hover { background: #D4E8D4; }

        /* ── Form ── */
        .pf-form { padding: 18px 20px 22px; display: flex; flex-direction: column; gap: 16px; }

        /* Avatar — fixed frame prevents any layout jump regardless of state */
        .pf-avatar-row { display: flex; align-items: center; gap: 16px; }
        .pf-avatar-frame {
          border-radius: 50%; overflow: hidden; flex-shrink: 0;
          background: var(--sage); border: 3px solid white;
          box-shadow: 0 0 0 1px var(--line);
          display: flex; align-items: center; justify-content: center;
        }
        .pf-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .pf-avatar-initials {
          font-family: 'Fraunces', serif; font-weight: 600; color: var(--forest);
          display: flex; align-items: center; justify-content: center; line-height: 1;
        }
        .pf-avatar-actions { display: flex; flex-direction: column; gap: 6px; }
        .pf-photo-btn {
          display: inline-flex; align-items: center; gap: 6px; width: fit-content;
          padding: 7px 14px; border-radius: 6px;
          border: 1px solid var(--line); background: white;
          font-size: 0.8rem; font-weight: 600; color: var(--forest);
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: background 0.12s, border-color 0.12s;
        }
        .pf-photo-btn:hover { background: var(--sage); border-color: var(--forest); }
        .pf-avatar-hint { font-size: 0.72rem; color: var(--ink-soft); margin: 0; }

        /* Fields */
        .pf-field { display: flex; flex-direction: column; gap: 6px; }
        .pf-label {
          font-size: 0.75rem; font-weight: 600; color: var(--ink-soft);
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .pf-input, .pf-textarea {
          border: 1px solid var(--line); border-radius: 6px;
          padding: 9px 12px; font-size: 0.875rem;
          font-family: 'Inter', sans-serif; color: var(--ink);
          background: white; outline: none; width: 100%;
          box-sizing: border-box; transition: border-color 0.15s;
        }
        .pf-input:focus, .pf-textarea:focus { border-color: var(--forest); }
        .pf-input::placeholder, .pf-textarea::placeholder { color: #B0A89C; }
        .pf-textarea { min-height: 80px; resize: vertical; line-height: 1.6; }

        /* Submit */
        .pf-submit-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px; background: var(--forest);
          color: white; border: none; border-radius: 6px;
          font-size: 0.9rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: background 0.15s; margin-top: 2px;
        }
        .pf-submit-btn:hover:not(:disabled) { background: var(--forest-lt); }
        .pf-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .pf-btn-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
          border-radius: 50%; animation: pf-spin 0.7s linear infinite;
        }
      `}</style>
    </>
  );
}