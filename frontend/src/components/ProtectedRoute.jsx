import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../utils/auth";

/**
 * Route guard that redirects unauthenticated users to /login.
 */
function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
