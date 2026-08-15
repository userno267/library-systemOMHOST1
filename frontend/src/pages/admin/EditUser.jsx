// src/pages/admin/EditUser.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Back:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Save:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Eye:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff:() => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  User:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
};

export default function EditUser() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "", lrn: "", email: "", password: "", role: "student",
  });
  const [loading,      setLoading]      = useState(false);
  const [fetching,     setFetching]     = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [toast,        setToast]        = useState(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/users/admin/${id}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "ngrok-skip-browser-warning": "true" } }
        );
        setForm({
          full_name: res.data.full_name || "",
          lrn:       res.data.lrn       || "",
          email:     res.data.email      || "",
          password:  "",
          role:      res.data.role       || "student",
        });
      } catch (err) {
        console.error(err);
        showToast("error", "Failed to load user data.");
      } finally { setFetching(false); }
    };
    fetchUser();
  }, [id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        full_name: form.full_name,
        lrn:       form.lrn,
        email:     form.email,
        role:      form.role,
      };
      if (form.password.trim()) payload.password = form.password;

      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/users/${id}`,
        payload,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      navigate("/admin/UserManagement");
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data?.message || "Failed to update user.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <AdminSidebar />

      <div className="eu-main">

        {/* Toast */}
        {toast && (
          <div className={`eu-toast eu-toast-${toast.type}`}>{toast.text}</div>
        )}

        {/* ── Page header ── */}
        <div className="eu-topbar">
          <button className="eu-back-btn" onClick={() => navigate(-1)}>
            <Icons.Back /> Back
          </button>
        </div>

        <header className="eu-header">
          <p className="eu-eyebrow">User Administration</p>
          <h1 className="eu-title">Edit User</h1>
        </header>

        {/* ── Form card ── */}
        <div className="eu-card">
          <div className="eu-card-head">
            <div className="eu-card-head-icon"><Icons.User /></div>
            <div>
              <p className="eu-card-title">
                {fetching ? "Loading…" : form.full_name || "User Profile"}
              </p>
              <p className="eu-card-sub">Update account details below</p>
            </div>
          </div>
          <div className="eu-gold-rule" />

          {fetching ? (
            <div className="eu-loading">
              <div className="eu-spinner" /><span>Loading user data…</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="eu-form">

              <div className="eu-grid-2">
                <Field label="Full Name" required>
                  <input className="eu-input" name="full_name" value={form.full_name}
                    onChange={handleChange} placeholder="Full name" required />
                </Field>
                <Field label="LRN">
                  <input className="eu-input eu-mono" name="lrn" value={form.lrn}
                    onChange={handleChange} placeholder="Learner Reference Number" />
                </Field>
              </div>

              <Field label="Email Address" required>
                <input className="eu-input" name="email" type="email" value={form.email}
                  onChange={handleChange} placeholder="user@school.edu" required />
              </Field>

              <Field label="Password">
                <div className="eu-password-wrap">
                  <input
                    className="eu-input eu-input-pw"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Leave blank to keep current password"
                  />
                  <button
                    type="button"
                    className="eu-toggle-pw"
                    onClick={() => setShowPassword(v => !v)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                  </button>
                </div>
                <p className="eu-hint">If left blank, the current password will not change.</p>
              </Field>

              <Field label="Role">
                <select className="eu-input" name="role" value={form.role} onChange={handleChange}>
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>

              <button type="submit" className="eu-submit-btn" disabled={loading}>
                {loading ? (
                  <><div className="eu-btn-spinner" /> Saving…</>
                ) : (
                  <><Icons.Save /> Save Changes</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

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

        .eu-main {
          margin-left: 248px; padding: 36px 40px 64px;
          background: var(--parchment); min-height: 100vh;
          font-family: 'Inter', sans-serif; color: var(--ink);
          box-sizing: border-box; position: relative;
        }

        /* Toast */
        .eu-toast {
          position: fixed; top: 24px; right: 24px; z-index: 999;
          padding: 12px 18px; border-radius: 8px; font-size: 0.875rem;
          font-weight: 500; box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          animation: eu-slide-in 0.2s ease;
        }
        .eu-toast-success { background: var(--forest); color: white; }
        .eu-toast-error   { background: var(--rust);   color: white; }
        @keyframes eu-slide-in {
          from { transform: translateY(-12px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }

        /* Topbar */
        .eu-topbar { margin-bottom: 20px; }
        .eu-back-btn {
          display: flex; align-items: center; gap: 6px;
          background: white; border: 1px solid var(--line);
          color: var(--ink-soft); padding: 8px 14px; border-radius: 6px;
          font-size: 0.82rem; font-weight: 500; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: border-color 0.15s, color 0.15s;
        }
        .eu-back-btn:hover { border-color: var(--forest); color: var(--forest); }

        /* Header */
        .eu-header { margin-bottom: 24px; }
        .eu-eyebrow {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .eu-title {
          font-family: 'Fraunces', serif; font-size: 2rem; font-weight: 600;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
        }

        /* Card */
        .eu-card {
          background: white; border: 1px solid var(--line);
          border-radius: 6px; overflow: hidden; max-width: 580px;
        }
        .eu-card-head {
          display: flex; align-items: center; gap: 14px; padding: 18px 22px;
        }
        .eu-card-head-icon {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 6px;
          background: var(--sage); color: var(--forest); flex-shrink: 0;
        }
        .eu-card-title {
          font-family: 'Fraunces', serif; font-weight: 600;
          font-size: 1.05rem; color: var(--forest); margin: 0 0 2px;
        }
        .eu-card-sub { font-size: 0.78rem; color: var(--ink-soft); margin: 0; }
        .eu-gold-rule {
          height: 1px; margin: 0 22px;
          background: linear-gradient(90deg, var(--gold), transparent); opacity: 0.4;
        }

        /* Loading state */
        .eu-loading {
          display: flex; align-items: center; gap: 12px;
          padding: 32px 22px; color: var(--ink-soft); font-size: 0.875rem;
        }
        .eu-spinner {
          width: 20px; height: 20px;
          border: 2.5px solid var(--line); border-top-color: var(--forest);
          border-radius: 50%; animation: eu-spin 0.7s linear infinite; flex-shrink: 0;
        }
        @keyframes eu-spin { to { transform: rotate(360deg); } }

        /* Form */
        .eu-form {
          padding: 22px 22px 26px; display: flex; flex-direction: column; gap: 16px;
        }
        .eu-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* Field */
        .eu-field { display: flex; flex-direction: column; gap: 6px; }
        .eu-label {
          font-size: 0.75rem; font-weight: 600; color: var(--ink-soft);
          text-transform: uppercase; letter-spacing: 0.07em;
        }
        .eu-label-required::after { content: ' *'; color: var(--rust); }
        .eu-hint { font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem; color: var(--ink-soft); margin: 0; }

        /* Inputs */
        .eu-input {
          border: 1px solid var(--line); border-radius: 6px;
          padding: 9px 12px; font-size: 0.875rem;
          font-family: 'Inter', sans-serif; color: var(--ink);
          background: white; outline: none; width: 100%;
          box-sizing: border-box; transition: border-color 0.15s;
        }
        .eu-input:focus { border-color: var(--forest); }
        .eu-input::placeholder { color: #B0A89C; }
        .eu-mono { font-family: 'IBM Plex Mono', monospace; }

        /* Password */
        .eu-password-wrap { position: relative; display: flex; align-items: center; }
        .eu-input-pw { padding-right: 40px; }
        .eu-toggle-pw {
          position: absolute; right: 10px;
          background: none; border: none; cursor: pointer;
          color: var(--ink-soft); display: flex; align-items: center; padding: 4px;
          transition: color 0.12s;
        }
        .eu-toggle-pw:hover { color: var(--forest); }

        /* Submit */
        .eu-submit-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 12px; background: var(--forest);
          color: white; border: none; border-radius: 6px;
          font-size: 0.9rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: background 0.15s; margin-top: 4px;
        }
        .eu-submit-btn:hover:not(:disabled) { background: var(--forest-lt); }
        .eu-submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .eu-btn-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
          border-radius: 50%; animation: eu-spin 0.7s linear infinite;
        }

        @media (max-width: 1000px) {
          .eu-main { margin-left: 0; padding: 24px 20px 48px; }
          .eu-card { max-width: 100%; }
          .eu-grid-2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="eu-field">
      <label className={`eu-label ${required ? "eu-label-required" : ""}`}>{label}</label>
      {children}
    </div>
  );
}