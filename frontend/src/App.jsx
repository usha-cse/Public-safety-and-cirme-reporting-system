import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/register/Register";
import CitizenDashboard from "./pages/citizen/CitizenDashboard";
import ReportIncident from "./pages/citizen/ReportIncident";
import MyReports from "./pages/citizen/MyReports";
import ReportDetails from "./pages/citizen/ReportDetails";
import SafetyMap from "./pages/citizen/SafetyMap";
import SafetyAlerts from "./pages/citizen/SafetyAlerts";
import Profile from "./pages/citizen/Profile";
import OfficialDashboard from "./pages/official/OfficialDashboard";
import Reports from "./pages/official/Reports";
import OfficialReportDetails from "./pages/official/OfficialReportDetails";
import CaseManagement from "./pages/official/CaseManagement";
import Analysis from "./pages/official/Analysis";
import AssignedCases from "./pages/official/AssignedCases";
import IncidentMap from "./pages/official/IncidentMap";
import Alerts from "./pages/official/Alerts";
import OffProfile from "./pages/official/Profile";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        {/* Citizen Routes (Protected) */}
        <Route
          path="/citizen/dashboard"
          element={
            <ProtectedRoute>
              <CitizenDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/citizen/report"
          element={
            <ProtectedRoute>
              <ReportIncident />
            </ProtectedRoute>
          }
        />

        <Route
          path="/citizen/reports"
          element={
            <ProtectedRoute>
              <MyReports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/citizen/reports/:reportId"
          element={
            <ProtectedRoute>
              <ReportDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/citizen/map"
          element={
            <ProtectedRoute>
              <SafetyMap />
            </ProtectedRoute>
          }
        />

        <Route 
          path="/citizen/alerts" 
          element={
            <ProtectedRoute>
              <SafetyAlerts />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/citizen/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />

        {/* Official Routes (Protected) */}
        <Route
          path="/official/dashboard"
          element={
            <ProtectedRoute>
              <OfficialDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/official/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/official/reports/:reportId"
          element={
            <ProtectedRoute>
              <OfficialReportDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/official/cases"
          element={
            <ProtectedRoute>
              <CaseManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/official/analytics"
          element={
            <ProtectedRoute>
              <Analysis />
            </ProtectedRoute>
          }
        />

        <Route
          path="/official/assigned-cases"
          element={
            <ProtectedRoute>
              <AssignedCases />
            </ProtectedRoute>
          }
        />

        <Route
          path="/official/map"
          element={
            <ProtectedRoute>
              <IncidentMap />
            </ProtectedRoute>
          }
        />

        <Route
          path="/official/alerts"
          element={
            <ProtectedRoute>
              <Alerts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/official/profile"
          element={
            <ProtectedRoute>
              <OffProfile />
            </ProtectedRoute>
          }
        />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;