import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadialBarChart,
  RadialBar,
  Treemap
} from "recharts";
import AdminSidebar from "../../components/AdminSidebar";

const PIE_COLORS = ["#14532D", "#B8860B", "#A13D2B"];
const SUBJECT_COLORS = [
  "#14532D",
  "#3E7A4D",
  "#B8860B",
  "#D8B24D",
  "#A13D2B",
  "#5C3D2E"
];
const HEAT_COLORS = [
  "#A13D2B",
  "#C05A3E",
  "#D8815F",
  "#B8860B",
  "#D8B24D",
  "#E8CE8A"
];

export default function Dashboard() {
  const [overview, setOverview] = useState({});
  const [borrowTrends, setBorrowTrends] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [topBooks, setTopBooks] = useState([]);
  const [topBorrowers, setTopBorrowers] = useState([]);
  const [aiInsight, setAiInsight] = useState({});
  const [loadingAI, setLoadingAI] = useState(false);

  const [mlData, setMlData] = useState(null);
  const [mlInsight, setMlInsight] = useState(null);
  const [loadingML, setLoadingML] = useState(false);

  const token = localStorage.getItem("token");

  const headers = {
    Authorization: `Bearer ${token}`,
    "ngrok-skip-browser-warning": "true"
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [o, t, g, b, u] = await Promise.all([
        axios.get(
          `${import.meta.env.VITE_API_URL}/api/dashboard/overview`,
          { headers }
        ),
        axios.get(
          `${import.meta.env.VITE_API_URL}/api/dashboard/borrow-trends`,
          { headers }
        ),
        axios.get(
          `${import.meta.env.VITE_API_URL}/api/dashboard/user-growth`,
          { headers }
        ),
        axios.get(
          `${import.meta.env.VITE_API_URL}/api/dashboard/top-books`,
          { headers }
        ),
        axios.get(
          `${import.meta.env.VITE_API_URL}/api/dashboard/top-borrowers`,
          { headers }
        )
      ]);

      setOverview(o.data);
      setBorrowTrends(t.data);
      setUserGrowth(g.data);
      setTopBooks(b.data);
      setTopBorrowers(u.data);

      generateAI(o.data, t.data, b.data, u.data);
    } catch (err) {
      console.error(err);
    }

    fetchML();
  };

  const generateAI = async (o, t, b, u) => {
    setLoadingAI(true);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/dashboard/ai-insight`,
        {
          overview: o,
          borrowTrends: t,
          topBooks: b,
          topBorrowers: u
        },
        { headers }
      );

      setAiInsight(res.data || {});
    } catch {
      setAiInsight({
        summary: "AI failed."
      });
    }

    setLoadingAI(false);
  };

  const fetchML = async () => {
    setLoadingML(true);

    try {
      const mlRaw = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/dashboard/ml-data`,
        { headers }
      );

      setMlData(mlRaw.data);

      const mlRes = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/dashboard/ml-insight`,
        mlRaw.data,
        { headers }
      );

      setMlInsight(mlRes.data);
    } catch (err) {
      console.error("ML fetch failed", err);

      setMlInsight({
        forecastSummary: "ML analysis unavailable."
      });
    }

    setLoadingML(false);
  };

  const statusData = [
    {
      name: "Active",
      value: overview.activeBorrows || 0
    },
    {
      name: "Returned",
      value: overview.returnedBorrows || 0
    },
    {
      name: "Overdue",
      value: overview.overdueBorrows || 0
    }
  ];

  const totalBorrows =
    (overview.activeBorrows || 0) +
    (overview.returnedBorrows || 0) +
    (overview.overdueBorrows || 0);

  return (
    <>
      <AdminSidebar />

      <div className="admin-main">
        <header className="page-head">
          <p className="eyebrow">
            Library Records &amp; Circulation
          </p>

          <h1 className="page-title">
            Dashboard
          </h1>
        </header>

        <div className="kpi-strip">
          <KpiCard
            label="Total Borrows"
            value={totalBorrows}
          />

          <KpiCard
            label="Active"
            value={overview.activeBorrows || 0}
            tone="forest"
          />

          <KpiCard
            label="Returned"
            value={overview.returnedBorrows || 0}
            tone="gold"
          />

          <KpiCard
            label="Overdue"
            value={overview.overdueBorrows || 0}
            tone="espresso"
          />
        </div>

        <section className="card">
          <SectionHead
            eyebrow="Generated Summary"
            title="AI Insights"
          />

          {loadingAI ? (
            <p className="loading-text">
              Generating…
            </p>
          ) : (
            <>
              <p className="summary">
                {aiInsight.summary}
              </p>

              <div className="cards">
                {aiInsight.cards?.map((c, i) => (
                  <StatCard
                    key={i}
                    title={c.title}
                    value={c.value}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        <section className="card ml-card">
          <div className="ml-header">
            <SectionHead
              eyebrow="Predictive Model"
              title="ML Insights"
            />

            <span className="ml-badge">
              Linear Regression &amp; Behavioral Scoring
            </span>
          </div>

          {loadingML ? (
            <div className="ml-loading">
              <div className="ml-spinner" />
              <p>
                Running predictive analysis…
              </p>
            </div>
          ) : mlInsight ? (
            <>
              <div className="ml-block">
                <h3 className="ml-subtitle">
                  Borrowing Forecast
                </h3>

                <div className="forecast-row">
                  <div className="forecast-box">
                    <div className="forecast-number">
                      {mlInsight.predictedNextMonth ?? "—"}
                    </div>

                    <div className="forecast-label">
                      Predicted borrows next month
                    </div>
                  </div>

                  <p className="ml-text">
                    {mlInsight.forecastSummary}
                  </p>
                </div>

                {mlData?.monthlyVolume?.length > 0 && (
                  <ResponsiveContainer
                    width="100%"
                    height={200}
                  >
                    <LineChart
                      data={mlData.monthlyVolume}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#E4DFD3"
                      />

                      <XAxis
                        dataKey="month"
                        tick={{
                          fontSize: 11,
                          fill: "#5C5546"
                        }}
                      />

                      <YAxis
                        tick={{
                          fontSize: 11,
                          fill: "#5C5546"
                        }}
                      />

                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #E4DFD3",
                          fontFamily: "Inter, sans-serif"
                        }}
                      />

                      <Legend />

                      <Line
                        type="monotone"
                        dataKey="total_borrows"
                        stroke="#14532D"
                        name="Borrows"
                        dot={false}
                        strokeWidth={2}
                      />

                      <Line
                        type="monotone"
                        dataKey="returned"
                        stroke="#B8860B"
                        name="Returned"
                        dot={false}
                        strokeWidth={2}
                        strokeDasharray="4 2"
                      />

                      <Line
                        type="monotone"
                        dataKey="overdue"
                        stroke="#A13D2B"
                        name="Overdue"
                        dot={false}
                        strokeWidth={2}
                        strokeDasharray="2 2"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="ml-block">
                <h3 className="ml-subtitle">
                  Peak Borrowing Period
                </h3>

                <p className="ml-text">
                  {mlInsight.peakDay}
                </p>

                {mlData?.dowPattern?.length > 0 && (
                  <ResponsiveContainer
                    width="100%"
                    height={220}
                  >
                    <RadarChart
                      data={mlData.dowPattern}
                      outerRadius={80}
                    >
                      <PolarGrid
                        stroke="#E4DFD3"
                      />

                      <PolarAngleAxis
                        dataKey="day_name"
                        tick={{
                          fontSize: 11,
                          fill: "#5C5546"
                        }}
                      />

                      <PolarRadiusAxis
                        tick={{
                          fontSize: 9,
                          fill: "#5C5546"
                        }}
                      />

                      <Radar
                        name="Borrows"
                        dataKey="total"
                        stroke="#14532D"
                        fill="#3E7A4D"
                        fillOpacity={0.5}
                        strokeWidth={2}
                      />

                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #E4DFD3"
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {mlInsight.subjectInsights?.length > 0 && (
                <div className="ml-block">
                  <h3 className="ml-subtitle">
                    Subject Demand Patterns
                  </h3>

                  {mlData?.subjectDemand?.length > 0 && (
                    <ResponsiveContainer
                      width="100%"
                      height={220}
                    >
                      <Treemap
                        data={mlData.subjectDemand}
                        dataKey="total_borrows"
                        nameKey="subject"
                        stroke="#FAF6EE"
                        content={
                          <SubjectTreemapCell
                            colors={SUBJECT_COLORS}
                          />
                        }
                      >
                        <Tooltip
                          contentStyle={{
                            borderRadius: 8,
                            border: "1px solid #E4DFD3"
                          }}
                        />
                      </Treemap>
                    </ResponsiveContainer>
                  )}

                  <div className="insight-grid">
                    {mlInsight.subjectInsights.map(
                      (s, i) => (
                        <div
                          key={i}
                          className="insight-card"
                        >
                          <strong>
                            {s.subject}
                          </strong>

                          <p>
                            {s.insight}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {mlInsight.atRiskStudents?.length > 0 && (
                <div className="ml-block">
                  <h3 className="ml-subtitle">
                    At-Risk Student Detection
                  </h3>

                  <p className="ml-hint">
                    Students flagged by behavioral overdue-rate scoring
                  </p>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>LRN</th>
                          <th>Risk Level</th>
                          <th>Reason</th>
                        </tr>
                      </thead>

                      <tbody>
                        {mlInsight.atRiskStudents.map(
                          (s, i) => (
                            <tr key={i}>
                              <td>
                                {s.name}
                              </td>

                              <td>
                                {s.lrn}
                              </td>

                              <td>
                                <span
                                  className={`badge badge-${s.risk?.toLowerCase()}`}
                                >
                                  {s.risk}
                                </span>
                              </td>

                              <td>
                                {s.reason}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {mlInsight.hotBooks?.length > 0 && (
                <div className="ml-block">
                  <h3 className="ml-subtitle">
                    Book Heat Score
                  </h3>

                  <p className="ml-hint">
                    Ranked by frequency-recency heat scoring algorithm
                  </p>

                  {mlData?.bookHeat?.length > 0 && (
                    <ResponsiveContainer
                      width="100%"
                      height={260}
                    >
                      <RadialBarChart
                        data={mlData.bookHeat.slice(0, 6)}
                        innerRadius="20%"
                        outerRadius="90%"
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar
                          dataKey="heat_score"
                          background={{
                            fill: "#F3EEDF"
                          }}
                          cornerRadius={6}
                        >
                          {mlData.bookHeat
                            .slice(0, 6)
                            .map((_, i) => (
                              <Cell
                                key={i}
                                fill={
                                  HEAT_COLORS[
                                    i % HEAT_COLORS.length
                                  ]
                                }
                              />
                            ))}
                        </RadialBar>

                        <Legend
                          iconSize={10}
                          layout="vertical"
                          verticalAlign="middle"
                          align="right"
                          formatter={(_, entry) =>
                            entry.payload.title
                          }
                          wrapperStyle={{
                            fontSize: 11,
                            color: "#5C5546"
                          }}
                        />

                        <Tooltip
                          contentStyle={{
                            borderRadius: 8,
                            border: "1px solid #E4DFD3"
                          }}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  )}

                  <div className="insight-grid">
                    {mlInsight.hotBooks.map(
                      (b, i) => (
                        <div
                          key={i}
                          className="insight-card hot"
                        >
                          <strong>
                            {b.title}
                          </strong>

                          <p>
                            {b.insight}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {mlInsight.recommendations?.length > 0 && (
                <div
                  className="ml-block"
                  style={{
                    borderBottom: "none",
                    marginBottom: 0,
                    paddingBottom: 0
                  }}
                >
                  <h3 className="ml-subtitle">
                    AI-Generated Recommendations
                  </h3>

                  <div className="rec-grid">
                    {mlInsight.recommendations.map(
                      (r, i) => (
                        <div
                          key={i}
                          className={`rec-card priority-${r.priority?.toLowerCase()}`}
                        >
                          <div className="rec-top">
                            <span className="rec-category">
                              {r.category}
                            </span>

                            <span
                              className={`rec-priority-badge priority-badge-${r.priority?.toLowerCase()}`}
                            >
                              {r.priority} Priority
                            </span>
                          </div>

                          <p>
                            {r.action}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="ml-text">
              No ML data available yet.
            </p>
          )}
        </section>

        <div className="grid">
          <section className="card">
            <SectionHead
              eyebrow="Monthly"
              title="Borrow Trends"
            />

            <ResponsiveContainer
              width="100%"
              height={250}
            >
              <LineChart data={borrowTrends}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E4DFD3"
                />

                <XAxis
                  dataKey="month"
                  tick={{
                    fontSize: 11,
                    fill: "#5C5546"
                  }}
                />

                <YAxis
                  tick={{
                    fontSize: 11,
                    fill: "#5C5546"
                  }}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E4DFD3"
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#14532D"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>

          <section className="card">
            <SectionHead
              eyebrow="Monthly"
              title="User Growth"
            />

            <ResponsiveContainer
              width="100%"
              height={250}
            >
              <LineChart data={userGrowth}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E4DFD3"
                />

                <XAxis
                  dataKey="month"
                  tick={{
                    fontSize: 11,
                    fill: "#5C5546"
                  }}
                />

                <YAxis
                  tick={{
                    fontSize: 11,
                    fill: "#5C5546"
                  }}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E4DFD3"
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#B8860B"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>
        </div>

        <section className="card">
          <SectionHead
            eyebrow="Snapshot"
            title="Borrow Status"
          />

          <ResponsiveContainer
            width="100%"
            height={250}
          >
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                outerRadius={100}
                label
              >
                {statusData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={PIE_COLORS[i]}
                  />
                ))}
              </Pie>

              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #E4DFD3"
                }}
              />

              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <div className="grid">
          <section className="card">
            <SectionHead
              eyebrow="Ranked"
              title="Top Books"
            />

            <Table
              headers={["Title", "Borrows"]}
              data={topBooks.map((b) => [
                b.title,
                b.borrows
              ])}
            />
          </section>

          <section className="card">
            <SectionHead
              eyebrow="Ranked"
              title="Top Borrowers"
            />

            <Table
              headers={["Name", "LRN", "Total"]}
              data={topBorrowers.map((u) => [
                u.full_name,
                u.lrn,
                u.total
              ])}
            />
          </section>
        </div>
      </div>

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

        .admin-main {
          margin-left: 260px;
          padding: 36px 40px 60px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
        }

        .page-head {
          margin-bottom: 28px;
        }

        .eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--gold);
          font-weight: 600;
          margin: 0 0 6px;
        }

        .page-title {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 2.1rem;
          color: var(--forest);
          margin: 0;
          letter-spacing: -0.01em;
        }

        .kpi-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .kpi-card {
          background: white;
          border: 1px solid var(--line);
          border-left: 4px solid var(--ink-soft);
          border-radius: 4px;
          padding: 18px 20px;
        }

        .kpi-card.forest {
          border-left-color: var(--forest);
        }

        .kpi-card.gold {
          border-left-color: var(--gold);
        }

        .kpi-card.espresso {
          border-left-color: var(--rust);
        }

        .kpi-value {
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 600;
          font-size: 1.9rem;
          color: var(--ink);
          line-height: 1;
        }

        .kpi-label {
          font-size: 0.78rem;
          color: var(--ink-soft);
          margin-top: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card {
          background: white;
          border: 1px solid var(--line);
          border-radius: 6px;
          padding: 24px 26px;
          margin-bottom: 20px;
        }

        .section-head {
          margin-bottom: 16px;
        }

        .section-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0 0 3px;
        }

        .section-title {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 1.25rem;
          color: var(--forest);
          margin: 0 0 8px;
          padding-bottom: 10px;
          border-bottom: 2px solid var(--gold);
          display: inline-block;
        }

        .summary {
          margin-bottom: 15px;
          color: var(--ink-soft);
          line-height: 1.6;
        }

        .loading-text {
          color: var(--ink-soft);
          font-style: italic;
        }

        .cards {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .stat {
          background: var(--sage);
          border-radius: 6px;
          padding: 15px 18px;
          min-width: 140px;
        }

        .stat p {
          margin: 0 0 4px;
          font-size: 0.8rem;
          color: var(--ink-soft);
        }

        .stat h2 {
          margin: 0;
          font-family: 'IBM Plex Mono', monospace;
          color: var(--forest);
          font-size: 1.4rem;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.92rem;
        }

        th {
          background: var(--sage);
          padding: 10px 12px;
          text-align: left;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--forest);
          font-weight: 600;
        }

        td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--line);
        }

        tr:hover td {
          background: var(--sage);
        }

        .ml-card {
          border-color: var(--gold-light);
          border-top: 3px solid var(--gold);
        }

        .ml-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .ml-badge {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem;
          background: var(--sage);
          color: var(--forest);
          padding: 5px 12px;
          border-radius: 20px;
          border: 1px solid var(--line);
          font-weight: 600;
          letter-spacing: 0.03em;
          white-space: nowrap;
        }

        .ml-loading {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--ink-soft);
          padding: 10px 0;
        }

        .ml-spinner {
          width: 20px;
          height: 20px;
          border: 3px solid var(--line);
          border-top-color: var(--forest);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          flex-shrink: 0;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .ml-block {
          margin-bottom: 28px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--sage);
        }

        .ml-subtitle {
          font-family: 'Fraunces', serif;
          color: var(--espresso);
          margin: 0 0 10px;
          font-size: 1.02rem;
          font-weight: 600;
        }

        .ml-text {
          color: var(--ink-soft);
          margin-bottom: 12px;
          line-height: 1.55;
        }

        .ml-hint {
          font-size: 0.82rem;
          color: var(--ink-soft);
          margin-bottom: 12px;
          font-style: italic;
        }

        .forecast-row {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .forecast-box {
          background: linear-gradient(
            135deg,
            var(--forest),
            #1f6b3d
          );
          border-radius: 8px;
          padding: 18px 30px;
          text-align: center;
          flex-shrink: 0;
        }

        .forecast-number {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 2.6rem;
          font-weight: 600;
          color: white;
          line-height: 1;
        }

        .forecast-label {
          font-size: 0.76rem;
          color: rgba(255,255,255,0.85);
          margin-top: 6px;
        }

        .insight-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(200px, 1fr)
          );
          gap: 12px;
          margin-top: 12px;
        }

        .insight-card {
          background: var(--sage);
          border-radius: 6px;
          padding: 12px 14px;
          border-left: 3px solid var(--forest-light);
        }

        .insight-card.hot {
          border-left-color: var(--rust);
          background: #FBF1EE;
        }

        .insight-card strong {
          display: block;
          margin-bottom: 5px;
          color: var(--forest);
          font-size: 0.9rem;
          font-family: 'Fraunces', serif;
        }

        .insight-card.hot strong {
          color: var(--rust);
        }

        .insight-card p {
          font-size: 0.82rem;
          color: var(--ink-soft);
          margin: 0;
          line-height: 1.45;
        }

        .table-wrap {
          overflow-x: auto;
        }

        .badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .badge-high {
          background: #FBDCD5;
          color: var(--rust);
        }

        .badge-medium {
          background: #F6E9C9;
          color: #8A6A0F;
        }

        .badge-low {
          background: #DCEADF;
          color: var(--forest);
        }

        .rec-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(260px, 1fr)
          );
          gap: 14px;
        }

        .rec-card {
          background: var(--sage);
          border-radius: 6px;
          padding: 14px 16px;
          border-left: 4px solid var(--forest-light);
        }

        .rec-card.priority-high {
          border-left-color: var(--rust);
          background: #FBF1EE;
        }

        .rec-card.priority-medium {
          border-left-color: var(--gold);
          background: #FBF6E7;
        }

        .rec-card.priority-low {
          border-left-color: var(--forest-light);
        }

        .rec-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          flex-wrap: wrap;
          gap: 6px;
        }

        .rec-category {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem;
          background: white;
          padding: 3px 9px;
          border-radius: 10px;
          color: var(--forest);
          font-weight: 600;
        }

        .rec-priority-badge {
          font-size: 0.68rem;
          padding: 3px 9px;
          border-radius: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .priority-badge-high {
          background: #FBDCD5;
          color: var(--rust);
        }

        .priority-badge-medium {
          background: #F6E9C9;
          color: #8A6A0F;
        }

        .priority-badge-low {
          background: #DCEADF;
          color: var(--forest);
        }

        .rec-card p {
          margin: 0;
          color: var(--ink);
          font-size: 0.88rem;
          line-height: 1.5;
        }

        @media (max-width: 1000px) {
          .admin-main {
            margin-left: 0;
            padding: 24px;
          }

          .kpi-strip {
            grid-template-columns: 1fr 1fr;
          }

          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}

function SectionHead({ eyebrow, title }) {
  return (
    <div className="section-head">
      {eyebrow && (
        <p className="section-eyebrow">
          {eyebrow}
        </p>
      )}

      <h2 className="section-title">
        {title}
      </h2>
    </div>
  );
}

function KpiCard({ label, value, tone }) {
  return (
    <div className={`kpi-card ${tone || ""}`}>
      <div className="kpi-value">
        {value}
      </div>

      <div className="kpi-label">
        {label}
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="stat">
      <p>{title}</p>

      <h2>
        {value || 0}
      </h2>
    </div>
  );
}

function Table({ headers, data }) {
  return (
    <table>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i}>
              {h}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SubjectTreemapCell({
  x,
  y,
  width,
  height,
  index,
  name,
  value,
  colors
}) {
  if (width <= 0 || height <= 0) {
    return null;
  }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={colors[index % colors.length]}
        stroke="#FAF6EE"
        strokeWidth={2}
        rx={4}
      />

      {width > 60 && height > 35 && (
        <>
          <text
            x={x + 8}
            y={y + 18}
            fill="#FFFFFF"
            fontSize={12}
            fontWeight={600}
          >
            {name}
          </text>

          <text
            x={x + 8}
            y={y + 34}
            fill="#FFFFFF"
            fontSize={10}
          >
            {value} borrows
          </text>
        </>
      )}
    </g>
  );
}