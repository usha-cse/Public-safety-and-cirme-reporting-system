import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clearAuthSession } from "../../utils/auth";
import "./Profile.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const STATUS = {
  REVIEW: "Under Review",
  ASSIGNED: "Assigned",
  INVESTIGATION: "Investigation",
  RESOLVED: "Resolved",
};

function readStoredUser() {
  try {
    return (
      JSON.parse(localStorage.getItem("user") || "null") ||
      JSON.parse(localStorage.getItem("authUser") || "null") ||
      {}
    );
  } catch {
    return {};
  }
}

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  );
}

async function apiRequest(path) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Unable to load profile information.");
  }

  return data;
}

function getStatus(report) {
  return String(report.status || "").toLowerCase();
}

function OffProfile() {
  const [user, setUser] = useState(readStoredUser);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    location: "",
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const storedUser = readStoredUser();
      setUser(storedUser);

      setForm({
        name: storedUser.name || storedUser.fullName || "",
        phone: storedUser.phone || storedUser.phoneNumber || "",
        location: storedUser.location || "",
      });

      const response = await apiRequest("/api/reports");
      const reportList = Array.isArray(response)
        ? response
        : response.reports || response.data || [];

      setReports(reportList);
    } catch (err) {
      setError(err.message || "Could not load official activity.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const officialId = user._id || user.id;

  const myCases = useMemo(() => {
    if (!officialId) return [];

    return reports.filter((report) => {
      const assigned = report.assignedTo;
      const assignedId =
        typeof assigned === "object" && assigned !== null
          ? assigned._id || assigned.id
          : assigned;

      return assignedId && String(assignedId) === String(officialId);
    });
  }, [reports, officialId]);

  const activity = useMemo(() => {
    const isStatus = (report, status) =>
      getStatus(report) === status.toLowerCase();

    return {
      assigned: myCases.filter(
        (report) => !isStatus(report, STATUS.RESOLVED)
      ).length,

      highPriority: myCases.filter(
        (report) => String(report.priority || "").toLowerCase() === "high"
      ).length,

      investigating: myCases.filter((report) =>
        ["investigation", "under investigation"].includes(getStatus(report))
      ).length,

      resolved: myCases.filter((report) =>
        isStatus(report, STATUS.RESOLVED)
      ).length,
    };
  }, [myCases]);

  const displayName =
    form.name ||
    user.name ||
    user.fullName ||
    "Authorized Official";

  const email = user.email || "Email not provided";
  const role = user.role || "official";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "AO";

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function saveLocalProfile(event) {
    event.preventDefault();

    const updatedUser = {
      ...user,
      name: form.name.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
    };

    setUser(updatedUser);

    // Updates this browser's saved profile only.
    // A backend profile-update endpoint is needed to save changes to MongoDB.
    localStorage.setItem("user", JSON.stringify(updatedUser));

    setEditing(false);
  }

  return (
    <div className="official-profile-page">
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
          <Link to="/official/reports">▣ <span>All Reports</span></Link>
          <Link to="/official/assigned-cases">◉ <span>Assigned Cases</span></Link>
          <Link to="/official/cases">◈ <span>Case Management</span></Link>
          <Link to="/official/map">⌖ <span>Incident Map</span></Link>
          <Link to="/official/alerts">! <span>Alerts</span></Link>
          <Link to="/official/analytics">◒ <span>Analytics</span></Link>
        </nav>

        <div className="official-bottom">
          <Link to="/official/profile" className="active">
            ◯ <span>Profile</span>
          </Link>

          <Link to="/login" onClick={clearAuthSession}>
            ↪ <span>Logout</span>
          </Link>
        </div>
      </aside>

      <main className="official-profile-main">
        <header className="official-profile-header">
          <div>
            <p className="page-label">ACCOUNT</p>
            <h1>Official Profile</h1>
            <p className="page-description">
              View your account information and current case workload.
            </p>
          </div>

          <div className="profile-status">
            <span />
            Account Active
          </div>
        </header>

        {error && (
          <div className="profile-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={loadProfile}>
              Try Again
            </button>
          </div>
        )}

        <section className="profile-overview-card">
          <div className="profile-avatar">{initials}</div>

          <div className="profile-overview-info">
            <h2>{displayName}</h2>
            <p>Case Management Officer</p>
            <span>
              {email} · {role}
            </span>
          </div>

          <div className="verification-badge">
            ✓ Official Account
          </div>
        </section>

        <section className="profile-grid">
          <div className="profile-card">
            <div className="profile-card-header">
              <div>
                <h2>Personal Information</h2>
                <p>Your account details.</p>
              </div>
            </div>

            {editing ? (
              <form onSubmit={saveLocalProfile} className="profile-fields">
                <div className="profile-field">
                  <label htmlFor="profile-name">Full Name</label>
                  <input
                    id="profile-name"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="profile-field">
                  <label>Email Address</label>
                  <strong>{email}</strong>
                </div>

                <div className="profile-field">
                  <label htmlFor="profile-phone">Phone Number</label>
                  <input
                    id="profile-phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="profile-location">Location</label>
                  <input
                    id="profile-location"
                    name="location"
                    value={form.location}
                    onChange={handleInputChange}
                    placeholder="Enter your location"
                  />
                </div>

                <p className="profile-save-note">
                  These changes are saved in this browser only.
                </p>

                <div className="profile-edit-actions">
                  <button type="submit" className="edit-profile-btn">
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="edit-profile-btn"
                    onClick={() => {
                      setForm({
                        name: user.name || user.fullName || "",
                        phone: user.phone || user.phoneNumber || "",
                        location: user.location || "",
                      });
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="profile-fields">
                  <div className="profile-field">
                    <label>Full Name</label>
                    <strong>{displayName}</strong>
                  </div>

                  <div className="profile-field">
                    <label>Email Address</label>
                    <strong>{email}</strong>
                  </div>

                  <div className="profile-field">
                    <label>Phone Number</label>
                    <strong>{form.phone || "Not provided"}</strong>
                  </div>

                  <div className="profile-field">
                    <label>Location</label>
                    <strong>{form.location || "Not provided"}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="edit-profile-btn"
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </button>
              </>
            )}
          </div>

          <div className="profile-card">
            <div className="profile-card-header">
              <div>
                <h2>Official Access</h2>
                <p>Your current account permissions.</p>
              </div>
            </div>

            <div className="access-list">
              <div className="access-row">
                <span>Account Type</span>
                <strong>Authorized Official</strong>
              </div>

              <div className="access-row">
                <span>Access Level</span>
                <strong>Case Management</strong>
              </div>

              <div className="access-row">
                <span>Account Status</span>
                <strong className="active-text">Active</strong>
              </div>

              <div className="access-row">
                <span>Portal Access</span>
                <strong className="active-text">
                  {role === "official" ? "Official Role" : role}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section className="profile-card activity-card">
          <div className="profile-card-header">
            <div>
              <h2>Official Activity</h2>
              <p>Cases assigned to your account.</p>
            </div>

            <button
              type="button"
              className="edit-profile-btn"
              onClick={loadProfile}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="activity-grid">
            <div className="activity-stat">
              <strong>{loading ? "—" : activity.assigned}</strong>
              <span>Open Assigned Cases</span>
            </div>

            <div className="activity-stat">
              <strong>{loading ? "—" : activity.highPriority}</strong>
              <span>High Priority</span>
            </div>

            <div className="activity-stat">
              <strong>{loading ? "—" : activity.investigating}</strong>
              <span>Under Investigation</span>
            </div>

            <div className="activity-stat">
              <strong>{loading ? "—" : activity.resolved}</strong>
              <span>Cases Resolved</span>
            </div>
          </div>

          {!loading && myCases.length === 0 && (
            <p className="profile-activity-note">
              No cases are currently assigned to this account.
            </p>
          )}
        </section>

        <section className="security-card">
          <div className="security-icon">✓</div>

          <div>
            <h3>Authorized Access &amp; Security</h3>
            <p>
              This account may provide access to sensitive case information.
              Keep your credentials secure and use the official portal only
              for authorized case-management activities.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default OffProfile;