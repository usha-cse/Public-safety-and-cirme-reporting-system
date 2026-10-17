import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { clearAuthSession } from "../utils/auth";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef(null);

  const [role, setRole] = useState("citizen");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset the login form whenever the login page is entered.
  useEffect(() => {
    clearAuthSession();

    setEmail("");
    setPassword("");
    setError("");
    setLoading(false);

    if (formRef.current) {
      formRef.current.reset();
    }
  }, [location.key]);

  // Clear credentials whenever the account type changes.
  const handleRoleChange = (event) => {
    const selectedRole = event.target.value;

    setRole(selectedRole);
    setEmail("");
    setPassword("");
    setError("");

    if (formRef.current) {
      formRef.current.reset();
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const apiUrl =
        import.meta.env.VITE_API_URL || "http://localhost:5000";

      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed. Check your credentials."
        );
      }

      if (!data.token) {
        throw new Error(
          "The backend did not return a login token. Check authController.js."
        );
      }

      // Verify the actual role returned by the backend.
      const actualRole = String(data.user?.role || "").toLowerCase();

      if (actualRole !== role) {
        throw new Error(
          `This account is not registered as ${
            role === "citizen" ? "a Citizen" : "an Official"
          }. Please select the correct account type.`
        );
      }

      // Save the authenticated session only after role validation.
      localStorage.setItem("token", data.token);

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // Clear the form before navigation.
      setEmail("");
      setPassword("");
      setError("");

      if (formRef.current) {
        formRef.current.reset();
      }

      // Navigate according to the verified backend role.
      if (actualRole === "citizen") {
        navigate("/citizen/dashboard");
      } else if (actualRole === "official") {
        navigate("/official/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.message ||
          "Cannot connect to the backend. Check that it is running on port 5000."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Section */}
      <div className="login-brand">
        <Link to="/" className="login-logo">
          Civic<span>Shield</span>
        </Link>

        <div className="brand-content">
          <p className="login-tag">
            PUBLIC SAFETY • SMART REPORTING
          </p>

          <h1>
            Safer communities
            <br />
            start with <span>you.</span>
          </h1>

          <p>
            Report incidents, stay informed and help build
            safer communities through smarter public safety
            technology.
          </p>
        </div>

        <div className="brand-footer">
          <span>●</span> Your safety matters
        </div>
      </div>

      {/* Right Section */}
      <div className="login-section">
        <div className="login-box">
          <Link to="/" className="mobile-logo">
            Civic<span>Shield</span>
          </Link>

          <p className="section-label">WELCOME BACK</p>

          <h2>Sign in to CivicShield</h2>

          <p className="login-subtitle">
            Enter your account details to continue.
          </p>

          <form
            ref={formRef}
            onSubmit={handleLogin}
            className="login-form"
            autoComplete="off"
          >
            {/* Account Type */}
            <div className="form-group">
              <label htmlFor="login-role">Account type</label>

              <div className="select-wrapper">
                <select
                  id="login-role"
                  name="accountType"
                  className="login-select"
                  value={role}
                  onChange={handleRoleChange}
                >
                  <option value="citizen">Citizen</option>
                  <option value="official">Official</option>
                </select>

                <span className="select-arrow" aria-hidden="true">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="login-email">Email address</label>

              <input
                id="login-email"
                name="loginEmail"
                type="email"
                autoComplete="off"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="login-password">Password</label>

              <input
                id="login-password"
                name="loginPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {/* Error */}
            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            {/* Sign In */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <div className="login-divider">
            <span>OR</span>
          </div>

          <p className="register-text">
            Don't have an account?
            <Link to="/register"> Create one</Link>
          </p>

          <Link to="/" className="back-home">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;