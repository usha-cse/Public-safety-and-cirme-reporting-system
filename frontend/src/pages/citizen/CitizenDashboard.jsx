import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { clearAuthSession } from "../../utils/auth";
import "./CitizenDashboard.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

function getLoggedInUser() {
  const possibleKeys = [
    "user",
    "authUser",
    "civicshield_user",
    "currentUser",
  ];

  for (const key of possibleKeys) {
    try {
      const value = localStorage.getItem(key);
      if (!value) continue;

      const user = JSON.parse(value);

      if (user && typeof user === "object" && user.name) {
        return user;
      }
    } catch {
      // Ignore invalid stored user data.
    }
  }

  return null;
}

function getStatusClass(status) {
  const normalized = (status || "").toLowerCase();

  if (normalized === "resolved") return "resolved";
  if (normalized === "assigned") return "assigned";
  if (normalized === "investigation") return "assigned";
  if (normalized === "under review") return "under-review";

  return "under-review";
}

function getReportIcon(status) {
  const normalized = (status || "").toLowerCase();

  if (normalized === "resolved") return "✓";
  if (normalized === "assigned" || normalized === "investigation") {
    return "!";
  }

  return "⚠";
}

function CitizenDashboard() {
  const [user] = useState(getLoggedInUser);
  const [openMenu, setOpenMenu] = useState(null);

  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState("");

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  const displayName = user?.name || "Citizen";
  const initial = displayName.trim().charAt(0).toUpperCase() || "C";

  // Fetch only the reports belonging to the authenticated citizen.
  const fetchMyReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError("");

    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken");

    if (!token) {
      setReports([]);
      setReportsError("Please log in to view your reports.");
      setReportsLoading(false);
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
          data.message || "Failed to load your reports."
        );
      }

      if (!Array.isArray(data.reports)) {
        throw new Error(
          "The server response did not contain a reports list."
        );
      }

      setReports(data.reports);
    } catch (error) {
      console.error("Dashboard reports error:", error);
      setReports([]);
      setReportsError(
        error.message || "Unable to load your reports."
      );
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyReports();
  }, [fetchMyReports]);

  // Close menus when clicking outside or pressing Escape.
  useEffect(() => {
    const handleOutsideClick = (event) => {
      const clickedNotification =
        notificationRef.current?.contains(event.target);

      const clickedProfile =
        profileRef.current?.contains(event.target);

      if (!clickedNotification && !clickedProfile) {
        setOpenMenu(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = () => {
    setOpenMenu(null);
    clearAuthSession();
  };

  // Calculate statistics using this citizen's reports only.
  const getStatus = (report) =>
    (report.status || "Under Review").toLowerCase();

  const totalReports = reports.length;

  const underReviewCount = reports.filter(
    (report) => getStatus(report) === "under review"
  ).length;

  const assignedCount = reports.filter(
    (report) =>
      getStatus(report) === "assigned" ||
      getStatus(report) === "investigation"
  ).length;

  const resolvedCount = reports.filter(
    (report) => getStatus(report) === "resolved"
  ).length;

  const recentReports = [...reports]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    )
    .slice(0, 3);

  return (
    <div className="citizen-dashboard">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <Link to="/" className="dashboard-logo">
          Civic<span>Shield</span>
        </Link>

        <nav className="sidebar-nav">
          <Link to="/citizen/dashboard" className="sidebar-link active">
            <span>⌂</span>
            Dashboard
          </Link>

          <Link to="/citizen/report" className="sidebar-link">
            <span>＋</span>
            Report Incident
          </Link>

          <Link to="/citizen/reports" className="sidebar-link">
            <span>▤</span>
            My Reports
          </Link>

          <Link to="/citizen/map" className="sidebar-link">
            <span>⌖</span>
            Safety Map
          </Link>

          <Link to="/citizen/alerts" className="sidebar-link">
            <span>♢</span>
            Safety Alerts
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <Link to="/citizen/profile" className="sidebar-link">
            <span>◯</span>
            Profile
          </Link>

          <Link
            to="/login"
            onClick={handleLogout}
            className="sidebar-link logout-link"
          >
            <span>↪</span>
            Logout
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Bar */}
        <header className="dashboard-header">
          <div>
            <p className="dashboard-label">CITIZEN PORTAL</p>
            <h1>Hello 👋</h1>
          </div>

          <div className="header-actions">
            {/* Notification Menu */}
            <div
              className="header-menu-wrapper"
              ref={notificationRef}
            >
              <button
                type="button"
                className="notification-button"
                aria-label="Open notifications"
                aria-expanded={openMenu === "notifications"}
                onClick={() =>
                  setOpenMenu((current) =>
                    current === "notifications"
                      ? null
                      : "notifications"
                  )
                }
              >
                🔔
              </button>

              {openMenu === "notifications" && (
                <div className="header-dropdown notification-dropdown">
                  <div className="dropdown-heading">
                    <strong>Notifications</strong>
                  </div>

                  <div className="dropdown-empty">
                    <span className="dropdown-empty-icon">♢</span>
                    <strong>Stay updated</strong>
                    <p>
                      Visit your reports to check the latest status
                      of incidents you have submitted.
                    </p>
                  </div>

                  <Link
                    to="/citizen/reports"
                    className="dropdown-footer-link"
                    onClick={() => setOpenMenu(null)}
                  >
                    View My Reports →
                  </Link>

                  <Link
                    to="/citizen/alerts"
                    className="dropdown-footer-link"
                    onClick={() => setOpenMenu(null)}
                  >
                    View Safety Alerts →
                  </Link>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="header-menu-wrapper" ref={profileRef}>
              <button
                type="button"
                className="user-profile profile-menu-trigger"
                aria-label="Open account menu"
                aria-expanded={openMenu === "profile"}
                onClick={() =>
                  setOpenMenu((current) =>
                    current === "profile" ? null : "profile"
                  )
                }
              >
                <span className="user-avatar">{initial}</span>

                <span className="user-profile-text">
                  <strong>{displayName}</strong>
                  <small>
                    {user?.role === "official" ? "Official" : "Resident"}
                  </small>
                </span>

                <span className="profile-chevron">⌄</span>
              </button>

              {openMenu === "profile" && (
                <div className="header-dropdown profile-dropdown">
                  <div className="profile-dropdown-user">
                    <span className="user-avatar">{initial}</span>
                    <div>
                      <strong>{displayName}</strong>
                      <small>
                        {user?.email || "CivicShield account"}
                      </small>
                    </div>
                  </div>

                  <Link
                    to="/citizen/profile"
                    className="dropdown-menu-link"
                    onClick={() => setOpenMenu(null)}
                  >
                    <span>◯</span>
                    My Profile
                  </Link>

                  <Link
                    to="/citizen/reports"
                    className="dropdown-menu-link"
                    onClick={() => setOpenMenu(null)}
                  >
                    <span>▤</span>
                    My Reports
                  </Link>

                  <Link
                    to="/login"
                    className="dropdown-menu-link dropdown-logout"
                    onClick={handleLogout}
                  >
                    <span>↪</span>
                    Logout
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Welcome */}
        <section className="welcome-section">
          <div>
            <h2>Help keep your community safe.</h2>
            <p>
              Report incidents, track your complaints and stay
              informed about safety concerns in your area.
            </p>
          </div>

          <Link to="/citizen/report" className="report-button">
            + Report an Incident
          </Link>
        </section>

        {/* Statistics */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">▤</div>
            <div>
              <span>Total Reports</span>
              <strong>
                {reportsLoading ? "…" : totalReports}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pending-icon">◷</div>
            <div>
              <span>Under Review</span>
              <strong>
                {reportsLoading ? "…" : underReviewCount}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon assigned-icon">◉</div>
            <div>
              <span>Assigned</span>
              <strong>
                {reportsLoading ? "…" : assignedCount}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon resolved-icon">✓</div>
            <div>
              <span>Resolved</span>
              <strong>
                {reportsLoading ? "…" : resolvedCount}
              </strong>
            </div>
          </div>
        </section>

        {/* Main Grid */}
        <section className="dashboard-grid">
          {/* Recent Reports */}
          <div className="dashboard-card reports-card">
            <div className="card-heading">
              <div>
                <p className="card-label">ACTIVITY</p>
                <h3>Recent Reports</h3>
              </div>

              <Link to="/citizen/reports">View all →</Link>
            </div>

            {reportsLoading ? (
              <p role="status">Loading your reports...</p>
            ) : reportsError ? (
              <div role="alert">
                <p>{reportsError}</p>
                <button
                  type="button"
                  onClick={fetchMyReports}
                >
                  Try Again
                </button>
              </div>
            ) : recentReports.length === 0 ? (
              <div className="dropdown-empty">
                <strong>No reports yet</strong>
                <p>You haven't submitted any incident reports.</p>
                <Link to="/citizen/report" className="quick-action">
                  Report an Incident →
                </Link>
              </div>
            ) : (
              recentReports.map((report) => {
                const status = report.status || "Under Review";
                const statusClass = getStatusClass(status);

                return (
                  <div className="report-row" key={report._id}>
                    <div className={`report-type ${statusClass}`}>
                      {getReportIcon(status)}
                    </div>

                    <div className="report-info">
                      <strong>
                        {report.title ||
                          report.incidentType ||
                          "Incident Report"}
                      </strong>
                      <span>
                        Reported{" "}
                        {report.createdAt
                          ? new Date(report.createdAt).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "date unavailable"}
                      </span>
                    </div>

                    <span className={`status ${statusClass}`}>
                      {status}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card quick-card">
            <p className="card-label">QUICK ACTIONS</p>
            <h3>Need to report something?</h3>

            <p>
              Submit a detailed report with evidence and location
              information.
            </p>

            <Link to="/citizen/report" className="quick-action">
              Report an Incident
              <span>→</span>
            </Link>

            <Link
              to="/citizen/map"
              className="quick-action secondary-action"
            >
              Explore Safety Map
              <span>→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CitizenDashboard;