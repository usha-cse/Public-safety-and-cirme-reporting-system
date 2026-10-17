export const AUTH_KEYS = ["token", "authToken", "user"];

/**
 * Retrieves the stored authentication token from localStorage.
 */
export function getAuthToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || null;
  } catch {
    return null;
  }
}

/**
 * Returns true if an active authentication token exists.
 */
export function isAuthenticated() {
  return Boolean(getAuthToken());
}

/**
 * Retrieves the stored user object from localStorage.
 */
export function getAuthUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clears all authentication-related keys from localStorage and sessionStorage.
 * Preserves all unrelated application data.
 */
export function clearAuthSession() {
  AUTH_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore storage access issues
    }
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore storage access issues
    }
  });
}

/**
 * Logs out the user by clearing session and redirecting to the login page.
 */
export function handleLogout(navigate) {
  clearAuthSession();
  if (typeof navigate === "function") {
    navigate("/login", { replace: true, state: { loggedOut: true } });
  } else {
    window.location.href = "/login";
  }
}
