import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import { AuthContext } from "../context/AuthContext";

const Icons = {
  Alert: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Receipt: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  Fine: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  X: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

export default function TransactionsPage() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const baseURL = import.meta.env.VITE_API_URL;

  const [fines, setFines] = useState([]);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [loading, setLoading] = useState(true);

  // filters
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchFines = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`${baseURL}/api/fines/my?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      const data = await res.json();
      setFines(data.fines || []);
      setTotalUnpaid(data.totalUnpaid || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFines(); }, [statusFilter, startDate, endDate]);

  const statusBadge = (status) => {
    if (status === "paid") return "tp-badge--paid";
    if (status === "waived") return "tp-badge--waived";
    return "tp-badge--unpaid";
  };

  const goToReceipt = (fine) => {
    navigate(
      fine.payment_group_id
        ? `/receipt/group/${fine.payment_group_id}`
        : `/receipt/${fine.id}`
    );
  };

  return (
    <>
      <Sidebar />

      <div className="tp-main">
        <header className="tp-header">
          <p className="tp-eyebrow">Account</p>
          <h1 className="tp-title">My Transactions</h1>
        </header>

        {/* UNPAID BALANCE */}
        {totalUnpaid > 0 && (
          <div className="tp-alert">
            <Icons.Alert />
            <span>
              You have <strong>₱{Number(totalUnpaid).toFixed(2)}</strong> in unpaid fines.
              You cannot borrow books until your balance is cleared.
            </span>
          </div>
        )}

        {/* FILTERS */}
        <div className="tp-card tp-filters-card">
          <div className="tp-filters">
            <select className="tp-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="waived">Waived</option>
            </select>

            <input
              className="tp-date-input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <input
              className="tp-date-input"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

            <button
              className="tp-clear-btn"
              onClick={() => {
                setStatusFilter("");
                setStartDate("");
                setEndDate("");
              }}
            >
              <Icons.X /> Clear
            </button>
          </div>
        </div>

        {/* LIST */}
        {loading ? (
          <div className="tp-state">
            <div className="tp-spinner" />
            <span>Loading transactions…</span>
          </div>
        ) : fines.length === 0 ? (
          <div className="tp-state">
            <Icons.Fine />
            <span>No transactions found.</span>
          </div>
        ) : (
          <div className="tp-fine-list">
            {fines.map((fine) => (
              <div key={fine.id} className="tp-fine-card">
                <div className="tp-fine-top">
                  <div>
                    <span className="tp-type-chip">{fine.fine_type}</span>
                    {fine.book_title && <p className="tp-book">{fine.book_title}</p>}
                    {fine.notes && <p className="tp-notes">{fine.notes}</p>}
                  </div>
                  <div className="tp-fine-right">
                    <strong className="tp-amount">₱{Number(fine.amount).toFixed(2)}</strong>
                    <span className={`tp-badge ${statusBadge(fine.status)}`}>{fine.status}</span>
                  </div>
                </div>

                <div className="tp-fine-meta">
                  <span>Added: {new Date(fine.created_at).toLocaleDateString()}</span>
                  {fine.paid_at && (
                    <span>Resolved: {new Date(fine.paid_at).toLocaleDateString()}</span>
                  )}
                  {fine.processed_by_name && <span>By: {fine.processed_by_name}</span>}
                  {fine.payment_group_id && <span>Grouped payment</span>}
                </div>

                {fine.status !== "unpaid" && (
                  <button className="tp-receipt-btn" onClick={() => goToReceipt(fine)}>
                    <Icons.Receipt /> View Receipt
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

        :root {
          --forest:    #14532D;
          --forest-lt: #3E7A4D;
          --gold:      #B8860B;
          --rust:      #A13D2B;
          --espresso:  #5C3D2E;
          --parchment: #FAF6EE;
          --sage:      #EEF3E7;
          --ink:       #241F18;
          --ink-soft:  #5C5546;
          --line:      #E4DFD3;
        }

        .tp-main {
          padding: 80px 16px 100px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
        }

        .tp-header { margin-bottom: 18px; }
        .tp-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .tp-title {
          font-family: 'Fraunces', serif;
          font-size: 1.5rem; font-weight: 600;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
        }

        /* Alert */
        .tp-alert {
          display: flex; align-items: flex-start; gap: 10px;
          background: #FBDCD5; border: 1px solid #E7B3A8;
          color: var(--rust); padding: 12px 16px;
          border-radius: 8px; margin-bottom: 16px;
          font-size: 0.85rem; line-height: 1.5;
        }
        .tp-alert svg { flex-shrink: 0; margin-top: 2px; }

        /* Filters card */
        .tp-card {
          background: white; border: 1px solid var(--line);
          border-radius: 8px; margin-bottom: 16px;
        }
        .tp-filters-card { padding: 14px; }
        .tp-filters {
          display: flex; gap: 8px; flex-wrap: wrap;
        }
        .tp-select, .tp-date-input {
          padding: 8px 12px; border-radius: 6px;
          border: 1px solid var(--line); background: white;
          font-size: 0.85rem; font-family: 'Inter', sans-serif;
          color: var(--ink); flex: 1; min-width: 120px;
          outline: none; transition: border-color 0.15s;
        }
        .tp-select:focus, .tp-date-input:focus { border-color: var(--forest); }

        .tp-clear-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 8px 14px; border-radius: 6px;
          border: 1px solid var(--line); background: var(--sage);
          color: var(--ink-soft); font-weight: 600; font-size: 0.82rem;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: background 0.12s;
        }
        .tp-clear-btn:hover { background: #E0E9D8; }

        /* State (loading / empty) */
        .tp-state {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 12px; padding: 60px 0;
          color: var(--ink-soft); font-size: 0.88rem;
          background: white; border: 1px dashed var(--line); border-radius: 8px;
        }
        .tp-state svg { opacity: 0.3; }
        .tp-spinner {
          width: 22px; height: 22px;
          border: 2.5px solid var(--line); border-top-color: var(--forest);
          border-radius: 50%; animation: tp-spin 0.7s linear infinite;
        }
        @keyframes tp-spin { to { transform: rotate(360deg); } }

        /* Fine list */
        .tp-fine-list {
          display: flex; flex-direction: column; gap: 12px;
        }

        .tp-fine-card {
          background: white; border: 1px solid var(--line);
          border-radius: 8px; padding: 14px;
        }

        .tp-fine-top {
          display: flex; justify-content: space-between;
          align-items: flex-start; margin-bottom: 8px; gap: 10px;
        }

        .tp-type-chip {
          display: inline-block;
          background: #E8F0FE; color: #2B4CA0;
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.72rem; font-weight: 600;
          text-transform: capitalize;
        }

        .tp-book {
          margin: 7px 0 2px;
          font-family: 'Fraunces', serif;
          font-weight: 600; color: var(--forest); font-size: 0.9rem;
        }

        .tp-notes {
          margin: 0; font-size: 0.8rem; color: var(--ink-soft);
        }

        .tp-fine-right {
          display: flex; flex-direction: column;
          align-items: flex-end; gap: 6px; flex-shrink: 0;
        }

        .tp-amount {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 1.05rem; color: var(--rust);
        }

        .tp-badge {
          padding: 3px 10px; border-radius: 20px;
          font-size: 0.7rem; font-weight: 700;
          text-transform: capitalize; white-space: nowrap;
        }
        .tp-badge--unpaid { background: #FBDCD5; color: var(--rust); }
        .tp-badge--paid   { background: var(--sage); color: var(--forest); }
        .tp-badge--waived { background: #FFF8E7; color: var(--gold); border: 1px solid #F0D88A; }

        .tp-fine-meta {
          display: flex; gap: 12px; flex-wrap: wrap;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.72rem; color: var(--ink-soft);
          margin-bottom: 10px;
        }

        .tp-receipt-btn {
          width: 100%; display: flex; align-items: center;
          justify-content: center; gap: 6px;
          padding: 9px; border: none; border-radius: 6px;
          background: var(--sage); color: var(--forest);
          font-weight: 600; font-size: 0.85rem;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: background 0.12s;
        }
        .tp-receipt-btn:hover { background: #E0E9D8; }
      `}</style>
    </>
  );
}