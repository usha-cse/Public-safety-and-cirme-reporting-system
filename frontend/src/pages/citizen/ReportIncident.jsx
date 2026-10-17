import { useState } from "react";
import { Link } from "react-router-dom";
import { clearAuthSession } from "../../utils/auth";
import "./ReportIncident.css";

function ReportIncident() {
  const [incidentType, setIncidentType] = useState("");
  const [urgency, setUrgency] = useState("Medium");
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [location, setLocation] = useState({
  address: "",
  latitude: "",
  longitude: "",
});

const [gettingLocation, setGettingLocation] = useState(false);
const [locationError, setLocationError] = useState("");
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    if (files.length > 5) {
      setEvidence([]);
      event.target.value = "";
      setError("Please select no more than 5 files.");
      return;
    }

    const invalidFile = files.find(
      (file) =>
        !allowedTypes.includes(file.type) ||
        file.size > 20 * 1024 * 1024
    );

    if (invalidFile) {
      setEvidence([]);
      event.target.value = "";
      setError(
        "Choose supported image/video files, each no larger than 20 MB."
      );
      return;
    }

    setEvidence(files);
    setError("");
    setSuccess("");
  };

  const handleUseLocation = () => {
  setLocationError("");

  if (!navigator.geolocation) {
    setLocationError("Geolocation is not supported by this browser.");
    return;
  }

  setGettingLocation(true);

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setLocation((previous) => ({
        ...previous,
        latitude: String(position.coords.latitude),
        longitude: String(position.coords.longitude),
      }));

      setGettingLocation(false);
    },
    (error) => {
      const message =
        error.code === 1
          ? "Location permission denied. Allow location access in your browser settings."
          : error.code === 2
          ? "Your current location could not be determined. Try again or enter the address manually."
          : "Getting your location timed out. Please try again.";

      setLocationError(message);
      setGettingLocation(false);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    }
  );
};

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!incidentType) {
      setError("Please select an incident type.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    const incidentTypes = {
      crime: "Crime",
      suspicious: "Suspicious Activity",
      hazard: "Safety Hazard",
    };

    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken");

    if (!token) {
      setError("Your login session was not found. Please log in again.");
      return;
    }

    const address = String(formData.get("location") || "").trim();
    const rawDescription = String(
      formData.get("description") || ""
    ).trim();

    if (!form.checkValidity()) {
      form.reportValidity();
      setError("Please complete all required fields.");
      return;
    }

    if (!address) {
      setError("Please enter the incident location.");
      return;
    }

    if (!rawDescription) {
      setError("Please enter an incident description.");
      return;
    }

    const description = [
      rawDescription,
      `Incident date: ${formData.get("incidentDate") || "Not provided"}`,
      `Approximate time: ${formData.get("incidentTime") || "Not provided"}`,
      `Requested urgency: ${urgency}`,
      String(formData.get("additionalDetails") || "").trim()
        ? `Additional details: ${String(
            formData.get("additionalDetails")
          ).trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const uploadData = new FormData();
    uploadData.append("title", incidentTypes[incidentType]);
    uploadData.append("description", description);
    uploadData.append("incidentType", incidentTypes[incidentType]);
    uploadData.append("location",JSON.stringify({address,latitude: location.latitude || "",longitude: location.longitude || "",
  })
);
    uploadData.append("priority", urgency);

    evidence.forEach((file) => {
      uploadData.append("evidence", file);
    });

    setLoading(true);

    try {
      const apiUrl = (
        import.meta.env.VITE_API_URL || "http://localhost:5000"
      ).replace(/\/+$/, "");

      const response = await fetch(`${apiUrl}/api/reports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.error ||
            `Report submission failed (${response.status}).`
        );
      }

      setSuccess(
        `Report submitted successfully!${
          result.report?._id ? ` Report ID: ${result.report._id}` : ""
        }`
      );

      form.reset();
      setIncidentType("");
      setUrgency("Medium");
      setEvidence([]);
      setLocation({address: "",latitude: "",longitude: "",
      });
setLocationError("");
    } catch (err) {
      console.error("Report submission error:", err);
      setError(
        err.message ||
          "Could not connect to the backend. Check that it is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-page">
      <aside className="report-sidebar">
        <Link to="/" className="report-logo">
          Civic<span>Shield</span>
        </Link>

        <nav className="report-nav">
          <Link to="/citizen/dashboard" className="report-nav-link">
            <span>⌂</span> Dashboard
          </Link>
          <Link
            to="/citizen/report"
            className="report-nav-link active"
          >
            <span>＋</span> Report Incident
          </Link>
          <Link to="/citizen/reports" className="report-nav-link">
            <span>▤</span> My Reports
          </Link>
          <Link to="/citizen/map" className="report-nav-link">
            <span>⌖</span> Safety Map
          </Link>
          <Link to="/citizen/alerts" className="report-nav-link">
            <span>♢</span> Safety Alerts
          </Link>
        </nav>

        <div className="report-sidebar-bottom">
          <Link to="/citizen/profile" className="report-nav-link">
            <span>◯</span> Profile
          </Link>
          <Link
            to="/login"
            onClick={clearAuthSession}
            className="report-nav-link"
          >
            <span>↪</span> Logout
          </Link>
        </div>
      </aside>

      <main className="report-main">
        <header className="report-header">
          <div>
            <p className="report-label">CITIZEN PORTAL</p>
            <h1>Report an Incident</h1>
            <p className="report-intro">
              Provide accurate information to help authorized officials
              understand and respond to the incident.
            </p>
          </div>
          <Link to="/citizen/dashboard" className="back-dashboard">
            ← Dashboard
          </Link>
        </header>

        <div className="report-progress">
          <div className="progress-step active">
            <span>1</span><p>Incident</p>
          </div>
          <div className="progress-line" />
          <div className="progress-step">
            <span>2</span><p>Evidence</p>
          </div>
          <div className="progress-line" />
          <div className="progress-step">
            <span>3</span><p>Location</p>
          </div>
          <div className="progress-line" />
          <div className="progress-step">
            <span>4</span><p>Review</p>
          </div>
        </div>

        <form
          className="incident-form"
          onSubmit={handleSubmit}
          onInvalid={(event) => {
            const field = event.target;
            const labels = {
              incidentDate: "Date of Incident",
              description: "Incident Description",
              location: "Incident Location",
            };
            setError(
              labels[field.name]
                ? `Please complete: ${labels[field.name]}.`
                : "Please complete all required fields."
            );
          }}
        >
          <section className="form-card">
            <div className="form-card-header">
              <div className="form-number">01</div>
              <div>
                <h2>Incident Information</h2>
                <p>Tell us what type of incident you want to report.</p>
              </div>
            </div>

            <div className="form-group">
              <label>Incident Type <span>*</span></label>
              <div className="incident-types">
                <button
                  type="button"
                  className={`incident-option ${
                    incidentType === "crime" ? "selected" : ""
                  }`}
                  onClick={() => {
                    setIncidentType("crime");
                    setError("");
                  }}
                >
                  <strong>⚠</strong>
                  <div>
                    <b>Crime</b>
                    <small>Theft, assault, vandalism or other crimes</small>
                  </div>
                </button>

                <button
                  type="button"
                  className={`incident-option ${
                    incidentType === "suspicious" ? "selected" : ""
                  }`}
                  onClick={() => {
                    setIncidentType("suspicious");
                    setError("");
                  }}
                >
                  <strong>👁</strong>
                  <div>
                    <b>Suspicious Activity</b>
                    <small>Unusual or potentially concerning activity</small>
                  </div>
                </button>

                <button
                  type="button"
                  className={`incident-option ${
                    incidentType === "hazard" ? "selected" : ""
                  }`}
                  onClick={() => {
                    setIncidentType("hazard");
                    setError("");
                  }}
                >
                  <strong>!</strong>
                  <div>
                    <b>Safety Hazard</b>
                    <small>Roads, infrastructure or environmental hazards</small>
                  </div>
                </button>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date of Incident <span>*</span></label>
                <input type="date" name="incidentDate" required />
              </div>
              <div className="form-group">
                <label>Approximate Time</label>
                <input type="time" name="incidentTime" />
              </div>
            </div>

            <div className="form-group">
              <label>Incident Description <span>*</span></label>
              <textarea
                name="description"
                required
                minLength={5}
                rows={6}
                placeholder="Describe what happened, where it happened and when."
              />
              <small className="field-help">
                Please provide factual information and avoid assumptions
                about individuals involved.
              </small>
            </div>
          </section>

          <section className="form-card">
            <div className="form-card-header">
              <div className="form-number">02</div>
              <div>
                <h2>Evidence &amp; Media</h2>
                <p>
                  Upload photographs or videos that may help officials.
                </p>
              </div>
            </div>

            <div className="upload-area">
              <input
                type="file"
                id="evidence"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                onChange={handleFileChange}
              />
              <label htmlFor="evidence">
                <div className="upload-icon">↑</div>
                <strong>Click to upload evidence</strong>
                <span>Up to 5 images or videos, 20 MB each</span>
              </label>
            </div>

            {evidence.length > 0 && (
              <div className="file-list">
                <p>{evidence.length} file(s) selected</p>
                {evidence.map((file, index) => (
                  <div
                    className="selected-file"
                    key={`${file.name}-${index}`}
                  >
                    <span>📎</span> {file.name}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="form-card">
  <div className="form-card-header">
    <div className="form-number">03</div>
    <div>
      <h2>Incident Location</h2>
      <p>Help officials identify where it happened.</p>
    </div>
  </div>

  <div className="incident-location">
    <button
      type="button"
      className="use-location-btn"
      onClick={handleUseLocation}
      disabled={gettingLocation}
    >
      📍 {gettingLocation ? "Getting Location..." : "Use My Location"}
    </button>

    {locationError && (
      <p className="location-hint" role="alert">
        {locationError}
      </p>
    )}

    <div className="form-group">
      <label htmlFor="incident-location">Address / Location Description *</label>
      <input
        id="incident-location"
        type="text"
        name="location"
        value={location.address}
        onChange={(event) =>
          setLocation((previous) => ({
            ...previous,
            address: event.target.value,
          }))
        }
        placeholder="Enter the location or nearby landmark"
        required
      />
    </div>

    <div className="coordinates-row">
      <div className="form-group">
        <label htmlFor="incident-latitude">Latitude</label>
        <input
          id="incident-latitude"
          type="text"
          value={location.latitude}
          readOnly
          placeholder="Obtained from GPS"
        />
      </div>

      <div className="form-group">
        <label htmlFor="incident-longitude">Longitude</label>
        <input
          id="incident-longitude"
          type="text"
          value={location.longitude}
          readOnly
          placeholder="Obtained from GPS"
        />
      </div>
    </div>

    <p className="location-hint">
      Use GPS to capture coordinates, or enter the incident address manually.
    </p>
  </div>
</section>

          <section className="form-card">
            <div className="form-card-header">
              <div className="form-number">04</div>
              <div>
                <h2>Additional Information</h2>
                <p>Provide information that may help with assessment.</p>
              </div>
            </div>

            <div className="form-group">
              <label>How urgent is the situation?</label>
              <div className="urgency-options">
                {["Low", "Medium", "High"].map((level) => (
                  <button
                    type="button"
                    key={level}
                    className={`urgency-option ${
                      urgency === level
                        ? `urgency-${level.toLowerCase()}`
                        : ""
                    }`}
                    onClick={() => setUrgency(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <small className="field-help">
                Final prioritization is performed by authorized officials.
              </small>
            </div>

            <div className="form-group">
              <label>Additional Details</label>
              <textarea
                name="additionalDetails"
                rows={4}
                placeholder="Anything else officials should know?"
              />
            </div>
          </section>

          <div className="ai-notice">
            <div className="ai-notice-icon">✦</div>
            <div>
              <strong>AI-Assisted Report Analysis</strong>
              <p>
                AI may assist authorized officials with classification
                and urgency assessment. It does not determine guilt.
              </p>
            </div>
          </div>

          {error && (
            <p role="alert" className="field-help">
              {error}
            </p>
          )}

          {success && (
            <p role="status" className="field-help">
              {success}
            </p>
          )}

          <div className="submit-section">
            <Link to="/citizen/dashboard" className="cancel-button">
              Cancel
            </Link>
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Report →"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default ReportIncident;