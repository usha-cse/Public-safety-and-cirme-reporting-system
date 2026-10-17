import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clearAuthSession } from "../../utils/auth";
import "./Analysis.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const PERIOD_OPTIONS = [
  { label: "Last 7 Days", value: "7" },
  { label: "Last 30 Days", value: "30" },
  { label: "Last 3 Months", value: "90" },
  { label: "This Year", value: "year" },
  { label: "All Time", value: "all" },
];

const STATUSES = [
  "Under Review",
  "Assigned",
  "Investigation",
  "Resolved",
];

const CATEGORIES = [
  { name: "Crime", matches: ["crime"] },
  { name: "Suspicious Activity", matches: ["suspicious"] },
  { name: "Safety Hazards", matches: ["safety hazard", "hazard"] },
  { name: "Public Safety", matches: ["public safety"] },
  { name: "Traffic Incidents", matches: ["traffic"] },
  { name: "Other", matches: ["other"] },
];

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

async function apiRequest(endpoint) {
  const token = getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Your session has expired or you do not have permission to view analytics."
    );
  }

  if (!response.ok) {
    throw new Error(data.message || "Unable to load analytics.");
  }

  return data;
}

function normalizeStatus(status) {
  const value = String(status || "Under Review").toLowerCase();

  return STATUSES.find((item) => item.toLowerCase() === value) ||
    "Under Review";
}

function normalizePriority(priority) {
  const value = String(priority || "Medium").toLowerCase();

  if (value === "high") return "High";
  if (value === "low") return "Low";

  return "Medium";
}

function normalizeCategory(type) {
  const value = String(type || "Other").toLowerCase();

  if (value.includes("suspicious")) return "Suspicious Activity";
  if (value.includes("hazard")) return "Safety Hazards";
  if (value.includes("traffic")) return "Traffic Incidents";
  if (value.includes("public safety")) return "Public Safety";
  if (value.includes("crime")) return "Crime";

  return "Other";
}

function getReportDate(report) {
  if (!report.createdAt) return null;

  const date = new Date(report.createdAt);

  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinPeriod(date, period) {
  if (!date) return false;

  const now = new Date();

  if (period === "all") return true;

  if (period === "year") {
    return date.getFullYear() === now.getFullYear();
  }

  const days = Number(period);
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  return date >= start && date <= now;
}

function getPeriodLabel(period) {
  return (
    PERIOD_OPTIONS.find((option) => option.value === period)?.label ||
    "Last 30 Days"
  );
}

function getChartDays(period) {
  if (period === "7") return 7;
  if (period === "90") return 7;
  if (period === "year") return 12;
  if (period === "all") return 7;

  return 7;
}

function getChartData(reports, period) {
  const now = new Date();
  const buckets = [];
  const count = getChartDays(period);

  if (period === "year") {
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

      buckets.push({
        key: `${date.getFullYear()}-${date.getMonth()}`,
        day: date.toLocaleDateString(undefined, { month: "short" }),
        value: 0,
        start: date,
        end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
      });
    }
  } else if (period === "90" || period === "all") {
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i * 7);
      date.setHours(0, 0, 0, 0);

      const start = new Date(date);
      start.setDate(start.getDate() - 6);

      buckets.push({
        key: start.toISOString().slice(0, 10),
        day: `${start.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}`,
        value: 0,
        start,
        end: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
      });
    }
  } else {
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      buckets.push({
        key: date.toISOString().slice(0, 10),
        day: date.toLocaleDateString(undefined, { weekday: "short" }),
        value: 0,
        start: date,
        end: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
      });
    }
  }

  reports.forEach((report) => {
    const date = getReportDate(report);
    if (!date) return;

    const bucket = buckets.find(
      (item) => date >= item.start && date < item.end
    );

    if (bucket) bucket.value += 1;
  });

  return buckets;
}

function Analytics() {
  const [reports, setReports] = useState([]);
  const [period, setPeriod] = useState("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/reports");

      const items = Array.isArray(data)
        ? data
        : data.reports || data.data || [];

      setReports(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err.message || "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filteredReports = useMemo(
    () =>
      reports.filter((report) =>
        isWithinPeriod(getReportDate(report), period)
      ),
    [reports, period]
  );

  const summary = useMemo(() => {
    const total = filteredReports.length;
    const highPriority = filteredReports.filter(
      (report) => normalizePriority(report.priority) === "High"
    ).length;

    const resolved = filteredReports.filter(
      (report) => normalizeStatus(report.status) === "Resolved"
    ).length;

    const resolutionRate = total
      ? ((resolved / total) * 100).toFixed(1)
      : "0.0";

    return { total, highPriority, resolved, resolutionRate };
  }, [filteredReports]);

  const categories = useMemo(() => {
    const counts = CATEGORIES.map((category) => ({
      name: category.name,
      count: filteredReports.filter(
        (report) =>
          normalizeCategory(report.incidentType || report.type) ===
          category.name
      ).length,
    })).filter((category) => category.count > 0);

    const total = counts.reduce((sum, category) => sum + category.count, 0);

    return counts
      .map((category) => ({
        ...category,
        value: total
          ? Math.round((category.count / total) * 100)
          : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredReports]);

  const weeklyReports = useMemo(
    () => getChartData(filteredReports, period),
    [filteredReports, period]
  );

  const maxChartValue = Math.max(
    1,
    ...weeklyReports.map((item) => item.value)
  );

  const priorities = useMemo(() => {
    return ["High", "Medium", "Low"].map((priority) => ({
      name: priority,
      count: filteredReports.filter(
        (report) => normalizePriority(report.priority) === priority
      ).length,
    }));
  }, [filteredReports]);

  const statusCounts = useMemo(() => {
    return STATUSES.map((status) => ({
      name: status,
      count: filteredReports.filter(
        (report) => normalizeStatus(report.status) === status
      ).length,
    }));
  }, [filteredReports]);

  const aiMetrics = useMemo(() => {
    const classified = filteredReports.filter(
      (report) =>
        report.aiAnalysis &&
        (typeof report.aiAnalysis === "object" ||
          typeof report.aiAnalysis === "string")
    ).length;

    const urgencyAssessed = filteredReports.filter((report) => {
      const analysis = report.aiAnalysis;

      if (!analysis || typeof analysis !== "object") return false;

      return Boolean(
        analysis.urgency ||
          analysis.urgencyLevel ||
          analysis.priority ||
          analysis.riskLevel
      );
    }).length;

    const potentialDuplicates = filteredReports.filter((report) => {
      const analysis = report.aiAnalysis;

      if (!analysis || typeof analysis !== "object") return false;

      return Boolean(
        analysis.potentialDuplicate ||
          analysis.isDuplicate ||
          analysis.duplicateOf
      );
    }).length;

    return { classified, urgencyAssessed, potentialDuplicates };
  }, [filteredReports]);

  return (
    <div className="analytics-page">
      {/* Sidebar */}
      <aside className="official-sidebar">
        <div className="official-logo">
          Civic<span>Shield</span>
        </div>

        <div className="official-role">
          <span className="role-dot"></span>
          Authorized Official
        </div>

        <nav className="official-nav">
          <Link to="/official/dashboard">
            ▦ <span>Dashboard</span>
          </Link>

          <Link to="/official/reports">
            ▣ <span>All Reports</span>
          </Link>

          <Link to="/official/assigned-cases">
            ◉ <span>Assigned Cases</span>
          </Link>

          <Link to="/official/cases">
            ◈ <span>Case Management</span>
          </Link>

          <Link to="/official/map">
            ⌖ <span>Incident Map</span>
          </Link>

          <Link to="/official/alerts">
            ! <span>Alerts</span>
          </Link>

          <Link to="/official/analytics" className="active">
            ◒ <span>Analytics</span>
          </Link>
        </nav>

        <div className="official-bottom">
          <Link to="/official/profile">
            ◯ <span>Profile</span>
          </Link>

          <Link to="/login" onClick={clearAuthSession}>
            ↪ <span>Logout</span>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="analytics-main">
        <header className="analytics-header">
          <div>
            <p className="page-label">SYSTEM INSIGHTS</p>
            <h1>Analytics</h1>
            <p className="page-description">
              Overview of reported incidents and case activity.
            </p>
          </div>

          <div className="analytics-header-actions">
            <select
              className="period-select"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              aria-label="Analytics date range"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="analytics-refresh"
              onClick={fetchReports}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </header>

        {error && (
          <div className="analytics-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={fetchReports}>
              Retry
            </button>
          </div>
        )}

        {/* Summary */}
        <section className="analytics-summary">
          <div className="analytics-stat">
            <span>Total Reports</span>
            <strong>{summary.total}</strong>
            <small>{getPeriodLabel(period)}</small>
          </div>

          <div className="analytics-stat">
            <span>High Priority</span>
            <strong>{summary.highPriority}</strong>
            <small>Require closer review</small>
          </div>

          <div className="analytics-stat">
            <span>Resolved</span>
            <strong>{summary.resolved}</strong>
            <small>Resolved reports</small>
          </div>

          <div className="analytics-stat">
            <span>Resolution Rate</span>
            <strong>{summary.resolutionRate}%</strong>
            <small>Of reports in selected period</small>
          </div>
        </section>

        {loading && reports.length === 0 ? (
          <div className="analytics-loading">Loading analytics...</div>
        ) : (
          <>
            {/* Charts */}
            <section className="analytics-grid">
              <div className="analytics-card weekly-card">
                <div className="analytics-card-header">
                  <div>
                    <h2>Reports Over Time</h2>
                    <p>
                      Reports received during {getPeriodLabel(period).toLowerCase()}.
                    </p>
                  </div>

                  <span className="chart-label">
                    {weeklyReports.reduce((sum, item) => sum + item.value, 0)}{" "}
                    Reports
                  </span>
                </div>

                <div className="bar-chart">
                  {weeklyReports.map((item) => (
                    <div className="bar-column" key={item.key}>
                      <span className="bar-value">{item.value}</span>

                      <div className="bar-area">
                        <div
                          className="bar"
                          style={{
                            height: `${Math.max(
                              item.value ? 5 : 0,
                              (item.value / maxChartValue) * 140
                            )}px`,
                          }}
                          title={`${item.value} reports`}
                        ></div>
                      </div>

                      <span className="bar-day">{item.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-card-header">
                  <div>
                    <h2>Incident Categories</h2>
                    <p>Distribution by reported incident type.</p>
                  </div>
                </div>

                <div className="category-list">
                  {categories.length === 0 ? (
                    <p className="analytics-empty">
                      No category data for this period.
                    </p>
                  ) : (
                    categories.map((category) => (
                      <div className="category-item" key={category.name}>
                        <div className="category-info">
                          <span>{category.name}</span>
                          <strong>{category.count}</strong>
                        </div>

                        <div className="category-bar">
                          <div
                            className="category-fill"
                            style={{ width: `${category.value}%` }}
                          ></div>
                        </div>

                        <small>{category.value}%</small>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* Priority + Status */}
            <section className="analytics-grid lower-grid">
              <div className="analytics-card">
                <div className="analytics-card-header">
                  <div>
                    <h2>Priority Breakdown</h2>
                    <p>Reports grouped by urgency level.</p>
                  </div>
                </div>

                <div className="priority-overview">
                  {priorities.map((priority) => (
                    <div className="priority-item" key={priority.name}>
                      <div
                        className={`priority-circle ${priority.name.toLowerCase()}`}
                      >
                        {priority.count}
                      </div>

                      <div>
                        <strong>{priority.name}</strong>
                        <span>Priority reports</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analytics-card">
                <div className="analytics-card-header">
                  <div>
                    <h2>Case Status</h2>
                    <p>Current state of submitted reports.</p>
                  </div>
                </div>

                <div className="status-list">
                  {statusCounts.map((status) => (
                    <div className="status-row" key={status.name}>
                      <div>
                        <span
                          className={`status-indicator ${status.name
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        ></span>
                        {status.name}
                      </div>

                      <strong>{status.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* AI Analytics */}
            <section className="ai-analytics-card">
              <div className="ai-analytics-icon">✦</div>

              <div className="ai-analytics-content">
                <div>
                  <h2>AI-Assisted Analysis Overview</h2>
                  <p>
                    Metrics derived from AI analysis data saved with reports.
                    These values depend on the fields your backend records.
                  </p>
                </div>

                <div className="ai-metrics">
                  <div>
                    <strong>{aiMetrics.classified}</strong>
                    <span>Reports with AI Analysis</span>
                  </div>

                  <div>
                    <strong>{aiMetrics.urgencyAssessed}</strong>
                    <span>With Urgency Assessment</span>
                  </div>

                  <div>
                    <strong>{aiMetrics.potentialDuplicates}</strong>
                    <span>Potential Duplicates Flagged</span>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Responsible AI */}
        <section className="analytics-note">
          <div className="note-icon">✓</div>

          <div>
            <h3>Analytics and Responsible AI</h3>
            <p>
              Analytics summarize reported incidents and system activity.
              AI-assisted metrics support authorized officials and should not
              be interpreted as independent determinations of guilt, criminal
              responsibility, or case outcomes.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Analytics;