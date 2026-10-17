import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clearAuthSession } from "../../utils/auth";
import "./SafetyAlerts.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

function getAlertLevel(report) {
  if (report.priority === "High") return "high";
  if (report.priority === "Medium") return "medium";
  return "low";
}

function getAlertType(report) {
  if (report.priority === "High") return "High Priority";
  if (report.priority === "Medium") return "Safety Warning";
  if (report.status === "Resolved") return "Information";
  return "Area Alert";
}

function formatTimeAgo(date) {
  if (!date) return "Time unavailable";

  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) return "Time unavailable";

  const difference = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getAlertDescription(report) {
  if (report.description?.trim()) return report.description;

  return `A ${(
    report.incidentType || "public safety"
  ).toLowerCase()} incident has been reported. Status: ${
    report.status || "Under Review"
  }.`;
}

function SafetyAlerts() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState("All Alerts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReports = useCallback(async () => {
  setLoading(true);
  setError("");

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken");

  if (!token) {
    setReports([]);
    setError("Please log in to view safety alerts.");
    setLoading(false);
    return;
  }

  try {
    // Fetch public safety alerts, not private citizen reports.
    const response = await fetch(`${API_URL}/api/reports/community`, {
  headers: {
    Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Unable to load safety alerts (${response.status}).`
      );
    }

    
if (!Array.isArray(data.incidents)) {
  throw new Error(
    "The server response did not contain an incidents list."
  );
}

setReports(
  data.incidents.sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
  )
);
  } catch (err) {
    console.error("Safety alerts loading error:", err);
    setError(err.message || "Unable to load safety alerts.");
    setReports([]);
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const alerts = useMemo(
    () =>
      reports.map((report) => ({
        ...report,
        alertType: getAlertType(report),
        level: getAlertLevel(report),
        alertTitle:
          report.title ||
          `${report.incidentType || "Public safety"} incident reported`,
        location:
          report.location?.address || "Location not provided",
        time: formatTimeAgo(report.createdAt),
        alertDescription: getAlertDescription(report),
      })),
    [reports]
  );

  const filteredAlerts = useMemo(() => {
    if (filter === "All Alerts") return alerts;

    return alerts.filter((alert) => alert.alertType === filter);
  }, [alerts, filter]);

  const activeCount = alerts.length;

  const warningCount = alerts.filter(
    (alert) =>
      alert.priority === "High" || alert.priority === "Medium"
  ).length;

  // These are distinct locations represented by reports, not a
  // GPS-based measurement of nearby areas.
  const areaCount = new Set(
    alerts
      .map((alert) => alert.location.trim().toLowerCase())
      .filter((location) => location && location !== "location not provided")
  ).size;

  return (
    <div className="alerts-page">
      <aside className="alerts-sidebar">
        <Link to="/" className="alerts-logo">
          Civic<span>Shield</span>
        </Link>

        <nav className="alerts-nav">
          <Link to="/citizen/dashboard">
            ⌂ <span>Dashboard</span>
          </Link>

          <Link to="/citizen/report">
            ＋ <span>Report Incident</span>
          </Link>

          <Link to="/citizen/reports">
            ▣ <span>My Reports</span>
          </Link>

          <Link to="/citizen/map">
            ⌖ <span>Safety Map</span>
          </Link>

          <Link to="/citizen/alerts" className="active">
            ✦ <span>Safety Alerts</span>
          </Link>
        </nav>

        <div className="alerts-bottom-nav">
          <Link to="/citizen/profile">
            ◯ <span>Profile</span>
          </Link>

          <Link to="/login" onClick={clearAuthSession}>
            ↪ <span>Logout</span>
          </Link>
        </div>
      </aside>

      <main className="alerts-main">
        <header className="alerts-header">
          <div>
            <h1>Safety Alerts</h1>
            <p>
              Stay informed about reported safety incidents and updates.
            </p>
          </div>

          <Link to="/citizen/report" className="alert-report-btn">
            + Report Incident
          </Link>
        </header>

        <section className="alert-summary">
          <div className="summary-card">
            <span className="summary-icon">!</span>
            <div>
              <strong>{loading ? "…" : activeCount}</strong>
              <p>Active Reports</p>
            </div>
          </div>

          <div className="summary-card">
            <span className="summary-icon warning">⚠</span>
            <div>
              <strong>{loading ? "…" : warningCount}</strong>
              <p>High/Medium Priority</p>
            </div>
          </div>

          <div className="summary-card">
            <span className="summary-icon info">●</span>
            <div>
              <strong>{loading ? "…" : areaCount}</strong>
              <p>Reported Locations</p>
            </div>
          </div>
        </section>

        <div className="alerts-filter">
          <div>
            <p>Public safety notices and updates published by officials.</p>
          </div>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter safety alerts"
          >
            <option>All Alerts</option>
            <option>High Priority</option>
            <option>Safety Warning</option>
            <option>Area Alert</option>
            <option>Information</option>
          </select>
        </div>

        {error && (
          <div className="alert-empty" role="alert">
            <p>{error}</p>
            <button type="button" className="try-again-btn" onClick={fetchReports}>
              Try Again
            </button>
          </div>
        )}

        <section className="alerts-list">
          {loading ? (
            <p role="status">Loading safety alerts...</p>
          ) : !error && filteredAlerts.length === 0 ? (
            <div className="alert-empty">
              <h3>
                {alerts.length === 0
                  ? "No incident reports yet"
                  : "No alerts match this filter"}
              </h3>
              <p>
                {alerts.length === 0
                  ? "Submitted incident reports will appear here."
                  : "Choose another alert type to see more reports."}
              </p>
              
            </div>
          ) : (
            filteredAlerts.map((alert, index) => (
              <article
                className={`alert-card ${alert.level}`}
                key={alert._id || index}
              >
                <div className="alert-card-icon">
                  {alert.level === "high"
                    ? "!"
                    : alert.level === "medium"
                      ? "⚠"
                      : "i"}
                </div>

                <div className="alert-content">
                  <div className="alert-top">
                    <span className={`alert-badge ${alert.level}`}>
                      {alert.alertType}
                    </span>

                    <span className="alert-time">
                      {alert.time}
                    </span>
                  </div>

                  <h3>{alert.alertTitle}</h3>

                  <div className="alert-location">
                    📍 {alert.location}
                  </div>

                  <p>{alert.alertDescription}</p>

                  <p className="alert-status">
                    Status: {alert.status || "Under Review"}
                  </p>

                  <Link
                    to="/citizen/map"
                    className="view-map-link"
                  >
                    View on Safety Map →
                  </Link>
                </div>
              </article>
            ))
          )}
        </section>

        <div className="alert-reminder">
          <div className="reminder-icon">✓</div>
          <div>
            <h3>Stay aware. Stay safe.</h3>
            <p>
              These notices are based on submitted reports and are not
              independently verified emergency alerts. Always contact
              appropriate emergency services when immediate assistance
              is required.
            </p>
          </div>
        </div>

        <button
          type="button"
           className="refresh-alerts-btn"
          onClick={fetchReports}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Alerts"}
        </button>
      </main>
    </div>
  );
}

export default SafetyAlerts;