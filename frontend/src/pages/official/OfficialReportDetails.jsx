import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { clearAuthSession } from "../../utils/auth";
import "./OfficialReportDetails.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken")
  );
}

function formatDate(date) {
  if (!date) return "Not available";

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "Not available"
    : parsed.toLocaleString();
}

function OfficialReportDetails() {
  const { reportId } = useParams();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState({});
  const [evidenceError, setEvidenceError] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = getToken();

    if (!token) {
      setError("Please log in to view this report.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/reports/${encodeURIComponent(reportId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to load report.");
      }

      if (!data.report) {
        throw new Error("The server did not return the report.");
      }

      setReport(data.report);
    } catch (err) {
      setError(err.message || "Unable to load report.");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Fetch each evidence file using authentication.
  useEffect(() => {
    if (!report?._id) return;

    let cancelled = false;
    const createdUrls = [];

    const loadEvidence = async () => {
      setEvidenceUrls({});
      setEvidenceError("");

      const files = report.evidence || [];
      if (!files.length) return;

      const token = getToken();

      if (!token) {
        setEvidenceError("Please log in again to view evidence.");
        return;
      }

      try {
        const entries = await Promise.all(
          files.map(async (file) => {
            const response = await fetch(
              `${API_URL}/api/reports/${encodeURIComponent(
                report._id
              )}/evidence/${encodeURIComponent(file.filename)}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (!response.ok) {
              throw new Error(
                `Unable to load ${file.originalName || "an evidence file"}.`
              );
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            createdUrls.push(url);

            return [file.filename, url];
          })
        );

        if (!cancelled) {
          setEvidenceUrls(Object.fromEntries(entries));
        }
      } catch (err) {
        if (!cancelled) {
          setEvidenceError(
            err.message || "Unable to load evidence files."
          );
        }
      }
    };

    loadEvidence();

    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [report]);

  if (loading) {
    return <main className="official-details-main">Loading report...</main>;
  }

  if (error) {
    return (
      <main className="official-details-main">
        <p role="alert">{error}</p>
        <button type="button" onClick={fetchReport}>
          Try Again
        </button>
        <p><Link to="/official/reports">Back to All Reports</Link></p>
      </main>
    );
  }

  if (!report) return null;

  const evidence = Array.isArray(report.evidence)
    ? report.evidence
    : [];

  const status = report.status || "Under Review";
  const ai = report.aiAnalysis || {};
  const location = report.location || {};

  return (
    <div className="official-details-page">
      <aside className="official-sidebar">
        <div className="official-logo">
          Civic<span>Shield</span>
        </div>

        <div className="official-role">
          <span className="role-dot" />
          Authorized Official
        </div>

        <nav className="official-nav">
          <Link to="/official/dashboard">▦ <span>Dashboard</span></Link>
          <Link to="/official/reports" className="active">▣ <span>All Reports</span></Link>
          <Link to="/official/cases">◉ <span>Case Management</span></Link>
          <Link to="/official/analytics">◒ <span>Analytics</span></Link>
          <Link to="/official/assigned">◉ <span>Assigned Cases</span></Link>
          <Link to="/official/map">⌖ <span>Incident Map</span></Link>
          <Link to="/official/alerts">! <span>Alerts</span></Link>
        </nav>

        <div className="official-bottom">
          <Link to="/official/profile">◯ <span>Profile</span></Link>
          <Link to="/login" onClick={clearAuthSession}>↪ <span>Logout</span></Link>
        </div>
      </aside>

      <main className="official-details-main">
        <header className="details-header">
          <Link to="/official/reports" className="back-link">
            ← Back to All Reports
          </Link>

          <div className="case-heading">
            <div>
              <p className="page-label">INCIDENT REVIEW</p>
              <h1>{report.title || `Case ${report._id}`}</h1>
              <p>Review submitted information and supporting evidence.</p>
            </div>
            <span className="case-status">{status}</span>
          </div>
        </header>

        <section className="details-grid">
          <div className="details-left">
            <section className="details-card">
              <div className="card-heading">
                <div>
                  <h2>Incident Information</h2>
                  <p>Information submitted by the citizen.</p>
                </div>
              </div>

              <div className="incident-title">
                <div className="incident-symbol">!</div>
                <div>
                  <h3>{report.title}</h3>
                  <span>{report.incidentType || "Other"}</span>
                </div>
              </div>

              <div className="information-grid">
                <div>
                  <label>Case ID</label>
                  <strong>{report._id}</strong>
                </div>
                <div>
                  <label>Reported Date</label>
                  <strong>{formatDate(report.createdAt)}</strong>
                </div>
                <div>
                  <label>Priority</label>
                  <strong>{report.priority || "Not specified"}</strong>
                </div>
                <div>
                  <label>Location</label>
                  <strong>{location.address || "Not provided"}</strong>
                </div>
                <div>
                  <label>Reported By</label>
                  <strong>
                    {report.reportedBy?.name || "Citizen"}
                  </strong>
                </div>
                <div>
                  <label>Assigned Official</label>
                  <strong>
                    {report.assignedTo?.name ||
                      report.assignedTo?.fullName ||
                      "Not assigned"}
                  </strong>
                </div>
              </div>

              <div className="description-section">
                <label>Citizen Description</label>
                <p>{report.description || "No description provided."}</p>
              </div>
            </section>

            <section className="details-card">
              <div className="card-heading">
                <div>
                  <h2>Submitted Evidence</h2>
                  <p>Files attached to this incident report.</p>
                </div>
              </div>

              {evidence.length === 0 ? (
                <div className="evidence-box">
                  <div>
                    <strong>No evidence attached</strong>
                    <span>
                      The database record for this report contains no evidence files.
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {evidenceError && (
                    <p role="alert">{evidenceError}</p>
                  )}

                  <div className="evidence-list">
                    {evidence.map((file) => {
                      const url = evidenceUrls[file.filename];
                      const isImage = file.mimetype?.startsWith("image/");
                      const isVideo = file.mimetype?.startsWith("video/");

                      return (
                        <div className="evidence-box" key={file.filename}>
                          <div className="evidence-file-content">
                            {url && isImage && (
                              <a href={url} target="_blank" rel="noreferrer">
                                <img
                                  src={url}
                                  alt={file.originalName || "Submitted evidence"}
                                  className="evidence-preview"
                                />
                              </a>
                            )}

                            {url && isVideo && (
                              <video
                                className="evidence-video"
                                controls
                                preload="metadata"
                                src={url}
                              >
                                Your browser does not support video playback.
                              </video>
                            )}

                            <strong>
                              {file.originalName || file.filename}
                            </strong>
                            <span>{file.mimetype || "File"}</span>

                            {url ? (
                              <a
                                href={url}
                                download={file.originalName || file.filename}
                              >
                                Download evidence
                              </a>
                            ) : (
                              <span>Loading evidence…</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            <section className="details-card">
              <div className="card-heading">
                <div>
                  <h2>Reported Location</h2>
                  <p>Location associated with the incident.</p>
                </div>
                <Link to="/official/map" className="map-link">
                  View Incident Map →
                </Link>
              </div>

              <p>{location.address || "No location provided."}</p>
              {Number.isFinite(location.latitude) &&
                Number.isFinite(location.longitude) && (
                  <p>
                    Coordinates: {location.latitude}, {location.longitude}
                  </p>
                )}
            </section>
          </div>

          <div className="details-right">
            <section className="details-card ai-analysis">
              <div className="card-heading">
                <div>
                  <h2>AI-Assisted Analysis</h2>
                  <p>Decision-support information.</p>
                </div>
                <span className="ai-badge">AI</span>
              </div>

              <div className="analysis-item">
                <div>
                  <label>Suggested Category</label>
                  <strong>{ai.category || report.incidentType || "Not available"}</strong>
                </div>
              </div>

              <div className="analysis-item">
                <div>
                  <label>Urgency Assessment</label>
                  <strong>{ai.urgency || report.priority || "Not available"}</strong>
                </div>
              </div>

              <div className="analysis-item">
                <div>
                  <label>Potential Duplicate</label>
                  <strong>
                    {ai.possibleDuplicate == null
                      ? "Not available"
                      : ai.possibleDuplicate
                        ? "Possible match"
                        : "No strong match"}
                  </strong>
                </div>
              </div>

              <div className="analysis-note">
                AI-generated suggestions are decision support only and
                should be independently reviewed by authorized officials.
              </div>
            </section>

            <section className="details-card">
              <div className="card-heading">
                <div>
                  <h2>Case Status</h2>
                  <p>Current processing stage.</p>
                </div>
              </div>

              <div className="status-timeline">
                {["Under Review", "Assigned", "Investigation", "Resolved"].map(
                  (step, index) => {
                    const stages = [
                      "Under Review",
                      "Assigned",
                      "Investigation",
                      "Resolved",
                    ];
                    const currentIndex = stages.indexOf(status);
                    const completed = currentIndex >= index;

                    return (
                      <div
                        className={`timeline-item ${completed ? "completed" : ""} ${
                          status === step ? "current" : ""
                        }`}
                        key={step}
                      >
                        <span className="timeline-dot">
                          {completed ? "✓" : index + 1}
                        </span>
                        <div>
                          <strong>{step}</strong>
                          <span>
                            {status === step
                              ? "Current status"
                              : completed
                                ? "Completed"
                                : "Pending"}
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>

            <section className="details-card assignment-card">
              <div className="card-heading">
                <div>
                  <h2>Case Assignment</h2>
                  <p>Current assignment information.</p>
                </div>
              </div>

              <div className="assignment-row">
                <div className="assignment-avatar">—</div>
                <div>
                  <strong>
                    {report.assignedTo?.name ||
                      report.assignedTo?.fullName ||
                      "Not Assigned"}
                  </strong>
                  <span>
                    {report.assignedTo?.email ||
                      "This case has not yet been assigned."}
                  </span>
                </div>
              </div>

              <Link to="/official/cases" className="manage-case-btn">
                Manage Case
              </Link>
            </section>
          </div>
        </section>

        <section className="responsible-ai">
          <div className="responsible-icon">✓</div>
          <div>
            <h3>Responsible AI Notice</h3>
            <p>
              AI analysis is provided only as decision support. Authorized
              officials are responsible for reviewing evidence and making
              appropriate decisions.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default OfficialReportDetails;