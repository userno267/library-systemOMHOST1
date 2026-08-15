// src/pages/admin/AdminFineManagement.jsx
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar";

const PAGE_SIZE = 8;

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Back:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Fine:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Plus:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Search:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Check:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Waive:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  PayAll:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  ChevL:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevR:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  X:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  History: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>,
  User:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
};

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="fm-field">
      <label className="fm-label">{label}</label>
      {children}
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function Card({ icon, title, subtitle, children, className = "" }) {
  return (
    <div className={`fm-card ${className}`}>
      <div className="fm-card-head">
        <div className="fm-card-icon">{icon}</div>
        <div>
          <p className="fm-card-title">{title}</p>
          {subtitle && <p className="fm-card-sub">{subtitle}</p>}
        </div>
      </div>
      <div className="fm-gold-rule" />
      <div className="fm-card-body">{children}</div>
    </div>
  );
}

export default function AdminFineManagement() {
  const { userId } = useParams();
  const navigate   = useNavigate();
  const token      = localStorage.getItem("token");
  const baseURL    = import.meta.env.VITE_API_URL;

  const [user, setUser]           = useState(null);
  const [fines, setFines]         = useState([]);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [borrows, setBorrows]     = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [form, setForm] = useState({ fine_type: "lost", amount: "", notes: "", borrow_id: "" });
  const [submitting, setSubmitting] = useState(false);

  const [payAllModal, setPayAllModal] = useState(false);
  const [payAllAmount, setPayAllAmount] = useState("");

  const headers = { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [userRes, finesRes, borrowsRes] = await Promise.all([
        fetch(`${baseURL}/api/users/admin/${userId}`, { headers }),
        fetch(`${baseURL}/api/fines/user/${userId}`, { headers }),
        fetch(`${baseURL}/api/borrows/history/${userId}`, { headers }),
      ]);
      const userData    = await userRes.json();
      const finesData   = await finesRes.json();
      const borrowsData = await borrowsRes.json();
      setUser(userData);
      setFines(finesData.fines || []);
      setTotalUnpaid(finesData.totalUnpaid || 0);
      setBorrows(Array.isArray(borrowsData) ? borrowsData : []);
    } catch (err) {
      console.error("fetchAll ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [userId]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const handlePay = async (fineId, amountPaid) => {
    try {
      const res = await fetch(`${baseURL}/api/fines/${fineId}/pay`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ amountPaid }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Status ${res.status}`);
      }
      await fetchAll();
      setTimeout(() => window.open(`/receipt/${fineId}`, "_blank"), 500);
    } catch (err) {
      alert(`Failed to process payment: ${err.message}`);
    }
  };

  const openPayAllModal = () => {
    const unpaid = fines.filter(f => f.status === "unpaid");
    if (!unpaid.length) return;
    setPayAllAmount(unpaid.reduce((s, f) => s + Number(f.amount), 0).toFixed(2));
    setPayAllModal(true);
  };

  const confirmPayAll = async () => {
    const unpaid  = fines.filter(f => f.status === "unpaid");
    const fineIds = unpaid.map(f => f.id);
    const amount  = Number(payAllAmount);
    if (!amount || amount <= 0) return alert("Enter a valid amount");
    setSubmitting(true);
    try {
      const res = await fetch(`${baseURL}/api/fines/pay-multiple`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ fineIds, amountPaid: amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      setPayAllModal(false);
      await fetchAll();
      setTimeout(() => window.open(`/receipt/group/${data.groupId}`, "_blank"), 500);
    } catch (err) {
      alert(`Failed to pay all fines: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWaive = async (fineId) => {
    if (!confirm("Waive this fine?")) return;
    try {
      const res = await fetch(`${baseURL}/api/fines/${fineId}/waive`, { method: "POST", headers });
      if (!res.ok) throw new Error();
      await fetchAll();
      window.open(`/receipt/${fineId}`, "_blank");
    } catch {
      alert("Failed to waive fine");
    }
  };

  const handleAddFine = async (e) => {
    e.preventDefault();
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      return alert("Please enter a valid amount");
    setSubmitting(true);
    try {
      const res = await fetch(`${baseURL}/api/fines/user/${userId}/add`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          fine_type: form.fine_type,
          amount: Number(form.amount),
          notes: form.notes || null,
          borrow_id: form.borrow_id || null,
        }),
      });
      if (!res.ok) throw new Error();
      setForm({ fine_type: "lost", amount: "", notes: "", borrow_id: "" });
      fetchAll();
    } catch {
      alert("Failed to add fine");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Search + pagination ───────────────────────────────────────────────────
  const filteredFines = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return fines;
    return fines.filter(f =>
      String(f.id).includes(term) || (f.book_title || "").toLowerCase().includes(term)
    );
  }, [fines, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredFines.length / PAGE_SIZE));
  const paginatedFines = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredFines.slice(start, start + PAGE_SIZE);
  }, [filteredFines, currentPage]);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // ── Initials avatar ───────────────────────────────────────────────────────
  const initials = user?.full_name
    ? user.full_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  if (loading) return (
    <>
      <AdminSidebar />
      <div className="fm-main fm-loading">
        <div className="fm-spinner" /><span>Loading fines…</span>
      </div>
    </>
  );

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      <AdminSidebar />

      <div className="fm-main">

        {/* ── Page header ── */}
        <header className="fm-header">
          <div>
            <p className="fm-eyebrow">Fine Management</p>
            <h1 className="fm-title">Student Fines</h1>
          </div>
          <button className="fm-btn-ghost" onClick={() => navigate(-1)}>
            <Icons.Back /> Back
          </button>
        </header>

        {/* ── User identity + unpaid summary ── */}
        <div className="fm-user-banner">
          <div className="fm-user-left">
            <div className="fm-avatar">{initials}</div>
            <div>
              <p className="fm-user-name">{user?.full_name}</p>
              <p className="fm-user-meta fm-mono">
                LRN: {user?.lrn} &nbsp;·&nbsp; {user?.email}
              </p>
            </div>
          </div>
          <div className="fm-unpaid-right">
            <span className="fm-unpaid-label">Total Unpaid</span>
            <strong className={`fm-unpaid-amount ${totalUnpaid > 0 ? "fm-unpaid-amount--has" : "fm-unpaid-amount--clear"}`}>
              ₱{Number(totalUnpaid).toFixed(2)}
            </strong>
            {totalUnpaid > 0 && (
              <button className="fm-btn-primary" onClick={openPayAllModal} disabled={submitting}>
                <Icons.PayAll /> Pay All
              </button>
            )}
          </div>
        </div>

        {/* ── KPI strip ── */}
        <div className="fm-kpi-strip">
          {[
            { label: "Total Fines",  value: fines.length,                                          accent: "var(--ink)" },
            { label: "Unpaid",       value: fines.filter(f => f.status === "unpaid").length,       accent: "var(--rust)" },
            { label: "Paid",         value: fines.filter(f => f.status === "paid").length,         accent: "var(--forest)" },
            { label: "Waived",       value: fines.filter(f => f.status === "waived").length,       accent: "var(--gold)" },
          ].map(({ label, value, accent }) => (
            <div className="fm-kpi" key={label} style={{ borderLeftColor: accent }}>
              <span className="fm-kpi-label">{label}</span>
              <strong className="fm-kpi-value">{value}</strong>
            </div>
          ))}
        </div>

        {/* ── Add manual fine ── */}
        <Card icon={<Icons.Fine />} title="Add Manual Charge" subtitle="Manually assign a fine to this student">
          <form onSubmit={handleAddFine} className="fm-form">
            <div className="fm-form-row">
              <Field label="Fine Type">
                <select className="fm-input" value={form.fine_type} onChange={e => setForm({ ...form, fine_type: e.target.value })}>
                  <option value="lost">Lost Book</option>
                  <option value="damaged">Damaged Book</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Amount (₱)">
                <input className="fm-input fm-mono" type="number" min="1" step="0.01" placeholder="0.00"
                  value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </Field>
              <Field label="Linked Borrow (optional)">
                <select className="fm-input" value={form.borrow_id} onChange={e => setForm({ ...form, borrow_id: e.target.value })}>
                  <option value="">— None —</option>
                  {borrows.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({new Date(b.borrowed_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Notes / Reason">
              <input className="fm-input" type="text" placeholder="e.g. Cover torn, pages missing…"
                value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <button type="submit" className="fm-btn-primary fm-submit-btn" disabled={submitting}>
              {submitting
                ? <><div className="fm-spinner fm-spinner--sm" /> Adding…</>
                : <><Icons.Plus /> Add Charge</>}
            </button>
          </form>
        </Card>

        {/* ── Fine history table ── */}
        <Card icon={<Icons.History />} title="Fine History" subtitle={`${filteredFines.length} record${filteredFines.length !== 1 ? "s" : ""}`}>
          {/* Search */}
          <div className="fm-table-controls">
            <div className="fm-search-wrap">
              <Icons.Search />
              <input
                className="fm-search"
                type="text"
                placeholder="Search by ID or book title…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredFines.length === 0 ? (
            <div className="fm-empty">No fines match your search.</div>
          ) : (
            <>
              <div className="fm-table-scroll">
                <table className="fm-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Type</th>
                      <th>Book</th>
                      <th>Amount</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Paid At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFines.map(fine => (
                      <tr
                        key={fine.id}
                        className="fm-row"
                        onClick={() => window.open(
                          fine.payment_group_id
                            ? `/receipt/group/${fine.payment_group_id}`
                            : `/receipt/${fine.id}`,
                          "_blank"
                        )}
                      >
                        <td><span className="fm-mono fm-id">#{fine.id}</span></td>
                        <td><span className="fm-chip fm-chip--type">{fine.fine_type}</span></td>
                        <td className="fm-book-cell">{fine.book_title || "—"}</td>
                        <td><span className="fm-mono fm-amount">₱{Number(fine.amount).toFixed(2)}</span></td>
                        <td className="fm-notes-cell">{fine.notes || "—"}</td>
                        <td>
                          <span className={`fm-chip fm-chip--${fine.status}`}>{fine.status}</span>
                        </td>
                        <td className="fm-mono fm-date">{new Date(fine.created_at).toLocaleDateString()}</td>
                        <td className="fm-mono fm-date">
                          {fine.paid_at ? new Date(fine.paid_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="fm-actions-cell" onClick={e => e.stopPropagation()}>
                          {fine.status === "unpaid" ? (
                            <div className="fm-action-group">
                              <button
                                className="fm-action-btn fm-action-btn--pay"
                                title="Mark as paid"
                                onClick={() => {
                                  const amt = prompt(`Fine: ₱${fine.amount}\nEnter amount paid:`, fine.amount);
                                  if (amt && !isNaN(amt)) handlePay(fine.id, Number(amt));
                                }}
                              >
                                <Icons.Check /> Pay
                              </button>
                              <button
                                className="fm-action-btn fm-action-btn--waive"
                                title="Waive fine"
                                onClick={() => handleWaive(fine.id)}
                              >
                                <Icons.Waive /> Waive
                              </button>
                            </div>
                          ) : (
                            <span className="fm-resolved">Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="fm-pagination">
                <button className="fm-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  <Icons.ChevL />
                </button>
                <span className="fm-page-info fm-mono">
                  {currentPage} / {totalPages}
                </span>
                <button className="fm-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  <Icons.ChevR />
                </button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ── Pay All Modal ── */}
      {payAllModal && (
        <div className="fm-modal-backdrop" onClick={() => setPayAllModal(false)}>
          <div className="fm-modal" onClick={e => e.stopPropagation()}>
            <div className="fm-modal-header">
              <div>
                <p className="fm-eyebrow" style={{ margin: 0 }}>Payment</p>
                <h3 className="fm-modal-title">Pay All Unpaid Fines</h3>
              </div>
              <button className="fm-modal-close" onClick={() => setPayAllModal(false)}>
                <Icons.X />
              </button>
            </div>
            <div className="fm-gold-rule" style={{ margin: "0 0 16px" }} />

            <p className="fm-modal-due">
              Total due:&nbsp;
              <strong className="fm-mono">
                ₱{fines.filter(f => f.status === "unpaid").reduce((s, f) => s + Number(f.amount), 0).toFixed(2)}
              </strong>
            </p>

            <Field label="Amount Paid (₱)">
              <input
                className="fm-input fm-mono"
                type="number" min="0" step="0.01"
                value={payAllAmount}
                onChange={e => setPayAllAmount(e.target.value)}
                autoFocus
              />
            </Field>

            <div className="fm-modal-actions">
              <button className="fm-btn-primary" onClick={confirmPayAll} disabled={submitting}>
                {submitting
                  ? <><div className="fm-spinner fm-spinner--sm" /> Processing…</>
                  : <><Icons.Check /> Confirm Payment</>}
              </button>
              <button className="fm-btn-ghost" onClick={() => setPayAllModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        :root {
          --forest:    #14532D;
          --forest-lt: #3E7A4D;
          --gold:      #B8860B;
          --espresso:  #5C3D2E;
          --parchment: #FAF6EE;
          --sage:      #EEF3E7;
          --ink:       #241F18;
          --ink-soft:  #5C5546;
          --line:      #E4DFD3;
          --rust:      #9B2335;
        }

        /* ── Shell ── */
        .fm-main {
          margin-left: 248px; padding: 36px 40px 64px;
          background: var(--parchment); min-height: 100vh;
          font-family: 'Inter', sans-serif; color: var(--ink);
          box-sizing: border-box;
        }
        .fm-loading {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; color: var(--ink-soft); font-size: 0.9rem;
        }

        /* ── Spinner ── */
        .fm-spinner {
          width: 20px; height: 20px;
          border: 2px solid rgba(20,83,45,0.2); border-top-color: var(--forest);
          border-radius: 50%; animation: fm-spin 0.7s linear infinite; flex-shrink: 0;
        }
        .fm-spinner--sm { width: 14px; height: 14px; border-width: 2px; border-top-color: white; border-color: rgba(255,255,255,0.3); }
        @keyframes fm-spin { to { transform: rotate(360deg); } }

        /* ── Header ── */
        .fm-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
        }
        .fm-eyebrow {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .fm-title {
          font-family: 'Fraunces', serif; font-size: 2rem; font-weight: 600;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
        }

        /* ── User banner ── */
        .fm-user-banner {
          background: white; border: 1px solid var(--line); border-radius: 8px;
          padding: 18px 22px; margin-bottom: 16px;
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 16px;
          border-left: 4px solid var(--forest);
        }
        .fm-user-left { display: flex; align-items: center; gap: 14px; }
        .fm-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--forest); color: white;
          font-family: 'Fraunces', serif; font-size: 1rem; font-weight: 600;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .fm-user-name {
          font-family: 'Fraunces', serif; font-size: 1.1rem; font-weight: 600;
          color: var(--ink); margin: 0 0 3px;
        }
        .fm-user-meta { font-size: 0.78rem; color: var(--ink-soft); margin: 0; }

        .fm-unpaid-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .fm-unpaid-label {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.66rem;
          text-transform: uppercase; letter-spacing: 0.08em; color: #8a7a6a;
        }
        .fm-unpaid-amount {
          font-family: 'IBM Plex Mono', monospace; font-size: 1.6rem; font-weight: 600; line-height: 1;
        }
        .fm-unpaid-amount--has   { color: var(--rust); }
        .fm-unpaid-amount--clear { color: var(--forest); }

        /* ── KPI strip ── */
        .fm-kpi-strip { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
        .fm-kpi {
          background: white; border: 1px solid var(--line); border-left: 4px solid var(--forest);
          border-radius: 8px; padding: 12px 16px; min-width: 130px;
          display: flex; flex-direction: column; gap: 4px;
          clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
        }
        .fm-kpi-label {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.63rem;
          text-transform: uppercase; letter-spacing: 0.08em; color: #8a7a6a;
        }
        .fm-kpi-value {
          font-family: 'IBM Plex Mono', monospace; font-size: 1.3rem;
          font-weight: 500; color: var(--ink); line-height: 1;
        }

        /* ── Card ── */
        .fm-card {
          background: white; border: 1px solid var(--line);
          border-radius: 8px; overflow: hidden; margin-bottom: 20px;
        }
        .fm-card-head {
          display: flex; align-items: center; gap: 12px; padding: 16px 20px 14px;
        }
        .fm-card-icon {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 6px;
          background: var(--sage); color: var(--forest); flex-shrink: 0;
        }
        .fm-card-title {
          font-family: 'Fraunces', serif; font-size: 1rem;
          font-weight: 600; color: var(--forest); margin: 0 0 2px;
        }
        .fm-card-sub { font-size: 0.75rem; color: var(--ink-soft); margin: 0; }
        .fm-gold-rule {
          height: 1px; margin: 0 20px;
          background: linear-gradient(90deg, var(--gold), transparent); opacity: 0.4;
        }
        .fm-card-body { padding: 18px 20px; }

        /* ── Form ── */
        .fm-form { display: flex; flex-direction: column; gap: 14px; }
        .fm-form-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .fm-field { display: flex; flex-direction: column; gap: 5px; }
        .fm-label {
          font-size: 0.73rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--ink-soft);
        }
        .fm-input {
          border: 1px solid var(--line); border-radius: 6px; padding: 9px 12px;
          font-size: 0.875rem; font-family: 'Inter', sans-serif;
          color: var(--ink); background: white; outline: none;
          width: 100%; box-sizing: border-box; transition: border-color 0.15s;
        }
        .fm-input:focus { border-color: var(--forest); }
        .fm-input::placeholder { color: #B0A89C; }
        .fm-submit-btn { align-self: flex-start; }

        /* ── Table controls ── */
        .fm-table-controls { margin-bottom: 14px; }
        .fm-search-wrap {
          display: flex; align-items: center; gap: 8px;
          border: 1px solid var(--line); border-radius: 6px;
          background: white; padding: 0 12px; max-width: 340px;
          color: #8a7a6a;
        }
        .fm-search {
          border: none; outline: none; padding: 9px 0;
          font-size: 0.875rem; font-family: 'Inter', sans-serif;
          color: var(--ink); background: transparent; width: 100%;
        }
        .fm-search::placeholder { color: #B0A89C; }

        /* ── Table ── */
        .fm-table-scroll { overflow-x: auto; }
        .fm-table { width: 100%; border-collapse: collapse; }
        .fm-table th {
          padding: 10px 14px; background: var(--sage); color: var(--forest);
          font-family: 'IBM Plex Mono', monospace; font-size: 0.65rem;
          font-weight: 500; letter-spacing: 0.07em; text-align: left;
          white-space: nowrap; border-bottom: 1px solid #d5e8ca;
        }
        .fm-table td {
          padding: 11px 14px; border-bottom: 1px solid #f0ebe2;
          font-size: 0.85rem; color: var(--ink); vertical-align: middle;
        }
        .fm-table tr:last-child td { border-bottom: none; }
        .fm-row { cursor: pointer; transition: background 0.1s; }
        .fm-row:hover { background: #faf8f4; }

        /* cells */
        .fm-book-cell  { max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fm-notes-cell { max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ink-soft); }

        /* mono utility */
        .fm-mono { font-family: 'IBM Plex Mono', monospace; }
        .fm-id     { font-size: 0.78rem; color: var(--ink-soft); }
        .fm-amount { font-size: 0.9rem; font-weight: 500; }
        .fm-date   { font-size: 0.78rem; color: var(--ink-soft); }

        /* ── Chips ── */
        .fm-chip {
          display: inline-block; padding: 3px 10px; border-radius: 20px;
          font-size: 0.72rem; font-weight: 600; text-transform: capitalize;
          white-space: nowrap;
        }
        .fm-chip--type    { background: #E8F0FE; color: #2B4CA0; }
        .fm-chip--unpaid  { background: #FDECEA; color: var(--rust); }
        .fm-chip--paid    { background: var(--sage); color: var(--forest); }
        .fm-chip--waived  { background: #FFF8E7; color: var(--gold); border: 1px solid #F0D88A; }

        /* ── Action buttons ── */
        .fm-action-group { display: flex; gap: 6px; }
        .fm-action-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 10px; border-radius: 5px; border: none;
          font-size: 0.75rem; font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; white-space: nowrap;
          transition: opacity 0.15s;
        }
        .fm-action-btn:hover { opacity: 0.82; }
        .fm-action-btn--pay   { background: var(--sage); color: var(--forest); }
        .fm-action-btn--waive { background: #FFF8E7; color: var(--espresso); border: 1px solid #F0D88A; }
        .fm-resolved { font-size: 0.78rem; color: #aaa; }

        /* ── Pagination ── */
        .fm-pagination {
          display: flex; align-items: center; justify-content: center;
          gap: 14px; padding: 16px 0 4px;
        }
        .fm-page-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 6px;
          border: 1.5px solid var(--line); background: white; color: var(--ink);
          cursor: pointer; transition: background 0.12s, border-color 0.12s;
        }
        .fm-page-btn:hover:not(:disabled) { background: var(--sage); border-color: var(--forest); }
        .fm-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .fm-page-info { font-size: 0.8rem; color: var(--ink-soft); }

        /* ── Empty state ── */
        .fm-empty {
          padding: 40px 20px; text-align: center;
          color: var(--ink-soft); font-size: 0.875rem;
        }

        /* ── Buttons ── */
        .fm-btn-primary {
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--forest); color: white; border: none;
          padding: 9px 18px; border-radius: 7px;
          font-family: 'Inter', sans-serif; font-size: 0.875rem;
          font-weight: 600; cursor: pointer; transition: background 0.15s;
        }
        .fm-btn-primary:hover:not(:disabled) { background: var(--forest-lt); }
        .fm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .fm-btn-ghost {
          display: inline-flex; align-items: center; gap: 7px;
          background: transparent; color: var(--forest);
          border: 1.5px solid var(--forest); padding: 8px 16px;
          border-radius: 7px; font-family: 'Inter', sans-serif;
          font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: background 0.15s;
        }
        .fm-btn-ghost:hover { background: var(--sage); }

        /* ── Modal ── */
        .fm-modal-backdrop {
          position: fixed; inset: 0; background: rgba(36,31,24,0.5);
          backdrop-filter: blur(3px); z-index: 1000;
          display: flex; align-items: center; justify-content: center; padding: 24px;
          animation: fm-fade 0.18s ease;
        }
        @keyframes fm-fade { from { opacity: 0; } to { opacity: 1; } }
        .fm-modal {
          background: var(--parchment); border: 1px solid var(--line); border-radius: 10px;
          width: 100%; max-width: 380px; padding: 22px 24px;
          display: flex; flex-direction: column; gap: 14px;
          box-shadow: 0 20px 60px rgba(36,31,24,0.2);
          animation: fm-slide 0.2s ease;
        }
        @keyframes fm-slide { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .fm-modal-header {
          display: flex; justify-content: space-between; align-items: flex-start;
        }
        .fm-modal-title {
          font-family: 'Fraunces', serif; font-size: 1.1rem;
          font-weight: 600; color: var(--forest); margin: 4px 0 0;
        }
        .fm-modal-close {
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 6px;
          border: 1.5px solid var(--line); background: white;
          color: var(--ink); cursor: pointer; flex-shrink: 0;
          transition: background 0.12s;
        }
        .fm-modal-close:hover { background: #f0ebe2; }
        .fm-modal-due { font-size: 0.9rem; color: var(--ink-soft); margin: 0; }
        .fm-modal-due strong { color: var(--ink); }
        .fm-modal-actions { display: flex; gap: 10px; flex-wrap: wrap; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .fm-main { margin-left: 0; padding: 24px 20px 48px; }
          .fm-form-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .fm-user-banner { flex-direction: column; align-items: flex-start; }
          .fm-unpaid-right { align-items: flex-start; }
        }
      `}</style>
    </>
  );
}