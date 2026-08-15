// src/pages/admin/AddUser.jsx
import { useState } from "react";
import axios from "axios";
import AdminSidebar from "../../components/AdminSidebar";

const Icons = {
  Back:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Plus:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Eye:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  User:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Check:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
};

const EMPTY_FORM = { full_name: "", lrn: "", email: "", password: "", role: "student" };

export default function AddUser() {
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toast,        setToast]        = useState(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/users`,
        form,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      showToast("success", "User created successfully.");
      setForm(EMPTY_FORM);
      setShowPassword(false);
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data?.message || "Failed to add user.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <AdminSidebar />

      <div className="au-main">

        {toast && (
          <div className={`au-toast au-toast-${toast.type}`}>
            {toast.type === "success" && <Icons.Check />}
            {toast.text}
          </div>
        )}

        <header className="au-header">
          <p className="au-eyebrow">User Administration</p>
          <h1 className="au-title">Add User</h1>
        </header>

        <div className="au-card">
          <div className="au-card-head">
            <div className="au-card-head-icon"><Icons.User /></div>
            <div>
              <p className="au-card-title">New Account</p>
              <p className="au-card-sub">Fill in the details to create a new user account</p>
            </div>
          </div>
          <div className="au-gold-rule" />

          <form onSubmit={handleSubmit} className="au-form">

            <div className="au-grid-2">
              <Field label="Full Name" required>
                <input className="au-input" name="full_name" value={form.full_name}
                  onChange={handleChange} placeholder="e.g. Juan dela Cruz" required />
              </Field>
              <Field label="LRN">
                <input className="au-input au-mono" name="lrn" value={form.lrn}
                  onChange={handleChange} placeholder="Learner Reference Number" />
              </Field>
            </div>

            <Field label="Email Address" required>
              <input className="au-input" name="email" type="email" value={form.email}
                onChange={handleChange} placeholder="student@school.edu" required />
            </Field>

            <Field label="Password" required>
              <div className="au-password-wrap">
                <input
                  className="au-input au-input-pw"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters recommended"
                  required
                />
                <button
                  type="button"
                  className="au-toggle-pw"
                  onClick={() => setShowPassword(v => !v)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                </button>
              </div>
              <p className="au-hint">Use a strong password with at least 6 characters.</p>
            </Field>

            <Field label="Role">
              <select className="au-input" name="role" value={form.role} onChange={handleChange}>
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
            </Field>

            <button type="submit" className="au-submit-btn" disabled={loading}>
              {loading ? (
                <><div className="au-btn-spinner" /> Creating user…</>
              ) : (
                <><Icons.Plus /> Create User</>
              )}
            </button>

          </form>
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

        .au-main {
          margin-left: 248px; padding: 36px 40px 64px;
          background: var(--parchment); min-height: 100vh;
          font-family: 'Inter', sans-serif; color: var(--ink);
          box-sizing: border-box; position: relative;
        }

        /* Toast */
        .au-toast {
          position: fixed; top: 24px; right: 24px; z-index: 999;
          display: flex; align-items: center; gap: 8px;
          padding: 12px 18px; border-radius: 8px; font-size: 0.875rem;
          font-weight: 500; box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          animation: au-slide-in 0.2s ease;
        }
        .au-toast-success { background: var(--forest); color: white; }
        .au-toast-error   { background: var(--rust);   color: white; }
        @keyframes au-slide-in {
          from { transform: translateY(-12px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }

        /* Header */
        .au-header { margin-bottom: 24px; }
        .au-eyebrow {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .au-title {
          font-family: 'Fraunces', serif; font-size: 2rem; font-weight: 600;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
        }

        /* Card */
        .au-card {
          background: white; border: 1px solid var(--line);
          border-radius: 6px; overflow: hidden; max-width: 580px;
        }
        .au-card-head {
          display: flex; align-items: center; gap: 14px; padding: 18px 22px;
        }
        .au-card-head-icon {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 6px;
          background: var(--sage); color: var(--forest); flex-shrink: 0;
        }
        .au-card-title {
          font-family: 'Fraunces', serif; font-weight: 600;
          font-size: 1.05rem; color: var(--forest); margin: 0 0 2px;
        }
        .au-card-sub { font-size: 0.78rem; color: var(--ink-soft); margin: 0; }

        .au-gold-rule {
          height: 1px; margin: 0 22px;
          background: linear-gradient(90deg, var(--gold), transparent); opacity: 0.4;
        }

        /* Form */
        .au-form {
          padding: 22px 22px 26px; display: flex; flex-direction: column; gap: 16px;
        }
        .au-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* Field */
        .au-field { display: flex; flex-direction: column; gap: 6px; }
        .au-label {
          font-size: 0.75rem; font-weight: 600; color: var(--ink-soft);
          text-transform: uppercase; letter-spacing: 0.07em;
        }
        .au-label-required::after { content: ' *'; color: var(--rust); }
        .au-hint {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; color: var(--ink-soft); margin: 0;
        }

        /* Inputs */
        .au-input {
          border: 1px solid var(--line); border-radius: 6px;
          padding: 9px 12px; font-size: 0.875rem;
          font-family: 'Inter', sans-serif; color: var(--ink);
          background: white; outline: none; width: 100%;
          box-sizing: border-box; transition: border-color 0.15s;
        }
        .au-input:focus { border-color: var(--forest); }
        .au-input::placeholder { color: #B0A89C; }
        .au-mono { font-family: 'IBM Plex Mono', monospace; }

        /* Password */
        .au-password-wrap { position: relative; display: flex; align-items: center; }
        .au-input-pw { padding-right: 40px; }
        .au-toggle-pw {
          position: absolute; right: 10px;
          background: none; border: none; cursor: pointer;
          color: var(--ink-soft); display: flex; align-items: center; padding: 4px;
          transition: color 0.12s;
        }
        .au-toggle-pw:hover { color: var(--forest); }

        /* Submit */
        .au-submit-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 12px; background: var(--forest);
          color: white; border: none; border-radius: 6px;
          font-size: 0.9rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; transition: background 0.15s; margin-top: 4px;
        }
        .au-submit-btn:hover:not(:disabled) { background: var(--forest-lt); }
        .au-submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .au-btn-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
          border-radius: 50%; animation: au-spin 0.7s linear infinite;
        }
        @keyframes au-spin { to { transform: rotate(360deg); } }

        @media (max-width: 1000px) {
          .au-main { margin-left: 0; padding: 24px 20px 48px; }
          .au-card { max-width: 100%; }
          .au-grid-2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="au-field">
      <label className={`au-label ${required ? "au-label-required" : ""}`}>{label}</label>
      {children}
    </div>
  );
}