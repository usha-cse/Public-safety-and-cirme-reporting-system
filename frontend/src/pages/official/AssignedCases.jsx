import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clearAuthSession } from "../../utils/auth";
import "./AssignedCases.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

function getAuthToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

function getLocation(location) {
  if (typeof location === "string") return location;
  if (location?.address) return location.address;

  if (
    location?.latitude != null &&
    location?.longitude != null
  ) {
    return `${location.latitude}, ${location.longitude}`;
  }

  return "Location not provided";
}

function formatDate(date) {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCasesFromResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.cases)) return data.cases;
  if (Array.isArray(data?.reports)) return data.reports;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function AssignedCases() {
  const [assignedCases, setAssignedCases] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAssignedCases = useCallback(async (isRefresh = false) => {
    const token = getAuthToken();

    if (!token) {
      setError("Your session has expired. Please log in again.");
      setAssignedCases([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      // IMPORTANT: The backend route is /assigned, not /assigned-cases.
      const response = await fetch(
        `${API_URL}/api/reports/assigned`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          `Unable to load cases (HTTP ${response.status})`
        );
      }

      setAssignedCases(getCasesFromResponse(data));
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Failed to load assigned cases.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignedCases();

    const intervalId = setInterval(() => {
      fetchAssignedCases(true);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchAssignedCases]);

  const filteredCases = useMemo(() => {
    return assignedCases.filter((item) => {
      const location = getLocation(item.location);

      const searchContent = [
        item._id,
        item.id,
        item.title,
        item.description,
        item.incidentType,
        item.type,
        location,
        item.status,
        item.priority,
        typeof item.assignedTo === "object"
          ? item.assignedTo?.name
          : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchContent.includes(
        searchTerm.trim().toLowerCase()
      );

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All Priorities" ||
        item.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [assignedCases, searchTerm, statusFilter, priorityFilter]);

  const stats = useMemo(() => {
    const officials = new Set(
      assignedCases
        .map((item) =>
          typeof item.assignedTo === "object"
            ? item.assignedTo?._id
            : item.assignedTo
        )
        .filter(Boolean)
        .map(String)
    );

    return {
      total: assignedCases.length,
      highPriority: assignedCases.filter(
        (item) => item.priority === "High"
      ).length,
      investigating: assignedCases.filter(
        (item) => item.status === "Investigation"
      ).length,
      officials: officials.size,
    };
  }, [assignedCases]);

  return (
    <div className="assigned-page">
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

          <Link
            to="/official/assigned-cases"
            className="active"
          >
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

      {/* Main */}
      <main className="assigned-main">
        {/* Header */}
        <header className="assigned-header">
          <div>
            <p className="page-label">CASE WORKLOAD</p>

            <h1>Assigned Cases</h1>

            <p className="page-description">
              Cases currently assigned to authorized officials for handling.
            </p>
          </div>

          <div className="assigned-header-actions">
            <div className="assigned-status">
              <span className="status-dot"></span>
              Case Management Active
            </div>

            <button
              type="button"
              className="assigned-refresh-btn"
              onClick={() => fetchAssignedCases(true)}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
        </header>

        {/* Summary */}
        <section className="assigned-summary">
          <div className="assigned-stat">
            <span>Assigned Cases</span>
            <strong>{stats.total}</strong>
            <small>Currently assigned</small>
          </div>

          <div className="assigned-stat">
            <span>High Priority</span>
            <strong>{stats.highPriority}</strong>
            <small>Require closer attention</small>
          </div>

          <div className="assigned-stat">
            <span>Under Investigation</span>
            <strong>{stats.investigating}</strong>
            <small>Active investigations</small>
          </div>

          <div className="assigned-stat">
            <span>Officials Handling</span>
            <strong>{stats.officials}</strong>
            <small>Represented in these cases</small>
          </div>
        </section>

        {/* Cases */}
        <section className="assigned-card">
          <div className="assigned-card-header">
            <div>
              <h2>Assigned Case List</h2>
              <p>
                Review and manage cases assigned to officials.
              </p>

              {lastUpdated && (
                <small className="assigned-last-updated">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </small>
              )}
            </div>

            <div className="assigned-filters">
              <input
                type="search"
                placeholder="Search cases..."
                aria-label="Search cases"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />

              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="All">All statuses</option>
                <option value="Under Review">Under Review</option>
                <option value="Assigned">Assigned</option>
                <option value="Investigation">Investigation</option>
                <option value="Resolved">Resolved</option>
              </select>

              <select
                aria-label="Filter by priority"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                <option value="All Priorities">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="assigned-error" role="alert">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => fetchAssignedCases()}
              >
                Try again
              </button>
            </div>
          )}

          {/* Table */}
          <div className="assigned-table-wrapper">
            {loading ? (
              <div className="assigned-message">
                Loading assigned cases...
              </div>
            ) : !error && filteredCases.length === 0 ? (
              <div className="assigned-message">
                <h3>
                  {assignedCases.length === 0
                    ? "No assigned cases yet"
                    : "No matching cases"}
                </h3>

                <p>
                  {assignedCases.length === 0
                    ? "Cases assigned to your account will appear here."
                    : "Try changing your search or filter settings."}
                </p>
              </div>
            ) : (
              !error && (
                <table className="assigned-table">
                  <thead>
                    <tr>
                      <th>CASE</th>
                      <th>INCIDENT</th>
                      <th>LOCATION</th>
                      <th>OFFICER</th>
                      <th>PRIORITY</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCases.map((item) => {
                      const id = item._id || item.id;

                      const officer =
                        typeof item.assignedTo === "object"
                          ? item.assignedTo?.name
                          : null;

                      const status = item.status || "Under Review";
                      const priority = item.priority || "Low";

                      return (
                        <tr key={id}>
                          <td>
                            <div className="case-id">
                              {item.caseNumber || item.referenceNumber || (
                                id ? String(id).slice(-8).toUpperCase() : "N/A"
                              )}
                            </div>

                            <small>{formatDate(item.createdAt)}</small>
                          </td>

                          <td>
                            <div className="incident-title">
                              {item.title || "Untitled incident"}
                            </div>

                            <small>
                              {item.incidentType || item.type || "Other"}
                            </small>
                          </td>

                          <td>{getLocation(item.location)}</td>

                          <td>
                            <div className="officer-name">
                              {officer || "Assigned official"}
                            </div>
                          </td>

                          <td>
                            <span
                              className={`priority-badge ${priority.toLowerCase()}`}
                            >
                              {priority}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`case-status ${status
                                .toLowerCase()
                                .replace(/\s+/g, "-")}`}
                            >
                              {status}
                            </span>
                          </td>

                          <td>
                            {id ? (
                              <Link
                                to={`/official/reports/${id}`}
                                className="view-case"
                              >
                                View Case
                              </Link>
                            ) : (
                              <span>Unavailable</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            )}
          </div>
        </section>

        {/* Responsible handling */}
        <section className="assigned-note">
          <div className="assigned-note-icon">✓</div>

          <div>
            <h3>Responsible Case Handling</h3>

            <p>
              Assigned cases should be reviewed and updated only by
              authorized officials. AI-assisted information is provided
              as decision support and does not independently determine
              case outcomes.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AssignedCases;