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
import "./SafetyMap.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const chennaiCenter = [12.9352, 80.228];

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Changes the map view when a user selects My Location.
function MapViewController({ target }) {
  const map = useMap();

  useEffect(() => {
    if (target && Number.isFinite(target[0]) && Number.isFinite(target[1])) {
      map.flyTo(target, 14, { duration: 1 });
    }
  }, [target, map]);

  return null;
}

function formatDate(date) {
  if (!date) return "Date unavailable";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Date unavailable";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Group reported incidents into nearby activity areas.
function buildActivityAreas(incidents) {
  const groups = [];
  const GROUP_RADIUS_METERS = 1000;

  incidents.forEach((incident) => {
    const lat = Number(incident.location?.latitude);
    const lng = Number(incident.location?.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    let nearestGroup = null;
    let nearestDistance = Infinity;

    groups.forEach((group) => {
      const distance = L.latLng(lat, lng).distanceTo(
        L.latLng(group.center[0], group.center[1])
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestGroup = group;
      }
    });

    if (nearestGroup && nearestDistance <= GROUP_RADIUS_METERS) {
      nearestGroup.incidents.push(incident);

      // Recalculate the center from all incidents in this group.
      const count = nearestGroup.incidents.length;
      nearestGroup.center = [
        nearestGroup.incidents.reduce(
          (sum, item) => sum + Number(item.location.latitude),
          0
        ) / count,
        nearestGroup.incidents.reduce(
          (sum, item) => sum + Number(item.location.longitude),
          0
        ) / count,
      ];
    } else {
      groups.push({
        center: [lat, lng],
        incidents: [incident],
      });
    }
  });

  return groups.filter((group) => group.incidents.length >= 2);
}

function SafetyMap() {
  const [incidents, setIncidents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapTarget, setMapTarget] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken");

      const response = await fetch(`${API_URL}/api/reports/map`, {
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || `Could not load map reports (${response.status}).`
        );
      }

      if (!Array.isArray(data.incidents)) {
        throw new Error("The server response did not contain incident data.");
      }

      // Ignore records without valid coordinates.
      const validIncidents = data.incidents.filter((incident) => {
        const lat = Number(incident.location?.latitude);
        const lng = Number(incident.location?.longitude);

        return (
          incident.location?.latitude != null &&
          incident.location?.longitude != null &&
          incident.location.latitude !== "" &&
          incident.location.longitude !== "" &&
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          lat >= -90 &&
          lat <= 90 &&
          lng >= -180 &&
          lng <= 180
        );
      });

      setIncidents(validIncidents);
    } catch (err) {
      console.error("Safety map loading error:", err);
      setError(err.message || "Unable to load map incidents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return incidents;

    return incidents.filter((incident) => {
      const searchableText = [
        incident.title,
        incident.incidentType,
        incident.location?.address,
        incident.priority,
        incident.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [incidents, search]);

  const activityAreas = useMemo(
  () => buildActivityAreas(filteredIncidents),
  [filteredIncidents]
);

  const handleMyLocation = () => {
    setLocationMessage("");

    if (!navigator.geolocation) {
      setLocationMessage("Your browser does not support location access.");
      return;
    }

    setLocationMessage("Finding your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [
          position.coords.latitude,
          position.coords.longitude,
        ];

        setMapTarget(coords);
        setLocationMessage("Showing your current location.");
      },
      (err) => {
        console.warn("Location access error:", err);
        setLocationMessage(
          "Location unavailable. Please allow location access in your browser."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <div className="safety-map-page">
      <aside className="map-sidebar">
        <Link to="/" className="map-logo">
          Civic<span>Shield</span>
        </Link>

        <nav className="map-nav">
          <Link to="/citizen/dashboard" className="map-nav-link">
            <span>⌂</span>
            Dashboard
          </Link>

          <Link to="/citizen/report" className="map-nav-link">
            <span>＋</span>
            Report Incident
          </Link>

          <Link to="/citizen/reports" className="map-nav-link">
            <span>▤</span>
            My Reports
          </Link>

          <Link to="/citizen/map" className="map-nav-link active">
            <span>⌖</span>
            Safety Map
          </Link>

          <Link to="/citizen/alerts" className="map-nav-link">
            <span>♢</span>
            Safety Alerts
          </Link>
        </nav>

        <div className="map-sidebar-bottom">
          <Link to="/citizen/profile" className="map-nav-link">
            <span>◯</span>
            Profile
          </Link>

          <Link
            to="/login"
            onClick={clearAuthSession}
            className="map-nav-link"
          >
            <span>↪</span>
            Logout
          </Link>
        </div>
      </aside>

      <main className="map-main">
        <header className="map-header">
          <div>
            <p className="map-label">COMMUNITY SAFETY</p>
            <h1>Safety Map</h1>
            <p>
              Explore reported public-safety incidents in your area.
            </p>
          </div>

          <Link to="/citizen/report" className="map-report-button">
            + Report Incident
          </Link>
        </header>

        <section className="map-wrapper">
          <div className="map-overlay">
            <div className="map-search">
              <span>⌕</span>
              <input
                type="search"
                placeholder="Search reports or locations..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search incidents on the map"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="button"
              className="location-control"
              onClick={handleMyLocation}
            >
              ⌖ My Location
            </button>
          </div>

          <MapContainer
            center={chennaiCenter}
            zoom={12}
            scrollWheelZoom={true}
            className="leaflet-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapViewController target={mapTarget} />

            {filteredIncidents.map((incident) => {
              const position = [
                Number(incident.location.latitude),
                Number(incident.location.longitude),
              ];

              return (
                <Marker
                  key={incident._id}
                  position={position}
                  icon={defaultIcon}
                >
                  <Popup>
                    <div className="map-popup">
                      <strong>
                        {incident.title ||
                          incident.incidentType ||
                          "Reported Incident"}
                      </strong>

                      <p>
                        Type: {incident.incidentType || "Not specified"}
                      </p>

                      <p>
                        📍 {incident.location?.address || "Location unavailable"}
                      </p>

                      <p>
                        Priority: {incident.priority || "Low"}
                      </p>

                      <p>
                        Status: {incident.status || "Under Review"}
                      </p>

                      <p>Reported: {formatDate(incident.createdAt)}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {activityAreas.map((area, index) => {
  const count = area.incidents.length;

  const color =
    count >= 5 ? "#d92d20" :
    count >= 3 ? "#f79009" :
    "#fdb022";

  return (
    <Circle
      key={`activity-area-${index}`}
      center={area.center}
      radius={Math.min(400 + count * 150, 1200)}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.15,
        weight: 2,
      }}
    >
      <Popup>
        <strong>Reported Activity Area</strong>
        <p>{count} reported incidents nearby.</p>
        <p>
          This area reflects submitted reports, not confirmed crime risk.
        </p>
      </Popup>
    </Circle>
  );
})}
            
          </MapContainer>

          <div className="map-legend">
            <strong>Map Legend</strong>

            <div>
              <span className="legend-dot reported"></span>
              Reported Incident
            </div>

            <div>
              <span className="legend-dot" style={{ background: "#fdb022" }}></span>
              2 Reports Nearby
            </div>

            <div>
              <span className="legend-dot" style={{ background: "#f79009" }}></span>
              3–4 Reports Nearby
            </div>

            <div>
              <span className="legend-dot" style={{ background: "#d92d20" }}></span>
              5+ Reports Nearby
            </div>
          </div>
        </section>

        {locationMessage && (
          <p role="status" className="map-feedback">
            {locationMessage}
          </p>
        )}

        <section className="map-info-grid">
          <div className="map-info-card">
            <p className="map-card-label">AREA OVERVIEW</p>
            <h2>Reported Activity</h2>

            <div className="activity-number">
              {loading ? "…" : filteredIncidents.length}
            </div>

            <p>
              {search
                ? "Incidents matching your search with saved map coordinates."
                : "Reported incidents with saved coordinates available on this map."}
            </p>

            {error && (
              <p role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={fetchIncidents}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh Map"}
            </button>

            {!loading && incidents.length === 0 && !error && (
              <p>
                No reports with map coordinates were found. Reports need
                latitude and longitude to appear as markers.
              </p>
            )}
          </div>

          <div className="map-info-card">
            <p className="map-card-label">SAFETY REMINDER</p>
            <h2>Stay aware of your surroundings.</h2>

            <p>
              Map information is intended to provide general awareness.
              Always contact appropriate emergency services when immediate
              assistance is required.
            </p>

            <Link to="/citizen/report">
              Report a concern →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default SafetyMap;