import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clearAuthSession } from "../../utils/auth";
import "./Reports.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const PAGE_SIZE = 10;
const REFRESH_INTERVAL = 30000;

const INCIDENT_TYPES = [
  "Crime",
  "Suspicious Activity",
  "Safety Hazard",
  "Traffic Incident",
  "Public Safety",
  "Other",
];

function getReportId(report) {
  return report._id || report.id || "";
}

function getCaseId(report) {
  if (report.reportId) return report.reportId;

  const id = String(getReportId(report));
  return id ? `CS-${id.slice(-6).toUpperCase()}` : "New report";
}

function getTitle(report) {
  return report.title || report.description || "Untitled report";
}

function getType(report) {
  return report.incidentType || report.type || "Other";
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

function getPriority(report) {
  return report.priority || "Medium";
}

function getStatus(report) {
  return report.status || "Under Review";
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

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchReports = useCallback(async (background = false) => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Your session is missing. Please sign in again.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (background) {
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
          data.message || `Unable to fetch reports (${response.status}).`
        );
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.reports)
          ? data.reports
          : Array.isArray(data.data)
            ? data.data
            : null;

      if (!list) {
        throw new Error(
          "The reports API did not return a reports array. Check your GET /api/reports response."
        );
      }

      const sorted = [...list].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setReports(sorted);
      setError("");
      setLastUpdated(new Date());
    } catch (err) {
      console.error("All Reports loading error:", err);
      setError(err.message || "Could not load reports.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();

    const timer = setInterval(() => {
      fetchReports(true);
    }, REFRESH_INTERVAL);

    return () => clearInterval(timer);
  }, [fetchReports]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesSearch =
        !query ||
        [
          getCaseId(report),
          getReportId(report),
          getTitle(report),
          report.description,
          getType(report),
          getLocation(report),
          getStatus(report),
          getPriority(report),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesStatus =
        !statusFilter || getStatus(report) === statusFilter;

      const matchesPriority =
        !priorityFilter || getPriority(report) === priorityFilter;

      const matchesType =
        !typeFilter || getType(report) === typeFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesType
      );
    });
  }, [reports, search, statusFilter, priorityFilter, typeFilter]);

  const totalReports = reports.length;

  const underReviewCount = reports.filter((report) =>
    ["under review", "pending review", "pending"].includes(
      getStatus(report).toLowerCase()
    )
  ).length;

  const assignedCount = reports.filter(
    (report) => getStatus(report).toLowerCase() === "assigned"
  ).length;

  const resolvedCount = reports.filter(
    (report) => getStatus(report).toLowerCase() === "resolved"
  ).length;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReports.length / PAGE_SIZE)
  );

  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;

  const pageReports = filteredReports.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  const showingStart = filteredReports.length ? startIndex + 1 : 0;
  const showingEnd = Math.min(
    startIndex + PAGE_SIZE,
    filteredReports.length
  );

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setTypeFilter("");
    setCurrentPage(1);
  };

  const changePage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="reports-page">
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

          <Link to="/official/reports" className="active">
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
      <main className="reports-main">
        <header className="reports-header">
          <div>
            <p className="page-label">CASE MANAGEMENT</p>
            <h1>All Reports</h1>
            <p className="page-description">
              Review and manage incidents submitted by citizens.
            </p>
          </div>

          <div className="total-reports">
            <strong>
              {loading && reports.length === 0 ? "—" : totalReports}
            </strong>
            <span>Total Reports</span>
          </div>
        </header>

        {/* Live Summary Cards */}
        <section className="report-summary">
          <div className="summary-card">
            <span>Total Reports</span>
            <strong>{totalReports}</strong>
          </div>

          <div className="summary-card review">
            <span>Under Review</span>
            <strong>{underReviewCount}</strong>
          </div>

          <div className="summary-card assigned">
            <span>Assigned</span>
            <strong>{assignedCount}</strong>
          </div>

          <div className="summary-card resolved">
            <span>Resolved</span>
            <strong>{resolvedCount}</strong>
          </div>
        </section>

        {/* Search and Filters */}
        <section className="report-controls">
          <div className="search-box">
            <span>⌕</span>
            <input
              type="search"
              aria-label="Search reports"
              placeholder="Search by case ID, location or incident..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="Under Review">Under Review</option>
            <option value="Assigned">Assigned</option>
            <option value="Investigation">Investigation</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(event) => {
              setPriorityFilter(event.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            aria-label="Filter by incident type"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Types</option>
            {INCIDENT_TYPES.map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!search && !statusFilter && !priorityFilter && !typeFilter}
          >
            Clear
          </button>
        </section>

        {/* Reports Table */}
        <section className="reports-table-card">
          <div className="table-header">
            <div>
              <h2>Incident Reports</h2>
              <p>
                Citizen-submitted cases requiring monitoring and review.
              </p>
            </div>

            <div className="reports-table-actions">
              <span>
                {loading && reports.length === 0
                  ? "Loading reports…"
                  : `Showing ${showingStart}–${showingEnd} of ${filteredReports.length} reports`}
              </span>

              <button
                type="button"
                onClick={() => fetchReports(true)}
                disabled={loading || refreshing}
              >
                {refreshing ? "Refreshing…" : "↻ Refresh"}
              </button>
            </div>
          </div>

          {lastUpdated && (
            <p className="reports-last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}

          {error && (
            <div className="reports-error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => fetchReports()}>
                Try again
              </button>
            </div>
          )}

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>CASE ID</th>
                  <th>INCIDENT</th>
                  <th>LOCATION</th>
                  <th>DATE</th>
                  <th>PRIORITY</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {loading && reports.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="reports-empty">
                      Loading citizen reports…
                    </td>
                  </tr>
                ) : pageReports.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="reports-empty">
                      {error
                        ? "Reports could not be loaded. Check the error above."
                        : reports.length === 0
                          ? "No citizen reports have been submitted yet."
                          : "No reports match your search or filters."}
                    </td>
                  </tr>
                ) : (
                  pageReports.map((report, index) => {
                    const id = getReportId(report);
                    const priority = getPriority(report);
                    const status = getStatus(report);

                    return (
                      <tr key={id || `${getTitle(report)}-${index}`}>
                        <td>
                          <strong className="case-id">
                            {getCaseId(report)}
                          </strong>
                        </td>

                        <td>
                          <div className="incident-info">
                            <strong>{getTitle(report)}</strong>
                            <span>{getType(report)}</span>
                          </div>
                        </td>

                        <td>
                          <span className="location">
                            📍 {getLocation(report)}
                          </span>
                        </td>

                        <td>
                          <span className="date">
                            {formatDate(report.createdAt || report.updatedAt)}
                          </span>
                        </td>

                        <td>
                          <span className={`priority ${getPriorityClass(priority)}`}>
                            {priority}
                          </span>
                        </td>

                        <td>
                          <span className={`status ${getStatusClass(status)}`}>
                            {status}
                          </span>
                        </td>

                        <td>
                          {id ? (
                            <Link
                              to={`/official/reports/${id}`}
                              className="review-btn"
                            >
                              Review
                            </Link>
                          ) : (
                            <span>Unavailable</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <span>
              Page {safePage} of {totalPages}
            </span>

            <div className="page-buttons">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => changePage(safePage - 1)}
                aria-label="Previous page"
              >
                ←
              </button>

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              )
                .filter(
                  (page) =>
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - safePage) <= 2
                )
                .map((page, index, pages) => (
                  <span key={page} style={{ display: "contents" }}>
                    {index > 0 && page - pages[index - 1] > 1 && (
                      <span className="pagination-ellipsis">…</span>
                    )}

                    <button
                      type="button"
                      className={page === safePage ? "current" : ""}
                      aria-current={page === safePage ? "page" : undefined}
                      onClick={() => changePage(page)}
                    >
                      {page}
                    </button>
                  </span>
                ))}

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => changePage(safePage + 1)}
                aria-label="Next page"
              >
                →
              </button>
            </div>
          </div>
        </section>

        {/* AI Information */}
        <section className="ai-information">
          <div className="ai-icon">✦</div>
          <div>
            <h3>AI-Assisted Review</h3>
            <p>
              AI may assist authorized officials with incident
              classification, urgency assessment and potential duplicate
              detection. AI outputs are decision-support information and
              do not determine guilt or criminal responsibility.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Reports;