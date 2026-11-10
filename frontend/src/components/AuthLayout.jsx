// src/components/AuthLayout.jsx
const LOGO = "/278737963_102029019168954_7338134888722766049_n.jpg";

export function Field({ label, hint, children }) {
  return (
    <div className="al-field">
      <label className="al-label">{label}</label>
      {children}
      {hint && <span className="al-hint">{hint}</span>}
    </div>
  );
}

export default function AuthLayout({ eyebrow, title, subtitle, children, footer }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap"
        rel="stylesheet"
      />

      <div className="al-shell">
        {/* ── Brand panel (desktop) ── */}
        <aside className="al-brand">
          <div className="al-brand-inner">
            <img src={LOGO} alt="School logo" className="al-logo" />

            <div className="al-brand-mark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span>LIBROTECH</span>
            </div>

            <div className="al-gold-rule" />

            <h1 className="al-school">Oriental Mindoro National High School</h1>
            <p className="al-tag">Library Management System</p>
          </div>

          <p className="al-foot">OMNHS Library</p>
        </aside>

        {/* ── Form panel ── */}
        <main className="al-main">
          <div className="al-card">
            <div className="al-mobile-brand">
              <img src={LOGO} alt="" />
              <span>LIBROTECH</span>
            </div>

            <p className="al-eyebrow">{eyebrow}</p>
            <h2 className="al-title">{title}</h2>
            <p className="al-subtitle">{subtitle}</p>

            {children}

            {footer && <div className="al-footer">{footer}</div>}
          </div>
        </main>
      </div>

      <style>{`
        :root {
          --forest:    #14532D;
          --forest-lt: #3E7A4D;
          --gold:      #B8860B;
          --parchment: #FAF6EE;
          --sage:      #EEF3E7;
          --ink:       #241F18;
          --ink-soft:  #5C5546;
          --line:      #E4DFD3;
          --rust:      #A13D2B;
        }

        .al-shell {
          display: flex;
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          background: var(--parchment);
        }

        /* ── Brand panel ── */
        .al-brand {
          flex: 0 0 45%;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          color: #fff;
          background:
            radial-gradient(rgba(184,134,11,0.14) 1px, transparent 1px) 0 0 / 22px 22px,
            linear-gradient(160deg, #1a6338 0%, #14532D 100%);
          overflow: hidden;
        }
        .al-brand-inner {
          margin: auto;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          text-align: center;
        }
        .al-logo {
          width: 96px;
          height: 96px;
          object-fit: contain;
          border-radius: 50%;
          background: #fff;
          padding: 6px;
          border: 2px solid rgba(184,134,11,0.6);
        }
        .al-brand-mark {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Fraunces', serif;
          font-weight: 700;
          font-size: 1.1rem;
          letter-spacing: 0.12em;
        }
        .al-gold-rule {
          width: 120px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #B8860B, transparent);
        }
        .al-school {
          font-family: 'Fraunces', serif;
          font-size: 1.6rem;
          font-weight: 600;
          line-height: 1.25;
          margin: 0;
        }
        .al-tag {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--gold);
          margin: 0;
        }
        .al-foot {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.55);
          text-align: center;
          margin: 0;
        }

        /* ── Form panel ── */
        .al-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
        }
        .al-card {
          width: 100%;
          max-width: 400px;
          background: #fff;
          border: 1px solid var(--line);
          border-top: 3px solid var(--gold);
          border-radius: 10px;
          padding: 36px 32px;
          box-shadow: 0 12px 32px rgba(36,31,24,0.08);
        }
        .al-mobile-brand { display: none; }

        .al-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--gold);
          font-weight: 600;
          margin: 0 0 6px;
        }
        .al-title {
          font-family: 'Fraunces', serif;
          font-size: 1.6rem;
          font-weight: 600;
          color: var(--forest);
          margin: 0 0 6px;
          letter-spacing: -0.01em;
        }
        .al-subtitle {
          font-size: 0.86rem;
          color: var(--ink-soft);
          margin: 0 0 24px;
          line-height: 1.5;
        }

        /* ── Form controls ── */
        .al-form { display: flex; flex-direction: column; gap: 16px; }
        .al-field { display: flex; flex-direction: column; gap: 6px; }
        .al-label {
          font-size: 0.73rem;
          font-weight: 600;
          color: var(--ink-soft);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .al-hint {
          font-size: 0.72rem;
          color: var(--ink-soft);
          line-height: 1.4;
        }
        .al-input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid var(--line);
          border-radius: 6px;
          padding: 11px 12px;
          font-size: 0.9rem;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          background: #fff;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .al-input::placeholder { color: #B0A89C; }
        .al-input:focus {
          border-color: var(--forest);
          box-shadow: 0 0 0 3px rgba(20,83,45,0.12);
        }

        .al-check {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: var(--ink-soft);
          cursor: pointer;
          margin-top: -4px;
        }
        .al-check input { accent-color: var(--forest); cursor: pointer; }

        .al-btn {
          width: 100%;
          padding: 12px;
          margin-top: 4px;
          background: var(--forest);
          color: #fff;
          border: none;
          border-radius: 6px;
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .al-btn:hover:not(:disabled) { background: var(--forest-lt); }
        .al-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .al-footer {
          margin-top: 22px;
          text-align: center;
          font-size: 0.85rem;
          color: var(--ink-soft);
        }
        .al-footer a {
          color: var(--forest);
          font-weight: 600;
          text-decoration: none;
        }
        .al-footer a:hover { text-decoration: underline; }

        /* ── Mobile ── */
        @media (max-width: 860px) {
          .al-shell { flex-direction: column; }
          .al-brand { display: none; }
          .al-mobile-brand {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 18px;
            font-family: 'Fraunces', serif;
            font-weight: 700;
            letter-spacing: 0.12em;
            color: var(--forest);
          }
          .al-mobile-brand img {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            object-fit: contain;
          }
          .al-main { padding: 28px 16px 40px; align-items: flex-start; }
          .al-card { padding: 28px 22px; }
        }
      `}</style>
    </>
  );
}