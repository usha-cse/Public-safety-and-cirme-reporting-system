import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clearAuthSession } from "../../utils/auth";
import "./Alerts.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const ACKNOWLEDGED_KEY = "civicshield_acknowledged_alerts";

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
      "Your session has expired or you do not have permission to view reports."
    );
  }

  if (!response.ok) {
    throw new Error(data.message || "Failed to load incident alerts.");
  }

  return data;
}

function getAcknowledgedIds() {
  try {
    const saved = localStorage.getItem(ACKNOWLEDGED_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function getPriority(report) {
  const priority = String(report.priority || "Medium").toLowerCase();

  if (priority === "high") return "High";
  if (priority === "low") return "Low";

  return "Medium";
}

function getLocation(report) {
  const location = report.location;

  if (!location) return "Location not provided";
  if (typeof location === "string") return location;

  if (location.address) return location.address;

  if (location.latitude != null && location.longitude != null) {
    return `${location.latitude}, ${location.longitude}`;
  }

  return "Location not provided";
}

function getTimeAgo(dateValue) {
  if (!dateValue) return "Time unavailable";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "Time unavailable";

  const difference = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);

  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString();
}

function createAlert(report) {
  const reportId = String(report._id || report.id || "");

  const priority = getPriority(report);
  const incidentType = report.incidentType || "Incident";
  const area = getLocation(report);
  const status = report.status || "Under Review";

  let alertType = "Incident Report";
  let title = report.title || `${incidentType} reported`;
  let description =
    report.description || "An incident has been submitted for review.";

  if (/traffic/i.test(incidentType)) {
    alertType = "Traffic Warning";
  } else if (/hazard|safety/i.test(incidentType)) {
    alertType = "Safety Warning";
  } else if (/suspicious/i.test(incidentType)) {
    alertType = "Incident Activity";
  } else if (/crime/i.test(incidentType)) {
    alertType = "Public Safety";
  }

  return {
    id: `ALT-${reportId}`,
    reportId,
    title,
    description,
    area,
    priority,
    type: alertType,
    time: getTimeAgo(report.createdAt),
    originalStatus: status,
    acknowledged: false,
    createdAt: report.createdAt,
  };
}

function Alerts() {
  const [reports, setReports] = useState([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState(
    () => getAcknowledgedIds()
  );
  const [filter, setFilter] = useState("All Alerts");
  const [search, setSearch] = useState("");
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
      setError(err.message || "Unable to load alerts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const alerts = useMemo(() => {
    return reports
      .filter((report) => report.status !== "Resolved")
      .map((report) => {
        const alert = createAlert(report);

        return {
          ...alert,
          acknowledged: acknowledgedIds.has(alert.id),
          status: acknowledgedIds.has(alert.id)
            ? "Acknowledged"
            : alert.priority === "Low"
            ? "Monitoring"
            : "Active",
        };
      })
      .sort((a, b) => {
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };

        if (a.acknowledged !== b.acknowledged) {
          return a.acknowledged ? 1 : -1;
        }

        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }

        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [reports, acknowledgedIds]);

  const visibleAlerts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return alerts.filter((alert) => {
      const matchesSearch =
        !query ||
        [
          alert.title,
          alert.description,
          alert.area,
          alert.type,
          alert.priority,
          alert.reportId,
        ].some((value) => String(value || "").toLowerCase().includes(query));

      let matchesFilter = true;

      if (filter === "High Priority") {
        matchesFilter = alert.priority === "High";
      } else if (filter === "Medium Priority") {
        matchesFilter = alert.priority === "Medium";
      } else if (filter === "Low Priority") {
        matchesFilter = alert.priority === "Low";
      } else if (filter === "Unacknowledged") {
        matchesFilter = !alert.acknowledged;
      } else if (filter === "Acknowledged") {
        matchesFilter = alert.acknowledged;
      }

      return matchesSearch && matchesFilter;
    });
  }, [alerts, filter, search]);

  const summary = useMemo(() => {
    const active = alerts.filter(
      (alert) => !alert.acknowledged && alert.status === "Active"
    );

    const monitoring = alerts.filter(
      (alert) => !alert.acknowledged && alert.status === "Monitoring"
    );

    const highPriority = alerts.filter(
      (alert) => alert.priority === "High" && !alert.acknowledged
    );

    const affectedAreas = new Set(
      alerts
        .map((alert) => alert.area)
        .filter((area) => area !== "Location not provided")
    );

    return {
      active: active.length,
      highPriority: highPriority.length,
      areasAffected: affectedAreas.size,
      monitoring: monitoring.length,
    };
  }, [alerts]);

  function acknowledgeAlert(alertId) {
    const updated = new Set(acknowledgedIds);
    updated.add(alertId);

    setAcknowledgedIds(updated);

    try {
      localStorage.setItem(
        ACKNOWLEDGED_KEY,
        JSON.stringify([...updated])
      );
    } catch {
      setError(
        "The acknowledgement could not be saved in this browser."
      );
    }
  }

  return (
    <div className="official-alerts-page">
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

          <Link to="/official/alerts" className="active">
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

      {/* Main */}
      <main className="official-alerts-main">
        <header className="official-alerts-header">
          <div>
            <p className="page-label">SYSTEM NOTIFICATIONS</p>
            <h1>Alerts</h1>
            <p className="page-description">
              Monitor important incident and public safety alerts.
            </p>
          </div>

          <div className="alerts-status">
            <span></span>
            {loading ? "Loading alerts..." : "Alert Monitoring Active"}
          </div>
        </header>

        {/* Dynamic summary */}
        <section className="alerts-summary">
          <div className="alert-stat">
            <span>Active Alerts</span>
            <strong>{summary.active}</strong>
            <small>Awaiting acknowledgement</small>
          </div>

          <div className="alert-stat">
            <span>High Priority</span>
            <strong>{summary.highPriority}</strong>
            <small>Require attention</small>
          </div>

          <div className="alert-stat">
            <span>Areas Affected</span>
            <strong>{summary.areasAffected}</strong>
            <small>Reported locations</small>
          </div>

          <div className="alert-stat">
            <span>Monitoring</span>
            <strong>{summary.monitoring}</strong>
            <small>Low-priority alerts</small>
          </div>
        </section>

        {error && (
          <div className="alerts-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={fetchReports}>
              Retry
            </button>
          </div>
        )}

        {/* Alerts card */}
        <section className="alerts-card">
          <div className="alerts-card-header">
            <div>
              <h2>Incident Alerts</h2>
              <p>
                Alerts generated from unresolved reports in CivicShield.
              </p>
            </div>

            <button
              type="button"
              className="alerts-refresh-button"
              onClick={fetchReports}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="alerts-controls">
            <input
              type="search"
              placeholder="Search alerts, areas, or incident types..."
              aria-label="Search alerts"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              className="alert-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter alerts"
            >
              <option>All Alerts</option>
              <option>High Priority</option>
              <option>Medium Priority</option>
              <option>Low Priority</option>
              <option>Unacknowledged</option>
              <option>Acknowledged</option>
            </select>
          </div>

          <div className="alert-list">
            {loading && reports.length === 0 ? (
              <div className="alerts-empty">
                Loading incident alerts...
              </div>
            ) : visibleAlerts.length === 0 ? (
              <div className="alerts-empty">
                {alerts.length === 0
                  ? "No unresolved incident reports are available to generate alerts."
                  : "No alerts match your search or selected filter."}
              </div>
            ) : (
              visibleAlerts.map((alert) => (
                <div
                  className={`alert-item ${alert.priority.toLowerCase()}`}
                  key={alert.id}
                >
                  <div className="alert-icon">
                    {alert.priority === "High"
                      ? "!"
                      : alert.priority === "Medium"
                      ? "•"
                      : "i"}
                  </div>

                  <div className="alert-content">
                    <div className="alert-title-row">
                      <div>
                        <h3>{alert.title}</h3>
                        <span className="alert-id">
                          Report: {alert.reportId}
                        </span>
                      </div>

                      <span
                        className={`alert-priority ${alert.priority.toLowerCase()}`}
                      >
                        {alert.priority}
                      </span>
                    </div>

                    <p className="alert-description">
                      {alert.description}
                    </p>

                    <div className="alert-meta">
                      <span>📍 {alert.area}</span>
                      <span>◷ {alert.time}</span>
                      <span>{alert.type}</span>
                    </div>

                    <div className="alert-meta">
                      <span>Case status: {alert.originalStatus}</span>
                    </div>
                  </div>

                  <div className="alert-action">
                    <span
                      className={`alert-status ${alert.status.toLowerCase()}`}
                    >
                      {alert.status}
                    </span>

                    <Link
                      className="alert-view-link"
                      to={`/official/reports/${alert.reportId}`}
                    >
                      View Report
                    </Link>

                    <button
                      type="button"
                      onClick={() => acknowledgeAlert(alert.id)}
                      disabled={alert.acknowledged}
                    >
                      {alert.acknowledged ? "Acknowledged" : "Acknowledge"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Alert guidelines */}
        <section className="alert-guidelines">
          <div className="guideline-icon">✓</div>

          <div>
            <h3>Responsible Alert Handling</h3>
            <p>
              Alerts help authorized officials identify incidents that may
              need attention. Review and verify the reported information
              before taking case-related action.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Alerts;