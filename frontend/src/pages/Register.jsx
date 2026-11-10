// src/pages/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const LOGO = "/278737963_102029019168954_7338134888722766049_n.jpg";
const PHONE_PATTERN = /^[0-9+\-\s]{7,15}$/;

function BrandMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    lrn: "",
    email: "",
    phone: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const validate = (data) => {
    if (data.password.length < 6) {
      return "Password must be at least 6 characters.";
    }
    if (!PHONE_PATTERN.test(data.phone)) {
      return "Enter a valid phone number (7 to 15 digits).";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Trim whitespace so stray spaces don't end up in the database.
    const cleaned = {
      full_name: form.full_name.trim(),
      lrn: form.lrn.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      password: form.password,
    };

    const problem = validate(cleaned);
    if (problem) {
      alert(problem);
      return;
    }

    setSubmitting(true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleaned),
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Registration failed");
        return;
      }

      navigate(`/verify-email?email=${encodeURIComponent(cleaned.email)}`);
    } catch (err) {
      console.error(err);
      alert(
        err.name === "AbortError"
          ? "The connection is too slow. Please try again."
          : "Could not reach the server. Check your connection and try again."
      );
    } finally {
      clearTimeout(timer);
      setSubmitting(false);
    }
  };

  return (
    <div className="au-shell">

      {/* ── Brand panel (desktop) ── */}
      <aside className="au-brand-panel">
        <img src={LOGO} alt="School logo" className="au-brand-logo" />
        <p className="au-brand-eyebrow">Oriental Mindoro National High School</p>
        <h1 className="au-brand-name">LIBROTECH</h1>
        <p className="au-brand-tag">Library Management System</p>
      </aside>

      {/* ── Form panel ── */}
      <main className="au-form-panel">
        <div className="au-card">

          <div className="au-card-top">
            <div className="au-mobile-brand">
              <BrandMark />
              <span>LIBROTECH</span>
            </div>
            <p className="au-eyebrow">Get started</p>
            <h2 className="au-title">Create your account</h2>
            <p className="au-sub">Use your full name and LRN or employee number.</p>
          </div>

          <div className="au-gold-rule" />

          <form className="au-body" onSubmit={handleSubmit}>
            <div className="au-field">
              <label className="au-label" htmlFor="full_name">Full name</label>
              <input
                id="full_name"
                className="au-input"
                type="text"
                name="full_name"
                autoComplete="name"
                placeholder="e.g. Juan dela Cruz"
                value={form.full_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="au-field">
              <label className="au-label" htmlFor="lrn">LRN or Employee Number</label>
              <input
                id="lrn"
                className="au-input"
                type="text"
                name="lrn"
                inputMode="numeric"
                placeholder="Student LRN or staff employee no."
                value={form.lrn}
                onChange={handleChange}
                required
              />
              <span className="au-hint">Students use their LRN. Staff use their employee number.</span>
            </div>

            <div className="au-field">
              <label className="au-label" htmlFor="email">Email</label>
              <input
                id="email"
                className="au-input"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="au-field">
              <label className="au-label" htmlFor="phone">Phone number</label>
              <input
                id="phone"
                className="au-input"
                type="tel"
                name="phone"
                autoComplete="tel"
                placeholder="e.g. 09171234567"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="au-field">
              <label className="au-label" htmlFor="password">Password</label>
              <div className="au-pw-wrap">
                <input
                  id="password"
                  className="au-input au-input-pw"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="au-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" className="au-submit" disabled={submitting}>
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="au-footer">
            Already have an account? <Link to="/">Sign in</Link>
          </p>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

        :root {
          --forest:    #14532D;
          --forest-lt: #3E7A4D;
          --gold:      #B8860B;
          --parchment: #FAF6EE;
          --sage:      #EEF3E7;
          --ink:       #241F18;
          --ink-soft:  #5C5546;
          --line:      #E4DFD3;
        }

        .au-shell {
          display: flex;
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          background: var(--parchment);
        }

        /* ── Brand panel ── */
        .au-brand-panel {
          flex: 1;
          background: linear-gradient(160deg, #1a6338 0%, #14532D 100%);
          color: white;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 48px; text-align: center;
        }
        .au-brand-logo {
          width: 96px; height: 96px; border-radius: 50%;
          object-fit: cover; border: 3px solid rgba(184,134,11,0.6);
          margin-bottom: 22px;
        }
        .au-brand-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          margin: 0 0 14px; font-weight: 600;
        }
        .au-brand-name {
          font-family: 'Fraunces', serif; font-size: 2.6rem; font-weight: 700;
          letter-spacing: 0.02em; margin: 0 0 6px;
        }
        .au-brand-tag { font-size: 0.95rem; opacity: 0.85; margin: 0; }

        /* ── Form panel ── */
        .au-form-panel {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          padding: 40px 20px;
        }
        .au-card {
          background: white; border: 1px solid var(--line);
          border-radius: 8px; width: 100%; max-width: 420px;
          overflow: hidden; box-shadow: 0 8px 28px rgba(36,31,24,0.08);
        }
        .au-card-top { padding: 26px 26px 18px; }
        .au-mobile-brand {
          display: none; align-items: center; gap: 8px; margin-bottom: 14px;
          font-family: 'Fraunces', serif; font-weight: 700; color: var(--forest);
        }
        .au-eyebrow {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.66rem;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold);
          margin: 0 0 6px; font-weight: 600;
        }
        .au-title {
          font-family: 'Fraunces', serif; font-size: 1.6rem; font-weight: 600;
          color: var(--forest); margin: 0 0 6px; letter-spacing: -0.01em;
        }
        .au-sub { font-size: 0.85rem; color: var(--ink-soft); margin: 0; line-height: 1.5; }
        .au-gold-rule {
          height: 1px; margin: 0 26px;
          background: linear-gradient(90deg, var(--gold), transparent); opacity: 0.4;
        }

        /* ── Fields ── */
        .au-body { padding: 22px 26px 26px; display: flex; flex-direction: column; gap: 16px; }
        .au-field { display: flex; flex-direction: column; gap: 6px; }
        .au-label {
          font-size: 0.72rem; font-weight: 600; color: var(--ink-soft);
          text-transform: uppercase; letter-spacing: 0.07em;
        }
        .au-hint { font-size: 0.74rem; color: var(--ink-soft); line-height: 1.4; }
        .au-input {
          width: 100%; box-sizing: border-box;
          border: 1px solid var(--line); border-radius: 6px;
          padding: 11px 12px;
          font-size: 16px; /* 16px stops iPhone zoom-on-focus */
          font-family: 'Inter', sans-serif; color: var(--ink);
          background: white; outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .au-input:focus { border-color: var(--forest); box-shadow: 0 0 0 3px rgba(20,83,45,0.12); }
        .au-input::placeholder { color: #B0A89C; }
        .au-pw-wrap { position: relative; display: flex; align-items: center; }
        .au-input-pw { padding-right: 60px; }
        .au-toggle {
          position: absolute; right: 8px;
          width: auto; padding: 4px 8px; border: none; border-radius: 4px;
          background: transparent; color: var(--forest);
          font-family: 'Inter', sans-serif; font-size: 0.78rem; font-weight: 600;
          cursor: pointer;
        }
        .au-toggle:hover { background: var(--sage); }

        /* ── Submit / footer ── */
        .au-submit {
          width: 100%; padding: 12px; margin-top: 4px;
          background: var(--forest); color: white;
          border: none; border-radius: 6px;
          font-family: 'Inter', sans-serif; font-size: 0.92rem; font-weight: 600;
          cursor: pointer; transition: background 0.15s;
        }
        .au-submit:hover:not(:disabled) { background: var(--forest-lt); }
        .au-submit:disabled { opacity: 0.55; cursor: not-allowed; }
        .au-footer {
          text-align: center; font-size: 0.85rem; color: var(--ink-soft);
          margin: 0; padding: 0 26px 24px;
        }
        .au-footer a { color: var(--forest); font-weight: 600; text-decoration: none; }
        .au-footer a:hover { text-decoration: underline; }

        /* ── Mobile ── */
        @media (max-width: 899px) {
          .au-shell { flex-direction: column; }
          .au-brand-panel { display: none; }
          .au-form-panel { align-items: flex-start; padding: 32px 16px; }
          .au-mobile-brand { display: flex; }
        }
      `}</style>
    </div>
  );
}