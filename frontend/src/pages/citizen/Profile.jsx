import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { clearAuthSession } from "../../utils/auth";
import "./Profile.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

function Profile() {
  const [user, setUser] = useState(null);
  const [reportCount, setReportCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const getToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("authToken");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = getToken();

    if (!token) {
      setError("Please log in to view your profile.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to load your profile.");
      }

      setUser(data.user);
      setName(data.user.name || "");
    } catch (err) {
      setError(err.message || "Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReportCount = useCallback(async () => {
    const token = getToken();

    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/reports/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setReportCount(
          typeof data.count === "number"
            ? data.count
            : Array.isArray(data.reports)
              ? data.reports.length
              : 0
        );
      }
    } catch (err) {
      console.error("Could not load report count:", err);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadReportCount();
  }, [loadProfile, loadReportCount]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const trimmedName = name.trim();

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setError("Name must be between 2 and 80 characters.");
      return;
    }

    const token = getToken();

    if (!token) {
      setError("Please log in again to update your profile.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to update your name.");
      }

      setUser(data.user);
      setName(data.user.name || trimmedName);
      setEditing(false);
      setMessage("Your name was updated successfully.");

      // Refresh the locally stored user object, if your app keeps one.
      for (const key of ["user", "currentUser"]) {
        try {
          const stored = localStorage.getItem(key);

          if (stored) {
            const parsed = JSON.parse(stored);

            localStorage.setItem(
              key,
              JSON.stringify({
                ...parsed,
                name: data.user.name,
              })
            );
          }
        } catch {
          // The backend profile remains the source of truth.
        }
      }
    } catch (err) {
      setError(err.message || "Failed to update your profile.");
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setName(user?.name || "");
    setEditing(false);
    setError("");
    setMessage("");
  };

  const initials = (user?.name || "Citizen")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return (
    <div className="profile-page">
      <aside className="profile-sidebar">
        <Link to="/" className="profile-logo">
          Civic<span>Shield</span>
        </Link>

        <nav className="profile-nav">
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
          <Link to="/citizen/alerts">
            ✦ <span>Safety Alerts</span>
          </Link>
        </nav>

        <div className="profile-bottom-nav">
          <Link to="/citizen/profile" className="active">
            ◯ <span>Profile</span>
          </Link>
          <Link to="/login" onClick={clearAuthSession}>
            ↪ <span>Logout</span>
          </Link>
        </div>
      </aside>

      <main className="profile-main">
        <header className="profile-header">
          <div>
            <h1>My Profile</h1>
            <p>Manage your account and personal information.</p>
          </div>

          <Link to="/citizen/report" className="profile-report-btn">
            + Report Incident
          </Link>
        </header>

        {loading ? (
          <p role="status">Loading your profile...</p>
        ) : (
          <>
            {error && <p className="profile-error" role="alert">{error}</p>}
            {message && (
              <p className="profile-success" role="status">{message}</p>
            )}

            {user && (
              <>
                <section className="profile-overview">
                  <div className="profile-avatar">{initials || "CS"}</div>

                  <div className="profile-user-info">
                    <h2>{user.name}</h2>
                    <p>
                      {user.role === "official"
                        ? "Official Account"
                        : "Citizen Account"}
                    </p>
                    <span>
                      Member since{" "}
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString(
                            "en-IN",
                            {
                              month: "long",
                              year: "numeric",
                            }
                          )
                        : "date unavailable"}
                    </span>
                  </div>

                  {!editing && (
                    <button
                      type="button"
                      className="edit-profile-btn"
                      onClick={() => {
                        setName(user.name || "");
                        setEditing(true);
                        setError("");
                        setMessage("");
                      }}
                    >
                      Edit Profile
                    </button>
                  )}
                </section>

                {editing && (
                  <section className="profile-section">
                    <div className="section-heading">
                      <h2>Edit Profile</h2>
                      <p>Update your registered name.</p>
                    </div>

                    <form onSubmit={saveProfile}>
                      <div className="profile-field">
                        <label htmlFor="profile-name">Full Name</label>
                        <input
                          id="profile-name"
                          type="text"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          minLength={2}
                          maxLength={80}
                          autoComplete="name"
                          required
                        />
                      </div>

                      <div className="profile-edit-actions">
                        <button type="submit" disabled={saving}>
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </section>
                )}

                <section className="profile-section">
                  <div className="section-heading">
                    <h2>Personal Information</h2>
                    <p>Your registered account details.</p>
                  </div>

                  <div className="profile-grid">
                    <div className="profile-field">
                      <label>Full Name</label>
                      <div>{user.name || "Not provided"}</div>
                    </div>

                    <div className="profile-field">
                      <label>Email Address</label>
                      <div>{user.email || "Not provided"}</div>
                    </div>

                    <div className="profile-field">
                      <label>Phone Number</label>
                      <div>{user.phone || "Not provided"}</div>
                    </div>

                    <div className="profile-field">
                      <label>Account Type</label>
                      <div>
                        {user.role === "official" ? "Official" : "Citizen"}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="profile-section">
                  <div className="section-heading">
                    <h2>Account Information</h2>
                    <p>Basic information about your CivicShield account.</p>
                  </div>

                  <div className="account-list">
                    <div className="account-row">
                      <div>
                        <strong>Account Type</strong>
                        <span>
                          {user.role === "official" ? "Official" : "Citizen"}
                        </span>
                      </div>
                      <span className="account-badge">
                        {user.role === "official" ? "Official" : "Citizen"}
                      </span>
                    </div>

                    <div className="account-row">
                      <div>
                        <strong>Account Status</strong>
                        <span>Your account is registered in CivicShield.</span>
                      </div>
                      <span className="status-badge">Active</span>
                    </div>

                    <div className="account-row">
                      <div>
                        <strong>Reports Submitted</strong>
                        <span>Total incidents reported by you.</span>
                      </div>
                      <strong className="report-count">{reportCount}</strong>
                    </div>
                  </div>
                </section>

                <section className="privacy-card">
                  <div className="privacy-icon">🔒</div>
                  <div>
                    <h3>Your information matters</h3>
                    <p>
                      Personal information submitted through CivicShield
                      should only be used for authorized safety and
                      incident-management purposes.
                    </p>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Profile;