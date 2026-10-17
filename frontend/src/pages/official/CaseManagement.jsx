import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clearAuthSession } from "../../utils/auth";
import "./CaseManagement.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const CASE_STATUSES = [
  "Under Review",
  "Assigned",
  "Investigation",
  "Resolved",
];

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

async function apiRequest(path, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error("Please log in again to continue.");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || data.error || `Request failed (${response.status})`
    );
  }

  return data;
}

function extractReports(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.reports)) return data.reports;
  if (Array.isArray(data?.cases)) return data.cases;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function extractOfficials(data) {
  if (Array.isArray(data?.officials)) return data.officials;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.data)) return data.data;
  return [];
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

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function CaseManagement() {
  const [reports, setReports] = useState([]);
  const [officials, setOfficials] = useState([]);

  const [selectedId, setSelectedId] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [assignmentPriority, setAssignmentPriority] = useState("Medium");

  const [newStatus, setNewStatus] = useState("Under Review");
  const [statusNote, setStatusNote] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingOfficials, setLoadingOfficials] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedCase = useMemo(
    () => reports.find((report) => report._id === selectedId) || null,
    [reports, selectedId]
  );

  const fetchReports = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoadingReports(true);
    }

    try {
      const data = await apiRequest("/api/reports");
      const list = extractReports(data);

      setReports(list);

      setSelectedId((previousId) => {
        if (previousId && list.some((item) => item._id === previousId)) {
          return previousId;
        }

        return list[0]?._id || "";
      });
    } catch (err) {
      setError(err.message || "Could not load reports.");
    } finally {
      setLoadingReports(false);
      setRefreshing(false);
    }
  }, []);

  const fetchOfficials = useCallback(async () => {
    setLoadingOfficials(true);

    try {
      const data = await apiRequest("/api/reports/officials");
      setOfficials(extractOfficials(data));
    } catch (err) {
      setError(err.message || "Could not load authorized officials.");
    } finally {
      setLoadingOfficials(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    fetchOfficials();
  }, [fetchReports, fetchOfficials]);

  useEffect(() => {
    if (!selectedCase) {
      setOfficerId("");
      setNewStatus("Under Review");
      setAssignmentPriority("Medium");
      return;
    }

    const assignedTo = selectedCase.assignedTo;
    const assignedId =
      typeof assignedTo === "object"
        ? assignedTo?._id || ""
        : assignedTo || "";

    setOfficerId(assignedId);
    setNewStatus(selectedCase.status || "Under Review");
    setAssignmentPriority(selectedCase.priority || "Medium");
    setStatusNote("");
    setInternalNote("");
    setMessage("");
  }, [selectedCase]);

  const assignedCount = reports.filter(
    (report) => report.status === "Assigned"
  ).length;

  const investigationCount = reports.filter(
    (report) => report.status === "Investigation"
  ).length;

  const resolvedCount = reports.filter(
    (report) => report.status === "Resolved"
  ).length;

  async function handleAssign(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedCase?._id) {
      setError("Please select a report first.");
      return;
    }

    const selectedOfficial = officials.find(
      (official) => official._id === officerId
    );

    if (!officerId.trim() || !selectedOfficial) {
      setError("Please select an authorized official from the dropdown.");
      return;
    }

    setSavingAssignment(true);

    try {
      await apiRequest(`/api/reports/${selectedCase._id}/assign`, {
        method: "PUT",
        body: JSON.stringify({
          assignedTo: officerId,
          priority: assignmentPriority,
        }),
      });

      setMessage("Case assigned successfully.");
      await fetchReports(true);
    } catch (err) {
      setError(err.message || "Failed to assign this case.");
    } finally {
      setSavingAssignment(false);
    }
  }

  async function handleStatusUpdate(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedCase?._id) {
      setError("Please select a report first.");
      return;
    }

    setSavingStatus(true);

    try {
      await apiRequest(`/api/reports/${selectedCase._id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: newStatus,
          note: statusNote.trim(),
        }),
      });

      setMessage("Case status updated successfully.");
      await fetchReports(true);
    } catch (err) {
      setError(err.message || "Failed to update case status.");
    } finally {
      setSavingStatus(false);
    }
  }

  function handleSaveNote() {
    setError(
      "Saving notes needs a backend endpoint. The note has not been saved."
    );
    setMessage("");
  }

  function prepareResolution() {
    setNewStatus("Resolved");
    setStatusNote("Case marked for resolution by an authorized official.");
    setMessage('Click "Update Status" to save the Resolved status.');
    setError("");
  }

  return (
    <div className="case-management-page">
      <aside className="official-sidebar">
        <div className="official-logo">
          Civic<span>Shield</span>
        </div>

        <div className="official-role">
          <span className="role-dot" />
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

          <Link to="/official/cases" className="active">
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

      <main className="case-management-main">
        <header className="case-header">
          <div>
            <p className="page-label">CASE MANAGEMENT</p>
            <h1>Case Management</h1>
            <p className="page-description">
              Assign, update and manage active incident cases.
            </p>
          </div>

          <div className="case-header-actions">
            <div className="case-header-status">
              <span className="status-dot" />
              System Active
            </div>

            <button
              type="button"
              className="case-refresh-btn"
              disabled={refreshing}
              onClick={() => {
                setError("");
                fetchReports(true);
                fetchOfficials();
              }}
            >
              {refreshing ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
        </header>

        {error && (
          <div className="case-feedback error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="case-feedback success" role="status">
            {message}
          </div>
        )}

        <section className="case-summary">
          <div className="case-summary-item">
            <span>Total Reports</span>
            <strong>{reports.length}</strong>
          </div>

          <div className="case-summary-item">
            <span>Assigned</span>
            <strong>{assignedCount}</strong>
          </div>

          <div className="case-summary-item">
            <span>Investigation</span>
            <strong>{investigationCount}</strong>
          </div>

          <div className="case-summary-item">
            <span>Resolved</span>
            <strong>{resolvedCount}</strong>
          </div>
        </section>

        <section className="case-selector">
          <div className="case-selector-details">
            <span className="selector-label">SELECT REPORT</span>

            {loadingReports ? (
              <h2>Loading reports...</h2>
            ) : selectedCase ? (
              <>
                <h2>{selectedCase.title || "Untitled report"}</h2>
                <p>
                  📍 {getLocation(selectedCase.location)}
                  {" • "}Reported {formatDate(selectedCase.createdAt)}
                </p>
                <p>Report ID: {selectedCase._id}</p>
              </>
            ) : (
              <h2>No reports available</h2>
            )}
          </div>

          <select
            aria-label="Select report"
            value={selectedId}
            disabled={loadingReports || reports.length === 0}
            onChange={(event) => {
              setSelectedId(event.target.value);
              setError("");
              setMessage("");
            }}
          >
            {reports.length === 0 && (
              <option value="">No reports available</option>
            )}

            {reports.map((report) => (
              <option key={report._id} value={report._id}>
                {report.title || "Untitled report"} —{" "}
                {String(report._id).slice(-6)}
              </option>
            ))}
          </select>
        </section>

        {selectedCase && (
          <>
            <section className="case-status-card">
              <div className="status-card-heading">
                <div>
                  <h2>Case Status</h2>
                  <p>Current stage of the selected report.</p>
                </div>

                <span
                  className={`current-status ${String(
                    selectedCase.status || "Under Review"
                  )
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                >
                  {selectedCase.status || "Under Review"}
                </span>
              </div>

              <div className="case-progress">
                {CASE_STATUSES.map((status, index) => {
                  const currentIndex = CASE_STATUSES.indexOf(
                    selectedCase.status
                  );
                  const completed =
                    currentIndex >= 0 && index < currentIndex;
                  const current = status === selectedCase.status;

                  return (
                    <div className="case-progress-group" key={status}>
                      <div
                        className={`progress-step ${
                          completed ? "completed" : ""
                        } ${current ? "current" : ""}`}
                      >
                        <span>{completed ? "✓" : index + 1}</span>
                        <div>
                          <strong>{status}</strong>
                          <small>
                            {current
                              ? "Current"
                              : completed
                                ? "Completed"
                                : "Pending"}
                          </small>
                        </div>
                      </div>

                      {index < CASE_STATUSES.length - 1 && (
                        <div
                          className={`progress-line ${
                            completed ? "completed-line" : ""
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="management-grid">
              <form className="management-card" onSubmit={handleAssign}>
                <div className="management-heading">
                  <div>
                    <h2>Assign Case</h2>
                    <p>Assign this report to an authorized official.</p>
                  </div>
                  <span className="card-icon">◉</span>
                </div>

                <label htmlFor="officer-id">Assigned Officer</label>

                <select
                  id="officer-id"
                  name="officerId"
                  value={officerId}
                  onChange={(event) => setOfficerId(event.target.value)}
                  required
                  disabled={loadingOfficials || officials.length === 0}
                >
                  <option value="">
                    {loadingOfficials
                      ? "Loading officials..."
                      : officials.length === 0
                        ? "No authorized officials available"
                        : "Select an official"}
                  </option>

                  {officials.map((official) => (
                    <option key={official._id} value={official._id}>
                      {official.name || official.fullName || "Official"}
                      {official.email ? ` — ${official.email}` : ""}
                    </option>
                  ))}
                </select>

                <small className="case-field-hint">
                  Choose an official by name. Their ID is submitted
                  automatically.
                </small>

                <label htmlFor="assignment-priority">
                  Assignment Priority
                </label>

                <select
                  id="assignment-priority"
                  value={assignmentPriority}
                  onChange={(event) =>
                    setAssignmentPriority(event.target.value)
                  }
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={
                    savingAssignment ||
                    loadingOfficials ||
                    !officerId ||
                    officials.length === 0
                  }
                >
                  {savingAssignment ? "Assigning..." : "Assign Case"}
                </button>
              </form>

              <form
                className="management-card"
                onSubmit={handleStatusUpdate}
              >
                <div className="management-heading">
                  <div>
                    <h2>Update Status</h2>
                    <p>Update the report's processing stage.</p>
                  </div>
                  <span className="card-icon">↻</span>
                </div>

                <label htmlFor="case-status">Case Status</label>

                <select
                  id="case-status"
                  value={newStatus}
                  onChange={(event) => setNewStatus(event.target.value)}
                >
                  {CASE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <label htmlFor="status-note">Status Update Note</label>

                <textarea
                  id="status-note"
                  value={statusNote}
                  onChange={(event) => setStatusNote(event.target.value)}
                  placeholder="Enter an explanation for this status update..."
                />

                <button
                  type="submit"
                  className="secondary-btn"
                  disabled={savingStatus}
                >
                  {savingStatus ? "Updating..." : "Update Status"}
                </button>
              </form>
            </section>

            <section className="notes-card">
              <div className="notes-heading">
                <div>
                  <h2>Official Notes</h2>
                  <p>Internal notes for authorized case handlers.</p>
                </div>
                <span>INTERNAL</span>
              </div>

              <textarea
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
                placeholder="Draft an internal case note..."
              />

              <div className="notes-footer">
                <small>
                  Notes are not saved until a notes API is implemented.
                </small>

                <button
                  type="button"
                  className="save-note-btn"
                  onClick={handleSaveNote}
                  disabled={!internalNote.trim()}
                >
                  Save Note
                </button>
              </div>
            </section>

            <section className="case-actions-card">
              <div>
                <h2>Case Actions</h2>
                <p>Actions available to authorized officials.</p>
              </div>

              <div className="case-action-buttons">
                <Link
                  to={`/official/reports/${selectedCase._id}`}
                  className="view-report-btn"
                >
                  ← View Full Report
                </Link>

                <button
                  type="button"
                  className="resolve-btn"
                  disabled={
                    savingStatus || selectedCase.status === "Resolved"
                  }
                  onClick={prepareResolution}
                >
                  {selectedCase.status === "Resolved"
                    ? "Already Resolved"
                    : "Prepare Resolution"}
                </button>
              </div>
            </section>
          </>
        )}

        <section className="responsible-ai">
          <div className="responsible-icon">✓</div>
          <div>
            <h3>Responsible Case Management</h3>
            <p>
              AI-generated classifications and urgency assessments are
              decision-support information only. Authorized officials must
              independently review reports and evidence before assigning,
              updating, or resolving a case.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CaseManagement;