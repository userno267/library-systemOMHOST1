// src/pages/admin/Dashboard.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer,
  Legend, LineChart, Line, LabelList
} from "recharts";
import AdminSidebar from "../../components/AdminSidebar";

const PIE_COLORS = ["#14532D", "#B8860B", "#A13D2B"];

// ─── Heat ramp: low score = sage green, high score = espresso/rust ───────────
function heatColor(score, max) {
  if (!max || max === 0) return "#EEF3E7";
  const t = score / max;
  if (t < 0.33) return "#3E7A4D";
  if (t < 0.66) return "#B8860B";
  return "#A13D2B";
}

// ─── Custom tooltip for heat chart ───────────────────────────────────────────
function HeatTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "white", border: "1px solid #E4DFD3",
      borderRadius: 6, padding: "10px 14px",
      fontFamily: "'Inter', sans-serif", fontSize: "0.82rem"
    }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: "#14532D", marginBottom: 4 }}>
        {d.title}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
        <span style={{ color: "#5C5546" }}>Heat score: </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: "#241F18" }}>
          {d.heat_score?.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

// ─── Custom bar cell for heat chart (color per bar) ──────────────────────────
function HeatBar(props) {
  const { x, y, width, height, color } = props;
  return <rect x={x} y={y} width={width} height={height} fill={color} rx={4} ry={4} />;
}

// ─── Custom tooltip for subject demand ───────────────────────────────────────
function SubjectTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "white", border: "1px solid #E4DFD3",
      borderRadius: 6, padding: "10px 14px",
      fontFamily: "'Inter', sans-serif", fontSize: "0.82rem"
    }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: "#14532D", marginBottom: 4 }}>
        {payload[0].payload.subject}
      </div>
      <span style={{ color: "#5C5546" }}>Borrows: </span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
        {payload[0].value}
      </span>
    </div>
  );
}

// ─── Custom inline value label for bars ──────────────────────────────────────
function BarValueLabel(props) {
  const { x, y, width, value } = props;
  return (
    <text
      x={x + width + 8}
      y={y + 14}
      fill="#5C5546"
      fontSize={11}
      fontFamily="'IBM Plex Mono', monospace"
      fontWeight={600}
    >
      {value}
    </text>
  );
}

export default function Dashboard() {
  const [overview, setOverview]         = useState({});
  const [borrowTrends, setBorrowTrends] = useState([]);
  const [userGrowth, setUserGrowth]     = useState([]);
  const [topBooks, setTopBooks]         = useState([]);
  const [topBorrowers, setTopBorrowers] = useState([]);
  const [aiInsight, setAiInsight]       = useState({});
  const [loadingAI, setLoadingAI]       = useState(false);
  const [mlData, setMlData]             = useState(null);
  const [mlInsight, setMlInsight]       = useState(null);
  const [loadingML, setLoadingML]       = useState(false);

  const token   = localStorage.getItem("token");
  const headers = {
    Authorization: `Bearer ${token}`,
    "ngrok-skip-browser-warning": "true"
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [o, t, g, b, u] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/overview`,       { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/borrow-trends`,  { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/user-growth`,    { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/top-books`,      { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/top-borrowers`,  { headers }),
      ]);
      setOverview(o.data);
      setBorrowTrends(t.data);
      setUserGrowth(g.data);
      setTopBooks(b.data);
      setTopBorrowers(u.data);
      generateAI(o.data, t.data, b.data, u.data);
    } catch (err) { console.error(err); }
    fetchML();
  };

  const generateAI = async (o, t, b, u) => {
    setLoadingAI(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/dashboard/ai-insight`,
        { overview: o, borrowTrends: t, topBooks: b, topBorrowers: u },
        { headers }
      );
      setAiInsight(res.data || {});
    } catch { setAiInsight({ summary: "AI failed." }); }
    setLoadingAI(false);
  };

  const fetchML = async () => {
    setLoadingML(true);
    try {
      const mlRaw = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/ml-data`, { headers });
      setMlData(mlRaw.data);
      const mlRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/dashboard/ml-insight`, mlRaw.data, { headers });
      setMlInsight(mlRes.data);
    } catch (err) {
      console.error("ML fetch failed", err);
      setMlInsight({ forecastSummary: "ML analysis unavailable." });
    }
    setLoadingML(false);
  };

  const statusData = [
    { name: "Active",   value: overview.activeBorrows   || 0 },
    { name: "Returned", value: overview.returnedBorrows || 0 },
    { name: "Overdue",  value: overview.overdueBorrows  || 0 },
  ];

  const totalBorrows = (overview.activeBorrows || 0) + (overview.returnedBorrows || 0) + (overview.overdueBorrows || 0);

  // ── Enrich book heat data with per-bar color ──────────────────────────────
  const heatBooks = (mlData?.bookHeat || []).slice(0, 8);
  const maxHeat   = Math.max(...heatBooks.map(b => b.heat_score || 0), 1);
  const heatWithColor = heatBooks.map(b => ({
    ...b,
    color: heatColor(b.heat_score, maxHeat),
  }));

  // ── Subject demand: sort descending for a clean waterfall feel ────────────
  const subjectData = [...(mlData?.subjectDemand || [])]
    .sort((a, b) => b.total_borrows - a.total_borrows)
    .slice(0, 8);

  // ── Forecast enriched data ────────────────────────────────────────────────
  const forecastData = (mlData?.monthlyVolume || []).map(d => ({
    ...d,
    // keep only the main borrow line for the hero area chart
    borrows: d.total_borrows,
  }));
  const lastMonth    = forecastData[forecastData.length - 1] || {};
  const prevMonth    = forecastData[forecastData.length - 2] || {};
  const borrowDelta  = lastMonth.borrows && prevMonth.borrows
    ? lastMonth.borrows - prevMonth.borrows : null;

  return (
    <>
      <AdminSidebar />

      <div className="admin-main">
        <header className="page-head">
          <p className="eyebrow">Library Records &amp; Circulation</p>
          <h1 className="page-title">Dashboard</h1>
        </header>

        {/* ════════ KPI STRIP ════════ */}
        <div className="kpi-strip">
          <KpiCard label="Total Borrows" value={totalBorrows} />
          <KpiCard label="Active"   value={overview.activeBorrows   || 0} tone="forest" />
          <KpiCard label="Returned" value={overview.returnedBorrows || 0} tone="gold" />
          <KpiCard label="Overdue"  value={overview.overdueBorrows  || 0} tone="espresso" />
        </div>

        {/* ════════ AI INSIGHT ════════ */}
        <section className="card">
          <SectionHead eyebrow="Generated Summary" title="AI Insights" />
          {loadingAI ? <p className="loading-text">Generating…</p> : (
            <>
              <p className="summary">{aiInsight.summary}</p>
              <div className="cards">
                {aiInsight.cards?.map((c, i) => (
                  <StatCard key={i} title={c.title} value={c.value} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* ════════ ML PREDICTIVE INSIGHTS ════════ */}
        <section className="card ml-card">
          <div className="ml-header">
            <SectionHead eyebrow="Predictive Model" title="ML Insights" />
            <span className="ml-badge">Linear Regression &amp; Behavioral Scoring</span>
          </div>

          {loadingML ? (
            <div className="ml-loading">
              <div className="ml-spinner" />
              <p>Running predictive analysis…</p>
            </div>
          ) : mlInsight ? (
            <>
              {/* ── REDESIGNED: BORROW FORECAST ── */}
              <div className="ml-block">
                <h3 className="ml-subtitle">Borrowing Forecast</h3>

                {/* Hero stat + delta + summary side-by-side */}
                <div className="forecast-hero">
                  <div className="forecast-stat-box">
                    <div className="forecast-eyebrow">Predicted next month</div>
                    <div className="forecast-big">
                      {mlInsight.predictedNextMonth ?? "—"}
                    </div>
                    {borrowDelta !== null && (
                      <div className={`forecast-delta ${borrowDelta >= 0 ? "up" : "down"}`}>
                        {borrowDelta >= 0 ? "▲" : "▼"} {Math.abs(borrowDelta)} vs last month
                      </div>
                    )}
                  </div>

                  {/* Annotation badges */}
                  <div className="forecast-badges">
                    <div className="f-badge returned">
                      <span className="f-badge-label">Returned</span>
                      <span className="f-badge-value">{lastMonth.returned ?? "—"}</span>
                    </div>
                    <div className="f-badge overdue">
                      <span className="f-badge-label">Overdue</span>
                      <span className="f-badge-value">{lastMonth.overdue ?? "—"}</span>
                    </div>
                    <p className="forecast-prose">{mlInsight.forecastSummary}</p>
                  </div>
                </div>

                {/* Single clean area chart — borrows only */}
                {forecastData.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <p className="chart-legend-row">
                      <span className="legend-pip" style={{ background: "#14532D" }} />
                      <span>Monthly borrow volume</span>
                      <span className="legend-pip" style={{ background: "#B8860B", marginLeft: 16 }} />
                      <span>Returned</span>
                      <span className="legend-pip" style={{ background: "#A13D2B", marginLeft: 16 }} />
                      <span>Overdue</span>
                    </p>
                    <ResponsiveContainer width="100%" height={210}>
                      <AreaChart data={forecastData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradForest" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#14532D" stopOpacity={0.18} />
                            <stop offset="95%" stopColor="#14532D" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E4DFD3" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5C5546", fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#5C5546", fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E4DFD3", fontFamily: "Inter, sans-serif", fontSize: 12 }} />
                        <Area type="monotone" dataKey="borrows"  stroke="#14532D" fill="url(#gradForest)" strokeWidth={2.5} dot={false} name="Borrows" />
                        <Line type="monotone" dataKey="returned" stroke="#B8860B" strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="Returned" />
                        <Line type="monotone" dataKey="overdue"  stroke="#A13D2B" strokeWidth={1.5} dot={false} strokeDasharray="2 3" name="Overdue" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* ── PEAK DAY (unchanged, already decent) ── */}
              <div className="ml-block">
                <h3 className="ml-subtitle">Peak Borrowing Period</h3>
                <p className="ml-text">{mlInsight.peakDay}</p>
                {mlData?.dowPattern?.length > 0 && (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={mlData.dowPattern} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4DFD3" vertical={false} />
                      <XAxis dataKey="day_name" tick={{ fontSize: 11, fill: "#5C5546" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#5C5546" }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E4DFD3" }} />
                      <Bar dataKey="total" fill="#14532D" radius={[4, 4, 0, 0]} name="Borrows" maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* ── REDESIGNED: SUBJECT DEMAND ── */}
              {mlInsight.subjectInsights?.length > 0 && (
                <div className="ml-block">
                  <h3 className="ml-subtitle">Subject Demand Patterns</h3>

                  {subjectData.length > 0 && (
                    <>
                      <p className="chart-legend-row">
                        <span className="legend-pip" style={{ background: "#14532D" }} />
                        <span>Total borrows by subject — sorted by demand</span>
                      </p>
                      {/* Fixed-height wrapper: 48px per bar + 60px for axes */}
                      <div style={{ width: "100%", height: subjectData.length * 48 + 60 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={subjectData}
                            layout="vertical"
                            margin={{ top: 4, right: 72, left: 8, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#E4DFD3" horizontal={false} />
                            <XAxis
                              type="number"
                              tick={{ fontSize: 11, fill: "#5C5546", fontFamily: "IBM Plex Mono" }}
                              axisLine={false} tickLine={false}
                            />
                            <YAxis
                              dataKey="subject"
                              type="category"
                              width={120}
                              tick={{ fontSize: 11, fill: "#241F18", fontFamily: "Inter, sans-serif" }}
                              axisLine={false} tickLine={false}
                            />
                            <Tooltip content={<SubjectTooltip />} cursor={{ fill: "#EEF3E7" }} />
                            <Bar
                              dataKey="total_borrows"
                              name="Borrows"
                              radius={[0, 4, 4, 0]}
                              maxBarSize={28}
                              background={{ fill: "#F5F3EE", radius: [0, 4, 4, 0] }}
                            >
                              {/* Sequential green ramp — darker bar = more demand */}
                              {subjectData.map((entry, index) => {
                                const intensity = 1 - (index / Math.max(subjectData.length - 1, 1)) * 0.55;
                                const r = Math.round(20  + (1 - intensity) * 44);
                                const g = Math.round(83  + (1 - intensity) * 26);
                                const b = Math.round(45  + (1 - intensity) * 32);
                                return <Cell key={`cell-${index}`} fill={`rgb(${r},${g},${b})`} />;
                              })}
                              <LabelList
                                dataKey="total_borrows"
                                position="right"
                                content={<BarValueLabel />}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}

                  <div className="insight-grid" style={{ marginTop: 16 }}>
                    {mlInsight.subjectInsights.map((s, i) => (
                      <div key={i} className="insight-card">
                        <strong>{s.subject}</strong>
                        <p>{s.insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── AT-RISK STUDENTS ── */}
              {mlInsight.atRiskStudents?.length > 0 && (
                <div className="ml-block">
                  <h3 className="ml-subtitle">At-Risk Student Detection</h3>
                  <p className="ml-hint">Students flagged by behavioral overdue-rate scoring</p>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th><th>LRN</th><th>Risk Level</th><th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mlInsight.atRiskStudents.map((s, i) => (
                          <tr key={i}>
                            <td>{s.name}</td>
                            <td>{s.lrn}</td>
                            <td>
                              <span className={`badge badge-${s.risk?.toLowerCase()}`}>{s.risk}</span>
                            </td>
                            <td>{s.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── REDESIGNED: BOOK HEAT SCORE ── */}
              {mlInsight.hotBooks?.length > 0 && (
                <div className="ml-block">
                  <h3 className="ml-subtitle">Book Heat Score</h3>
                  <p className="ml-hint">Ranked by frequency-recency heat scoring algorithm</p>

                  {heatWithColor.length > 0 && (
                    <>
                      {/* Heat legend */}
                      <div className="heat-legend">
                        <span className="heat-pip" style={{ background: "#3E7A4D" }} />
                        <span>Low</span>
                        <span className="heat-pip" style={{ background: "#B8860B" }} />
                        <span>Medium</span>
                        <span className="heat-pip" style={{ background: "#A13D2B" }} />
                        <span>High</span>
                      </div>

                      {/* Horizontal bar — no angled labels, color encodes heat */}
                      <div style={{ width: "100%", height: heatWithColor.length * 44 + 60 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={heatWithColor}
                            layout="vertical"
                            margin={{ top: 4, right: 72, left: 8, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#E4DFD3" horizontal={false} />
                            <XAxis
                              type="number"
                              tick={{ fontSize: 11, fill: "#5C5546", fontFamily: "IBM Plex Mono" }}
                              axisLine={false} tickLine={false}
                              tickFormatter={v => v.toFixed(0)}
                            />
                            <YAxis
                              dataKey="title"
                              type="category"
                              width={140}
                              tick={{ fontSize: 11, fill: "#241F18" }}
                              axisLine={false} tickLine={false}
                              tickFormatter={v => v.length > 20 ? v.slice(0, 19) + "…" : v}
                            />
                            <Tooltip content={<HeatTooltip />} cursor={{ fill: "#EEF3E7" }} />
                            <Bar
                              dataKey="heat_score"
                              name="Heat Score"
                              shape={<HeatBar />}
                              maxBarSize={26}
                              background={{ fill: "#F5F3EE", radius: [0, 4, 4, 0] }}
                            >
                              {heatWithColor.map((entry, index) => (
                                <Cell key={`heat-${index}`} fill={entry.color} />
                              ))}
                              <LabelList
                                dataKey="heat_score"
                                position="right"
                                formatter={v => v?.toFixed(1)}
                                content={(props) => {
                                  const { x, y, width, value } = props;
                                  return (
                                    <text
                                      x={x + width + 8} y={y + 14}
                                      fill="#5C5546" fontSize={11}
                                      fontFamily="'IBM Plex Mono', monospace"
                                      fontWeight={600}
                                    >
                                      {value?.toFixed(1)}
                                    </text>
                                  );
                                }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}

                  <div className="insight-grid" style={{ marginTop: 16 }}>
                    {mlInsight.hotBooks.map((b, i) => (
                      <div key={i} className="insight-card hot">
                        <strong>{b.title}</strong>
                        <p>{b.insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── RECOMMENDATIONS ── */}
              {mlInsight.recommendations?.length > 0 && (
                <div className="ml-block" style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
                  <h3 className="ml-subtitle">AI-Generated Recommendations</h3>
                  <div className="rec-grid">
                    {mlInsight.recommendations.map((r, i) => (
                      <div key={i} className={`rec-card priority-${r.priority?.toLowerCase()}`}>
                        <div className="rec-top">
                          <span className="rec-category">{r.category}</span>
                          <span className={`rec-priority-badge priority-badge-${r.priority?.toLowerCase()}`}>
                            {r.priority} Priority
                          </span>
                        </div>
                        <p>{r.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="ml-text">No ML data available yet.</p>
          )}
        </section>

        {/* ════════ CHART GRID ════════ */}
        <div className="grid">
          <section className="card">
            <SectionHead eyebrow="Monthly" title="Borrow Trends" />
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={borrowTrends} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradBorrow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#14532D" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#14532D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4DFD3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5C5546" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5C5546" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E4DFD3" }} />
                <Area type="monotone" dataKey="total" stroke="#14532D" fill="url(#gradBorrow)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          <section className="card">
            <SectionHead eyebrow="Monthly" title="User Growth" />
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={userGrowth} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#B8860B" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#B8860B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4DFD3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5C5546" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5C5546" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E4DFD3" }} />
                <Area type="monotone" dataKey="total" stroke="#B8860B" fill="url(#gradGold)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </section>
        </div>

        {/* ════════ STATUS PIE ════════ */}
        <section className="card">
          <SectionHead eyebrow="Snapshot" title="Borrow Status" />
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusData} dataKey="value" outerRadius={100} innerRadius={50} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E4DFD3" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </section>

        {/* ════════ TABLES ════════ */}
        <div className="grid">
          <section className="card">
            <SectionHead eyebrow="Ranked" title="Top Books" />
            <Table headers={["Title", "Borrows"]} data={topBooks.map(b => [b.title, b.borrows])} />
          </section>
          <section className="card">
            <SectionHead eyebrow="Ranked" title="Top Borrowers" />
            <Table headers={["Name", "LRN", "Total"]} data={topBorrowers.map(u => [u.full_name, u.lrn, u.total])} />
          </section>
        </div>
      </div>

      {/* ════════ STYLES ════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

        :root {
          --forest: #14532D;
          --forest-light: #3E7A4D;
          --gold: #B8860B;
          --gold-light: #D8B24D;
          --espresso: #5C3D2E;
          --rust: #A13D2B;
          --parchment: #FAF6EE;
          --sage: #EEF3E7;
          --ink: #241F18;
          --ink-soft: #5C5546;
          --line: #E4DFD3;
        }

        /* ── layout ── */
        .admin-main {
          margin-left: 248px;
          padding: 36px 40px 60px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
        }
        .page-head { margin-bottom: 28px; }
        .eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.72rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          font-weight: 600; margin: 0 0 6px;
        }
        .page-title {
          font-family: 'Fraunces', serif;
          font-weight: 600; font-size: 2.1rem;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
        }

        /* ── KPI ── */
        .kpi-strip {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 16px; margin-bottom: 24px;
        }
        .kpi-card {
          background: white; border: 1px solid var(--line);
          border-left: 4px solid var(--ink-soft);
          border-radius: 4px; padding: 18px 20px;
        }
        .kpi-card.forest   { border-left-color: var(--forest); }
        .kpi-card.gold     { border-left-color: var(--gold); }
        .kpi-card.espresso { border-left-color: var(--rust); }
        .kpi-value {
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 600; font-size: 1.9rem;
          color: var(--ink); line-height: 1;
        }
        .kpi-label {
          font-size: 0.78rem; color: var(--ink-soft); margin-top: 6px;
          text-transform: uppercase; letter-spacing: 0.05em;
        }

        /* ── card ── */
        .card {
          background: white; border: 1px solid var(--line);
          border-radius: 6px; padding: 24px 26px; margin-bottom: 20px;
        }
        .section-head { margin-bottom: 16px; }
        .section-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--ink-soft); margin: 0 0 3px;
        }
        .section-title {
          font-family: 'Fraunces', serif; font-weight: 600;
          font-size: 1.25rem; color: var(--forest);
          margin: 0 0 8px; padding-bottom: 10px;
          border-bottom: 2px solid var(--gold); display: inline-block;
        }
        .summary { margin-bottom: 15px; color: var(--ink-soft); line-height: 1.6; }
        .loading-text { color: var(--ink-soft); font-style: italic; }
        .cards { display: flex; gap: 15px; flex-wrap: wrap; }
        .stat {
          background: var(--sage); border-radius: 6px;
          padding: 15px 18px; min-width: 140px;
        }
        .stat p { margin: 0 0 4px; font-size: 0.8rem; color: var(--ink-soft); }
        .stat h2 {
          margin: 0; font-family: 'IBM Plex Mono', monospace;
          color: var(--forest); font-size: 1.4rem;
        }
        .grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 20px; margin-bottom: 20px;
        }

        /* ── tables ── */
        table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
        th {
          background: var(--sage); padding: 10px 12px;
          text-align: left; font-size: 0.75rem;
          text-transform: uppercase; letter-spacing: 0.04em;
          color: var(--forest); font-weight: 600;
        }
        td { padding: 10px 12px; border-bottom: 1px solid var(--line); }
        tr:hover td { background: var(--sage); }
        .table-wrap { overflow-x: auto; }

        /* ── ml card ── */
        .ml-card { border-color: var(--gold-light); border-top: 3px solid var(--gold); }
        .ml-header {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 12px; flex-wrap: wrap;
        }
        .ml-badge {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
          background: var(--sage); color: var(--forest);
          padding: 5px 12px; border-radius: 20px;
          border: 1px solid var(--line); font-weight: 600;
          letter-spacing: 0.03em; white-space: nowrap;
        }
        .ml-loading {
          display: flex; align-items: center; gap: 12px;
          color: var(--ink-soft); padding: 10px 0;
        }
        .ml-spinner {
          width: 20px; height: 20px;
          border: 3px solid var(--line); border-top-color: var(--forest);
          border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ml-block {
          margin-bottom: 28px; padding-bottom: 24px;
          border-bottom: 1px solid var(--sage);
        }
        .ml-subtitle {
          font-family: 'Fraunces', serif; color: var(--espresso);
          margin: 0 0 10px; font-size: 1.02rem; font-weight: 600;
        }
        .ml-text { color: var(--ink-soft); margin-bottom: 12px; line-height: 1.55; }
        .ml-hint { font-size: 0.82rem; color: var(--ink-soft); margin-bottom: 12px; font-style: italic; }

        /* ── REDESIGNED: forecast hero layout ── */
        .forecast-hero {
          display: flex; gap: 24px; flex-wrap: wrap;
          align-items: flex-start; margin-bottom: 8px;
        }
        .forecast-stat-box {
          background: var(--forest); border-radius: 8px;
          padding: 20px 28px; flex-shrink: 0; min-width: 160px;
        }
        .forecast-eyebrow {
          font-size: 0.68rem; letter-spacing: 0.10em;
          text-transform: uppercase; color: rgba(255,255,255,0.65);
          font-family: 'IBM Plex Mono', monospace; margin-bottom: 8px;
        }
        .forecast-big {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 3rem; font-weight: 600;
          color: white; line-height: 1;
        }
        .forecast-delta {
          font-size: 0.78rem; margin-top: 8px;
          font-family: 'IBM Plex Mono', monospace; font-weight: 600;
        }
        .forecast-delta.up   { color: #86efac; }
        .forecast-delta.down { color: #fca5a5; }

        .forecast-badges {
          flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 180px;
        }
        .f-badge {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px; border-radius: 6px; border: 1px solid var(--line);
          background: white;
        }
        .f-badge.returned { border-left: 3px solid var(--gold); }
        .f-badge.overdue  { border-left: 3px solid var(--rust); }
        .f-badge-label { font-size: 0.78rem; color: var(--ink-soft); font-weight: 500; }
        .f-badge-value {
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 600; font-size: 1.1rem; color: var(--ink);
        }
        .forecast-prose {
          font-size: 0.84rem; color: var(--ink-soft);
          line-height: 1.55; margin: 0;
        }

        /* ── chart legend row ── */
        .chart-legend-row {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.78rem; color: var(--ink-soft);
          margin: 0 0 10px; flex-wrap: wrap;
        }
        .legend-pip { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }

        /* ── heat legend ── */
        .heat-legend {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.78rem; color: var(--ink-soft); margin-bottom: 10px;
        }
        .heat-pip { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }

        /* ── insight grid ── */
        .insight-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        .insight-card {
          background: var(--sage); border-radius: 6px;
          padding: 12px 14px; border-left: 3px solid var(--forest-light);
        }
        .insight-card.hot { border-left-color: var(--rust); background: #FBF1EE; }
        .insight-card strong {
          display: block; margin-bottom: 5px; color: var(--forest);
          font-size: 0.9rem; font-family: 'Fraunces', serif;
        }
        .insight-card.hot strong { color: var(--rust); }
        .insight-card p { font-size: 0.82rem; color: var(--ink-soft); margin: 0; line-height: 1.45; }

        /* ── badges ── */
        .badge {
          display: inline-block; padding: 3px 10px; border-radius: 20px;
          font-size: 0.74rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.02em;
        }
        .badge-high   { background: #FBDCD5; color: var(--rust); }
        .badge-medium { background: #F6E9C9; color: #8A6A0F; }
        .badge-low    { background: #DCEADF; color: var(--forest); }

        /* ── recommendations ── */
        .rec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
        .rec-card {
          background: var(--sage); border-radius: 6px;
          padding: 14px 16px; border-left: 4px solid var(--forest-light);
        }
        .rec-card.priority-high   { border-left-color: var(--rust);  background: #FBF1EE; }
        .rec-card.priority-medium { border-left-color: var(--gold);  background: #FBF6E7; }
        .rec-card.priority-low    { border-left-color: var(--forest-light); }
        .rec-top {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;
        }
        .rec-category {
          font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
          background: white; padding: 3px 9px; border-radius: 10px;
          color: var(--forest); font-weight: 600;
        }
        .rec-priority-badge { font-size: 0.68rem; padding: 3px 9px; border-radius: 10px; font-weight: 600; text-transform: uppercase; }
        .priority-badge-high   { background: #FBDCD5; color: var(--rust); }
        .priority-badge-medium { background: #F6E9C9; color: #8A6A0F; }
        .priority-badge-low    { background: #DCEADF; color: var(--forest); }
        .rec-card p { margin: 0; color: var(--ink); font-size: 0.88rem; line-height: 1.5; }

        /* ── responsive ── */
        @media (max-width: 1000px) {
          .admin-main { margin-left: 0; padding: 24px; }
          .kpi-strip { grid-template-columns: 1fr 1fr; }
          .grid { grid-template-columns: 1fr; }
          .forecast-hero { flex-direction: column; }
        }
      `}</style>
    </>
  );
}

/* ── Small components ── */
function SectionHead({ eyebrow, title }) {
  return (
    <div className="section-head">
      {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
      <h2 className="section-title">{title}</h2>
    </div>
  );
}

function KpiCard({ label, value, tone }) {
  return (
    <div className={`kpi-card ${tone || ""}`}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="stat">
      <p>{title}</p>
      <h2>{value || 0}</h2>
    </div>
  );
}

function Table({ headers, data }) {
  return (
    <table>
      <thead><tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}