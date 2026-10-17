import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { clearAuthSession, getAuthToken } from "../../utils/auth";
import "./ReportDetails.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const STATUS_STEPS = [
  {
    title: "Report Submitted",
    description: "Your incident report was successfully submitted.",
  },
  {
    title: "Initial Processing",
    description: "The report was received and processed by the system.",
  },
  {
    title: "Official Review",
    description: "An authorized official is reviewing the submitted information.",
  },
  {
    title: "Case Assignment",
    description: "The report has progressed to case assignment.",
  },
  {
    title: "Investigation / Resolution",
    description: "The case is being investigated or has reached a resolution.",
  },
];

const STATUS_PROGRESS = {
  "Under Review": 2,
  Assigned: 3,
  Investigation: 4,
  Resolved: 4,
};

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusMessage(status) {
  switch (status) {
    case "Assigned":
      return {
        title: "Your report has been assigned",
        description:
          "Your report has progressed to case assignment for further handling by an authorized official.",
      };
    case "Investigation":
      return {
        title: "Your case is under investigation",
        description:
          "The case is being investigated by authorized personnel. Check back for further updates.",
      };
    case "Resolved":
      return {
        title: "Your report has been resolved",
        description:
          "The report is marked as resolved in the system.",
      };
    default:
      return {
        title: "Your report is under review",
        description:
          "Your report has been received and is currently being reviewed by an authorized official.",
      };
  }
}

function ReportDetails() {
  const { reportId } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getAuthToken();

      if (!token) {
        clearAuthSession();
        navigate("/login", { replace: true });
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/reports/${encodeURIComponent(reportId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        clearAuthSession();
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Unable to load this report. Please try again."
        );
      }

      const fetchedReport = data.report || data.data?.report || data.data;

      if (!fetchedReport || typeof fetchedReport !== "object") {
        throw new Error("The server did not return report information.");
      }

      setReport(fetchedReport);
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [reportId, navigate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
  };

  const location = report?.location || {};
  const aiAnalysis = report?.aiAnalysis || {};
  const status = report?.status || "Under Review";
  const statusMessage = getStatusMessage(status);

  const submittedDate = report?.createdAt || report?.updatedAt;
  const progressIndex = STATUS_PROGRESS[status] ?? 2;

  const address =
    typeof location === "string"
      ? location
      : location.address || "Location not provided";

  const incidentType =
    report?.incidentType || "Incident type not provided";

  const incidentTitle =
    report?.title || incidentType;

  const description =
    report?.description || "No description was provided.";

  const urgency = aiAnalysis.urgency || report?.priority || "Not available";

  const duplicateResult =
    aiAnalysis.possibleDuplicate === true
      ? "Possible Match"
      : aiAnalysis.possibleDuplicate === false
        ? "No Strong Match"
        : "Not available";

  const uploadBaseUrl =
    import.meta.env.VITE_UPLOADS_URL ||
    `${API_BASE_URL.replace(/\/api\/?$/, "")}/uploads`;

  const evidence = Array.isArray(report?.evidence) ? report.evidence : [];

  if (loading) {
    return (
      <div className="details-page">
        <aside className="details-sidebar">
          <Link to="/" className="details-logo">
            Civic<span>Shield</span>
          </Link>
          <nav className="details-nav">
            <Link to="/citizen/dashboard" className="details-nav-link">
              <span>⌂</span> Dashboard
            </Link>
            <Link to="/citizen/report" className="details-nav-link">
              <span>＋</span> Report Incident
            </Link>
            <Link
              to="/citizen/reports"
              className="details-nav-link active"
            >
              <span>▤</span> My Reports
            </Link>
          </nav>
        </aside>

        <main className="details-main">
          <p>Loading your report...</p>
        </main>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="details-page">
        <aside className="details-sidebar">
          <Link to="/" className="details-logo">
            Civic<span>Shield</span>
          </Link>
          <nav className="details-nav">
            <Link to="/citizen/dashboard" className="details-nav-link">
              <span>⌂</span> Dashboard
            </Link>
            <Link
              to="/citizen/reports"
              className="details-nav-link active"
            >
              <span>▤</span> My Reports
            </Link>
          </nav>
        </aside>

        <main className="details-main">
          <Link to="/citizen/reports" className="back-reports">
            ← Back to My Reports
          </Link>

          <section className="details-card">
            <h2>Unable to load report</h2>
            <p>{error || "Report information is unavailable."}</p>
            <button type="button" onClick={fetchReport}>
              Retry
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="details-page">
      {/* Sidebar */}
      <aside className="details-sidebar">
        <Link to="/" className="details-logo">
          Civic<span>Shield</span>
        </Link>

        <nav className="details-nav">
          <Link to="/citizen/dashboard" className="details-nav-link">
            <span>⌂</span>
            Dashboard
          </Link>

          <Link to="/citizen/report" className="details-nav-link">
            <span>＋</span>
            Report Incident
          </Link>

          <Link
            to="/citizen/reports"
            className="details-nav-link active"
          >
            <span>▤</span>
            My Reports
          </Link>

          <Link to="/citizen/map" className="details-nav-link">
            <span>⌖</span>
            Safety Map
          </Link>

          <Link to="/citizen/alerts" className="details-nav-link">
            <span>♢</span>
            Safety Alerts
          </Link>
        </nav>

        <div className="details-sidebar-bottom">
          <Link to="/citizen/profile" className="details-nav-link">
            <span>◯</span>
            Profile
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="details-nav-link"
          >
            <span>↪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="details-main">
        <header className="details-header">
          <div>
            <Link to="/citizen/reports" className="back-reports">
              ← Back to My Reports
            </Link>

            <p className="details-label">
              REPORT #{report.caseId || report._id || reportId}
            </p>

            <h1>{incidentTitle}</h1>

            <p className="details-subtitle">
              Submitted on {formatDate(submittedDate)}
            </p>
          </div>

          <span
            className={`details-status ${String(status)
              .toLowerCase()
              .replace(/\s+/g, "-")}`}
          >
            {status}
          </span>
        </header>

        {/* Status Banner */}
        <section className="status-banner">
          <div className="status-banner-icon">◷</div>
          <div>
            <strong>{statusMessage.title}</strong>
            <p>{statusMessage.description}</p>
          </div>
        </section>

        {/* Main Grid */}
        <div className="details-grid">
          <div className="details-left">
            {/* Timeline */}
            <section className="details-card">
              <div className="details-card-heading">
                <div>
                  <p className="details-card-label">CASE PROGRESS</p>
                  <h2>Report Timeline</h2>
                </div>
              </div>

              <div className="timeline">
                {STATUS_STEPS.map((step, index) => {
                  const completed = index < progressIndex;
                  const current = index === progressIndex;

                  let timestamp = "";

                  if (index === 0) {
                    timestamp = formatDateTime(submittedDate);
                  } else if (index === progressIndex) {
                    timestamp =
                      status === "Resolved"
                        ? `Current status: ${status}`
                        : "Currently in progress";
                  } else if (index > progressIndex) {
                    timestamp = "Pending";
                  } else if (index === 1) {
                    timestamp = "Processing completed";
                  } else {
                    timestamp = "Progress recorded";
                  }

                  return (
                    <div
                      className={`timeline-item ${
                        completed ? "completed" : ""
                      } ${current ? "current" : ""}`}
                      key={step.title}
                    >
                      <div className="timeline-marker">
                        {completed ? "✓" : current ? "•" : index + 1}
                      </div>

                      <div className="timeline-content">
                        <strong>{step.title}</strong>
                        <span>{timestamp}</span>
                        <p>{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Report Information */}
            <section className="details-card">
              <div className="details-card-heading">
                <div>
                  <p className="details-card-label">
                    SUBMITTED INFORMATION
                  </p>
                  <h2>Incident Details</h2>
                </div>
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <span>Incident Type</span>
                  <strong>{incidentType}</strong>
                </div>

                <div className="info-item">
                  <span>Date Submitted</span>
                  <strong>{formatDate(submittedDate)}</strong>
                </div>

                <div className="info-item">
                  <span>Priority</span>
                  <strong>{report.priority || "Not assigned"}</strong>
                </div>

                <div className="info-item">
                  <span>Location</span>
                  <strong>{address}</strong>
                </div>

                <div className="info-item">
                  <span>Assigned Official</span>
                  <strong>
                    {report.assignedTo?.name || "Not yet assigned"}
                  </strong>
                </div>
              </div>

              <div className="description-box">
                <span>Description</span>
                <p>{description}</p>
              </div>

              {evidence.length > 0 && (
                <div className="description-box">
                  <span>Submitted Evidence</span>
                  <ul>
                    {evidence.map((file, index) => {
                      const filePath = file.path || file.filename;
                      const fileUrl = filePath
                        ? `${uploadBaseUrl.replace(/\/$/, "")}/${String(
                            filePath
                          )
                            .replace(/\\/g, "/")
                            .split("/")
                            .pop()
                            .split("/")
                            .map(encodeURIComponent)
                            .join("/")}`
                        : null;

                      return (
                        <li key={file.filename || index}>
                          {fileUrl ? (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {file.originalName || file.filename || "View file"}
                            </a>
                          ) : (
                            file.originalName || "Evidence file"
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>
          </div>

          {/* Right */}
          <div className="details-right">
            {/* AI Analysis */}
            <section className="ai-card">
              <div className="ai-card-header">
                <div className="ai-icon">✦</div>
                <div>
                  <p>AI-ASSISTED ANALYSIS</p>
                  <h2>System Analysis</h2>
                </div>
              </div>

              <div className="ai-result">
                <span>Suggested Incident Category</span>
                <strong>
                  {aiAnalysis.category || "Not available"}
                </strong>
              </div>

              <div className="ai-result">
                <span>Urgency Assessment</span>
                <strong className="medium">{urgency}</strong>
              </div>

              <div className="ai-result">
                <span>Potential Duplicate</span>
                <strong className="clear">{duplicateResult}</strong>
              </div>

              <div className="ai-disclaimer">
                AI analysis is provided as decision-support information
                for authorized officials. It does not determine guilt
                or independently label individuals as criminals.
              </div>
            </section>

            {/* Location */}
            <section className="location-card">
              <p className="details-card-label">INCIDENT LOCATION</p>
              <h2>{address}</h2>

              <div className="fake-map">
                <div className="map-grid"></div>
                <div className="map-pin">●</div>
                <span className="map-road road-one"></span>
                <span className="map-road road-two"></span>
                <span className="map-road road-three"></span>
              </div>

              {typeof location === "object" &&
                location.latitude != null &&
                location.longitude != null && (
                  <a
                    href={`https://www.google.com/maps?q=${encodeURIComponent(
                      `${location.latitude},${location.longitude}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open location in Google Maps
                  </a>
                )}

              <p className="location-note">
                Location information is based on the details provided
                with the report.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ReportDetails;