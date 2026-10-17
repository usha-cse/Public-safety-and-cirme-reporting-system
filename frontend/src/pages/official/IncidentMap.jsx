import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clearAuthSession } from "../../utils/auth";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./IncidentMap.css";

// Fix default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const DEFAULT_CENTER = [12.9, 80.23];

const VALID_STATUSES = [
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

async function apiRequest(endpoint) {
  const token = getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Your session may have expired or you do not have permission to view these reports."
    );
  }

  if (!response.ok) {
    throw new Error(data.message || "Unable to load incident reports.");
  }

  return data;
}

function getLocationText(location) {
  if (!location) return "Location not provided";

  if (typeof location === "string") return location;

  if (location.address) return location.address;

  if (
    Number.isFinite(Number(location.latitude)) &&
    Number.isFinite(Number(location.longitude))
  ) {
    return `${location.latitude}, ${location.longitude}`;
  }

  return "Location not provided";
}

function getPosition(report) {
  const location = report.location;

  if (!location || typeof location !== "object") return null;

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  // Ignore empty coordinate values rather than treating them as 0, 0.
  if (
    location.latitude === "" ||
    location.longitude === "" ||
    location.latitude == null ||
    location.longitude == null
  ) {
    return null;
  }

  return [latitude, longitude];
}

function getPriority(report) {
  const priority = String(report.priority || "Medium").toLowerCase();

  if (priority === "high") return "High";
  if (priority === "low") return "Low";

  return "Medium";
}

function getPriorityColor(priority) {
  switch (priority) {
    case "High":
      return "#d94738";
    case "Low":
      return "#3975b6";
    default:
      return "#d89a18";
  }
}

function getReportId(report) {
  return report._id || report.id;
}

function getCaseLabel(report) {
  return report.caseId || report.reportId || getReportId(report);
}

// Adjust map viewport to include available incident coordinates.
function FitMapToIncidents({ incidents }) {
  const map = useMap();

  useEffect(() => {
    if (!incidents.length) {
      map.setView(DEFAULT_CENTER, 12);
      return;
    }

    if (incidents.length === 1) {
      map.setView(incidents[0].position, 14);
      return;
    }

    const bounds = L.latLngBounds(
      incidents.map((incident) => incident.position)
    );

    map.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
  }, [incidents, map]);

  return null;
}

function IncidentMap() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/reports/map");

      // Supports the controller response { incidents: [...] }
      // and common alternatives { reports: [...] } or [...].
      const items = Array.isArray(data)
        ? data
        : data.incidents || data.reports || data.data || [];

      setReports(Array.isArray(items) ? items : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Unable to load incidents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const allIncidents = useMemo(() => {
    return reports
      .map((report) => {
        const position = getPosition(report);

        if (!position) return null;

        return {
          ...report,
          mapId: String(getReportId(report) || ""),
          caseLabel: getCaseLabel(report),
          type: report.incidentType || report.type || "Other",
          locationText: getLocationText(report.location),
          priorityLabel: getPriority(report),
          statusLabel: report.status || "Under Review",
          position,
        };
      })
      .filter(Boolean);
  }, [reports]);

  const filteredIncidents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return allIncidents.filter((incident) => {
      const matchesSearch =
        !query ||
        [
          incident.title,
          incident.description,
          incident.type,
          incident.locationText,
          incident.caseLabel,
          incident.statusLabel,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesPriority =
        priorityFilter === "All" ||
        incident.priorityLabel === priorityFilter;

      const matchesStatus =
        statusFilter === "All" ||
        incident.statusLabel === statusFilter;

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [allIncidents, searchTerm, priorityFilter, statusFilter]);

  const summary = useMemo(() => {
    const highPriority = reports.filter(
      (report) => getPriority(report) === "High"
    ).length;

    const activeCases = reports.filter(
      (report) => report.status !== "Resolved"
    ).length;

    const uniqueLocations = new Set(
      reports
        .map((report) => getLocationText(report.location))
        .filter((location) => location !== "Location not provided")
    );

    const countPriority = (priority) =>
      allIncidents.filter(
        (incident) => incident.priorityLabel === priority
      ).length;

    return {
      total: reports.length,
      highPriority,
      activeCases,
      areasAffected: uniqueLocations.size,
      highMapped: countPriority("High"),
      mediumMapped: countPriority("Medium"),
      lowMapped: countPriority("Low"),
    };
  }, [reports, allIncidents]);

  return (
    <div className="incident-map-page">
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

          <Link to="/official/assigned-cases">
            ◉ <span>Assigned Cases</span>
          </Link>

          <Link to="/official/cases">
            ◈ <span>Case Management</span>
          </Link>

          <Link to="/official/map" className="active">
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

      {/* Main content */}
      <main className="incident-map-main">
        <header className="incident-map-header">
          <div>
            <p className="page-label">GEOGRAPHICAL OVERVIEW</p>
            <h1>Incident Map</h1>
            <p className="page-description">
              View reported incidents and their locations across the service
              area.
            </p>
          </div>

          <div className="map-status">
            <span></span>
            {loading ? "Updating incidents..." : "Live Incident Overview"}
          </div>
        </header>

        {/* Summary cards use backend data */}
        <section className="map-summary">
          <div className="map-stat">
            <span>Total Incidents</span>
            <strong>{summary.total}</strong>
            <small>Reported cases</small>
          </div>

          <div className="map-stat">
            <span>High Priority</span>
            <strong>{summary.highPriority}</strong>
            <small>Require attention</small>
          </div>

          <div className="map-stat">
            <span>Active Cases</span>
            <strong>{summary.activeCases}</strong>
            <small>Not yet resolved</small>
          </div>

          <div className="map-stat">
            <span>Areas Affected</span>
            <strong>{summary.areasAffected}</strong>
            <small>Distinct reported locations</small>
          </div>
        </section>

        {error && (
          <div className="incident-map-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={fetchReports}>
              Try Again
            </button>
          </div>
        )}

        {/* Map card */}
        <section className="incident-map-card">
          <div className="incident-map-card-header">
            <div>
              <h2>Reported Incidents</h2>
              <p>
                Select a marker to view incident details.
                {lastUpdated && (
                  <span>
                    {" "}
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>

            
          </div>

          {/* Map filters */}
          <div className="incident-map-filters">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search title, type, case or location..."
              aria-label="Search incidents"
            />

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              aria-label="Filter by priority"
            >
              <option value="All">All priorities</option>
              <option value="High">High priority</option>
              <option value="Medium">Medium priority</option>
              <option value="Low">Low priority</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="All">All statuses</option>
              {VALID_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={fetchReports}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="official-map-wrapper">
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={12}
              scrollWheelZoom
              className="official-leaflet-map"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitMapToIncidents incidents={filteredIncidents} />

              {filteredIncidents.map((incident) => (
                <div key={incident.mapId}>
                  <Marker position={incident.position}>
                    <Popup>
                      <div className="map-popup">
                        <strong>{incident.title || "Untitled Incident"}</strong>

                        <p>
                          <b>Case:</b> {incident.caseLabel}
                        </p>

                        <p>
                          <b>Type:</b> {incident.type}
                        </p>

                        <p>
                          <b>Location:</b> {incident.locationText}
                        </p>

                        <p>
                          <b>Priority:</b> {incident.priorityLabel}
                        </p>

                        <p>
                          <b>Status:</b> {incident.statusLabel}
                        </p>

                        {incident.description && (
                          <p>
                            <b>Description:</b> {incident.description}
                          </p>
                        )}

                        <Link
                          to={`/official/reports/${incident.mapId}`}
                        >
                          View Case
                        </Link>
                      </div>
                    </Popup>
                  </Marker>

                  <Circle
                    center={incident.position}
                    radius={
                      incident.priorityLabel === "High"
                        ? 450
                        : incident.priorityLabel === "Medium"
                        ? 300
                        : 200
                    }
                    pathOptions={{
                      color: getPriorityColor(incident.priorityLabel),
                      fillColor: getPriorityColor(incident.priorityLabel),
                      fillOpacity: 0.08,
                      weight: 1,
                    }}
                  />
                </div>
              ))}
            </MapContainer>
            <div className="map-legend">
              <div>
                <span className="legend-dot high"></span>
                High
              </div>
              <div>
                <span className="legend-dot medium"></span>
                Medium
              </div>
              <div>
                <span className="legend-dot low"></span>
                Low
              </div>
            </div>
          </div>

          {!loading && !error && filteredIncidents.length === 0 && (
            <p className="incident-map-empty">
              {allIncidents.length === 0
                ? "No reports with valid coordinates are available to display on the map."
                : "No incidents match your current search and filters."}
            </p>
          )}

          {!loading && allIncidents.length < reports.length && (
            <p className="incident-map-hint">
              {reports.length - allIncidents.length} report(s) are missing
              valid coordinates and cannot be displayed on the map.
            </p>
          )}
        </section>

        {/* Overview */}
        <section className="incident-overview">
          <div className="overview-header">
            <div>
              <h2>Mapped Incident Overview</h2>
              <p>Priority totals for incidents currently displayed on the map.</p>
            </div>
          </div>

          <div className="overview-grid">
            <div className="overview-item">
              <span className="overview-icon high">!</span>
              <div>
                <strong>High Priority</strong>
                <small>{summary.highMapped} mapped incidents</small>
              </div>
            </div>

            <div className="overview-item">
              <span className="overview-icon medium">▲</span>
              <div>
                <strong>Medium Priority</strong>
                <small>{summary.mediumMapped} mapped incidents</small>
              </div>
            </div>

            <div className="overview-item">
              <span className="overview-icon low">✓</span>
              <div>
                <strong>Low Priority</strong>
                <small>{summary.lowMapped} mapped incidents</small>
              </div>
            </div>
          </div>
        </section>

        {/* Responsible handling */}
        <section className="incident-note">
          <div className="incident-note-icon">✓</div>
          <div>
            <h3>Responsible Incident Mapping</h3>
            <p>
              Map information supports authorized officials in reviewing
              reported incidents. Verify locations and classifications before
              taking case-related action.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default IncidentMap;