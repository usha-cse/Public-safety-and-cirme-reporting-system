import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clearAuthSession } from "../../utils/auth";
import "./MyReports.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

function getStatusClass(status = "") {
  switch (status.toLowerCase()) {
    case "assigned":
      return "assigned";
    case "resolved":
      return "resolved";
    case "investigation":
      return "assigned";
    case "under review":
    default:
      return "review";
  }
}

function formatDate(date) {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getReportId(report) {
  return report._id || report.id || "";
}

function getDisplayId(report, index) {
  const id = getReportId(report);
  return report.reportNumber || `CS-${id ? id.slice(-6).toUpperCase() : String(index + 1).padStart(3, "0")}`;
}

function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [typeFilter, setTypeFilter] = useState("All Types");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");

    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken");

    if (!token) {
      setError("Your login session was not found. Please log in again.");
      setReports([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/reports/my`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || `Unable to load reports (${response.status}).`
        );
      }

      // The backend returns { count, reports }.
      if (!Array.isArray(data.reports)) {
        throw new Error("The server response did not contain a reports list.");
      }

      setReports(data.reports);
    } catch (err) {
      console.error("Fetch my reports error:", err);
      setError(err.message || "Unable to load your reports.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reports.filter((report) => {
      const type = report.incidentType || report.title || "Incident";
      const description = report.description || "";
      const address = report.location?.address || "";
      const status = report.status || "Under Review";

      const matchesSearch =
        !query ||
        [
          getReportId(report),
          type,
          report.title,
          description,
          address,
          status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "All Statuses" || status === statusFilter;

      const matchesType =
        typeFilter === "All Types" || type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [reports, search, statusFilter, typeFilter]);

  const totalReports = reports.length;
  const underReviewCount = reports.filter(
    (report) => (report.status || "Under Review") === "Under Review"
  ).length;
  const assignedCount = reports.filter((report) =>
    ["Assigned", "Investigation"].includes(report.status)
  ).length;
  const resolvedCount = reports.filter(
    (report) => report.status === "Resolved"
  ).length;

  return (
    <div className="my-reports-page">
      <aside className="reports-sidebar">
        <Link to="/" className="reports-logo">
          Civic<span>Shield</span>
        </Link>

        <nav className="reports-nav">
          <Link to="/citizen/dashboard" className="reports-nav-link">
            <span>⌂</span>
            Dashboard
          </Link>

          <Link to="/citizen/report" className="reports-nav-link">
            <span>＋</span>
            Report Incident
          </Link>

          <Link
            to="/citizen/reports"
            className="reports-nav-link active"
          >
            <span>▤</span>
            My Reports
          </Link>

          <Link to="/citizen/map" className="reports-nav-link">
            <span>⌖</span>
            Safety Map
          </Link>

          <Link to="/citizen/alerts" className="reports-nav-link">
            <span>♢</span>
            Safety Alerts
          </Link>
        </nav>

        <div className="reports-sidebar-bottom">
          <Link to="/citizen/profile" className="reports-nav-link">
            <span>◯</span>
            Profile
          </Link>

          <Link
            to="/login"
            onClick={clearAuthSession}
            className="reports-nav-link"
          >
            <span>↪</span>
            Logout
          </Link>
        </div>
      </aside>

      <main className="reports-main">
        <header className="reports-header">
          <div>
            <p className="reports-label">CITIZEN PORTAL</p>
            <h1>My Reports</h1>
            <p>
              Track the status and progress of incidents you have reported.
            </p>
          </div>

          <Link to="/citizen/report" className="new-report-button">
            + New Report
          </Link>
        </header>

        <section className="report-summary">
          <div className="summary-card">
            <span>Total Reports</span>
            <strong>{totalReports}</strong>
          </div>

          <div className="summary-card review-summary">
            <span>Under Review</span>
            <strong>{underReviewCount}</strong>
          </div>

          <div className="summary-card assigned-summary">
            <span>Assigned</span>
            <strong>{assignedCount}</strong>
          </div>

          <div className="summary-card resolved-summary">
            <span>Resolved</span>
            <strong>{resolvedCount}</strong>
          </div>
        </section>

        <section className="reports-toolbar">
          <div className="search-box">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Search reports..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option>All Statuses</option>
            <option>Under Review</option>
            <option>Assigned</option>
            <option>Investigation</option>
            <option>Resolved</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            aria-label="Filter by incident type"
          >
            <option>All Types</option>
            <option>Crime</option>
            <option>Suspicious Activity</option>
            <option>Safety Hazard</option>
            <option>Traffic Incident</option>
            <option>Public Safety</option>
            <option>Other</option>
          </select>

          <button
            type="button"
            className="refresh-btn"
            onClick={fetchReports}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </section>

        <section className="reports-list">
          {loading ? (
            <p role="status">Loading your reports...</p>
          ) : error ? (
            <div role="alert" className="reports-message">
              <p>{error}</p>
              <button type="button" onClick={fetchReports}>
                Try Again
              </button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="reports-message">
              <h2>
                {reports.length === 0
                  ? "No reports found yet"
                  : "No matching reports"}
              </h2>
              <p>
                {reports.length === 0
                  ? "Reports you submit will appear here."
                  : "Try changing your search or filters."}
              </p>
              {reports.length === 0 && (
                <Link to="/citizen/report" className="new-report-button submit-report-empty">
                  + Submit a Report
                </Link>
              )}
            </div>
          ) : (
            filteredReports.map((report, index) => {
              const id = getReportId(report);
              const status = report.status || "Under Review";
              const statusClass = getStatusClass(status);
              const type =
                report.incidentType || report.title || "Incident Report";

              return (
                <article className="report-item" key={id || index}>
                  <div className={`report-item-icon ${statusClass}`}>
                    {status === "Resolved"
                      ? "✓"
                      : status === "Assigned" || status === "Investigation"
                        ? "!"
                        : "⚠"}
                  </div>

                  <div className="report-item-content">
                    <div className="report-item-top">
                      <div>
                        <p className="report-id">
                          REPORT #{getDisplayId(report, index)}
                        </p>
                        <h2>{type}</h2>
                      </div>

                      <span className={`report-status ${statusClass}`}>
                        {status}
                      </span>
                    </div>

                    <p className="report-description">
                      {report.description || "No description provided."}
                    </p>

                    <div className="report-meta">
                      <span>
                        ⌖ {report.location?.address || "Location unavailable"}
                      </span>
                      <span>◷ {formatDate(report.createdAt)}</span>
                    </div>
                  </div>

                  <Link
                    to={`/citizen/reports/${id}`}
                    className="view-report"
                  >
                    View Details →
                  </Link>
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}

export default MyReports;