import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { clearAuthSession } from "../../utils/auth";
import "./OfficialDashboard.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const REFRESH_INTERVAL = 30000;

function getReportId(report) {
  return report._id || report.id;
}

function getDisplayId(report) {
  if (report.reportId) return report.reportId;

  const id = String(getReportId(report) || "");
  return id ? `CS-${id.slice(-6).toUpperCase()}` : "New report";
}

function getLocation(report) {
  if (typeof report.location === "string") {
    return report.location;
  }

  if (report.location?.address) {
    return report.location.address;
  }

  if (
    report.location?.latitude != null &&
    report.location?.longitude != null
  ) {
    return `${report.location.latitude}, ${report.location.longitude}`;
  }

  return "Location not provided";
}

function getStatus(report) {
  return report.status || "Under Review";
}

function getPriority(report) {
  return report.priority || "Medium";
}

function getTimeAgo(dateValue) {
  if (!dateValue) return "Time unavailable";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString();
}

function getStatusClass(status) {
  return String(status)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getPriorityClass(priority) {
  return String(priority).toLowerCase();
}

function OfficialDashboard() {
   const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const officialName =
    storedUser.name ||
    storedUser.fullName ||
    storedUser.username ||
    "Authorized Official";

  const officialInitials = officialName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchReports = useCallback(async (isBackgroundRefresh = false) => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please sign in to view official reports.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isBackgroundRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(`${API_URL}/api/reports`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || `Unable to load reports (${response.status}).`
        );
      }

      // Support either an array response or a { reports: [...] } response.
      const reportList = Array.isArray(data)
        ? data
        : Array.isArray(data.reports)
          ? data.reports
          : Array.isArray(data.data)
            ? data.data
            : null;

      if (!reportList) {
        throw new Error(
          "The reports API did not return a list. Check the GET /api/reports response."
        );
      }

      const sortedReports = [...reportList].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setReports(sortedReports);
      setError("");
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Official dashboard reports error:", err);
      setError(err.message || "Could not load citizen reports.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();

    const intervalId = setInterval(() => {
      fetchReports(true);
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchReports]);

  const normalizedStatus = (report) =>
    String(getStatus(report)).trim().toLowerCase();

  const totalReports = reports.length;

  const pendingReports = reports.filter((report) =>
    ["under review", "pending review", "pending"].includes(
      normalizedStatus(report)
    )
  ).length;

  const assignedCases = reports.filter((report) => {
    const status = normalizedStatus(report);

    return (
      ["assigned", "investigation", "in progress"].includes(status) ||
      Boolean(report.assignedTo)
    );
  }).length;

  const resolvedReports = reports.filter(
    (report) => normalizedStatus(report) === "resolved"
  ).length;

  const classifiedReports = reports.filter(
    (report) => report.aiAnalysis
  ).length;

  const urgentReports = reports.filter(
    (report) => getPriority(report).toLowerCase() === "high"
  ).length;

  const duplicateReports = reports.filter(
    (report) =>
      report.possibleDuplicate === true ||
      report.isDuplicate === true ||
      report.aiAnalysis?.possibleDuplicate === true ||
      report.aiAnalysis?.isDuplicate === true
  ).length;

  const stats = [
    {
      label: "Total Reports",
      value: totalReports,
      description: "All submitted reports",
      icon: "!",
      color: "red",
    },
    {
      label: "Pending Review",
      value: pendingReports,
      description: "Awaiting official review",
      icon: "◷",
      color: "orange",
    },
    {
      label: "Assigned Cases",
      value: assignedCases,
      description: "Currently being handled",
      icon: "◉",
      color: "blue",
    },
    {
      label: "Resolved",
      value: resolvedReports,
      description: "Successfully closed cases",
      icon: "✓",
      color: "green",
    },
  ];

  return (
    <div className="official-dashboard">
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
          <Link to="/official/dashboard" className="active">
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

          <Link to="/official/analytics">
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

      {/* Main Content */}
      <main className="official-main">
        {/* Header */}
        <header className="official-header">
          <div>
            <p className="official-label">OFFICIAL PORTAL</p>
            <h1>Dashboard</h1>
            <p className="official-subtitle">
              Review and manage reported public-safety incidents.
            </p>
          </div>

          <div className="official-user">
            <div className="official-avatar">{officialInitials}</div>
            <div>
              <strong>{officialName}</strong>
              <span>Case Management</span>
            </div>
            </div>
        </header>

        {/* Statistics */}
        <section className="official-stats">
          {stats.map((stat) => (
            <div className="official-stat-card" key={stat.label}>
              <div className={`stat-icon ${stat.color}`}>
                {stat.icon}
              </div>

              <div>
                <span>{stat.label}</span>
                <strong>
                  {loading && reports.length === 0 ? "—" : stat.value}
                </strong>
                <small>{stat.description}</small>
              </div>
            </div>
          ))}
        </section>

        {/* Main Grid */}
        <section className="official-content-grid">
          {/* Recent Citizen Reports */}
          <div className="official-panel reports-panel">
            <div className="panel-header">
              <div>
                <h2>Recent Reports</h2>
                <p>Latest incidents submitted by citizens.</p>
              </div>

              <Link to="/official/reports">View All →</Link>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "12px",
              }}
            >
              <small>
                {lastUpdated
                  ? `Last updated ${lastUpdated.toLocaleTimeString()}`
                  : "Connecting to reports database…"}
              </small>

              <button
                type="button"
                onClick={() => fetchReports(true)}
                disabled={loading || refreshing}
                style={{
                  border: "1px solid #dbe3ec",
                  borderRadius: "7px",
                  padding: "7px 12px",
                  background: "#fff",
                  cursor: loading || refreshing ? "wait" : "pointer",
                }}
              >
                {refreshing ? "Refreshing…" : "↻ Refresh"}
              </button>
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  padding: "12px",
                  marginBottom: "12px",
                  borderRadius: "8px",
                  background: "#fff1f0",
                  color: "#b42318",
                }}
              >
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => fetchReports()}
                  style={{ marginTop: "8px" }}
                >
                  Try again
                </button>
              </div>
            )}

            <div className="official-report-list">
              {loading && reports.length === 0 ? (
                <p style={{ padding: "20px" }}>
                  Loading citizen reports…
                </p>
              ) : reports.length === 0 && !error ? (
                <div style={{ padding: "24px", textAlign: "center" }}>
                  <h3>No citizen reports yet</h3>
                  <p>
                    Reports submitted through CivicShield will appear here.
                  </p>
                </div>
              ) : (
                reports.slice(0, 5).map((report, index) => {
                  const id = getReportId(report);
                  const title =
                    report.title || report.description || "Untitled report";
                  const priority = getPriority(report);
                  const status = getStatus(report);
                  const type = report.incidentType || report.type || "Other";

                  return (
                    <div
                      className="official-report"
                      key={id || `${title}-${index}`}
                    >
                      <div className="report-priority">
                        <span
                          className={`priority-dot ${getPriorityClass(
                            priority
                          )}`}
                        ></span>
                      </div>

                      <div className="official-report-info">
                        <div className="report-title-row">
                          <h3>{title}</h3>
                          <span className="report-id">
                            {getDisplayId(report)}
                          </span>
                        </div>

                        <p className="report-location">
                          📍 {getLocation(report)}
                        </p>

                        <div className="report-meta">
                          <span>{type}</span>

                          <span
                            className={`priority-text ${getPriorityClass(
                              priority
                            )}`}
                          >
                            {priority} Priority
                          </span>

                          <span>
                            {getTimeAgo(
                              report.createdAt || report.updatedAt
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="report-status">
                        <span
                          className={`status-pill ${getStatusClass(status)}`}
                        >
                          {status}
                        </span>

                        {id ? (
                          <Link to={`/official/reports/${id}`}>
                            Review
                          </Link>
                        ) : (
                          <span>Unavailable</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* AI Overview */}
          <div className="official-panel ai-panel">
            <div className="panel-header">
              <div>
                <h2>AI Assistance</h2>
                <p>Decision-support overview</p>
              </div>
            </div>

            <div className="ai-status">
              <div className="ai-status-icon">✦</div>
              <div>
                <strong>Analysis Overview</strong>
                <span>
                  Counts are based on the reports returned by the backend.
                </span>
              </div>
            </div>

            <div className="ai-item">
              <div>
                <strong>Incident Classification</strong>
                <span>Reports with AI analysis data</span>
              </div>
              <b>{classifiedReports}</b>
            </div>

            <div className="ai-item">
              <div>
                <strong>Urgency Assessment</strong>
                <span>Reports marked High priority</span>
              </div>
              <b>{urgentReports}</b>
            </div>

            <div className="ai-item">
              <div>
                <strong>Potential Duplicates</strong>
                <span>Reports explicitly flagged as duplicates</span>
              </div>
              <b>{duplicateReports}</b>
            </div>

            <div className="ai-note">
              AI suggestions are provided as decision support. Authorized
              officials make final decisions.
            </div>
          </div>
        </section>

        {/* Bottom Section */}
        <section className="official-bottom-grid">
          <div className="official-panel quick-panel">
            <div className="panel-header">
              <div>
                <h2>Quick Actions</h2>
                <p>Frequently used case-management actions.</p>
              </div>
            </div>

            <div className="quick-actions">
              <Link to="/official/reports">
                <span>▣</span>
                Review Reports
              </Link>

              <Link to="/official/assigned-cases">
                <span>◉</span>
                Assigned Cases
              </Link>

              <Link to="/official/map">
                <span>⌖</span>
                View Incident Map
              </Link>
            </div>
          </div>

          <div className="official-panel reminder-panel">
            <div className="reminder-symbol">✓</div>

            <div>
              <h2>Responsible Case Handling</h2>
              <p>
                AI-generated classifications and urgency assessments
                should be reviewed by authorized officials before taking
                action. The system does not determine guilt or criminal
                responsibility.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default OfficialDashboard;