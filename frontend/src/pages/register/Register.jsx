
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";

const API_URL = "http://localhost:5000/api";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    accountType: "citizen",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          role: form.accountType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      alert("Account created successfully! Please sign in.");
      navigate("/login");
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the backend. Make sure your backend server is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <section className="register-brand">
        <div className="register-logo">
          Civic<span>Shield</span>
        </div>

        <div className="register-brand-content">
          <p className="register-eyebrow">
            PUBLIC SAFETY • SMART REPORTING
          </p>

          <h1>
            Build safer
            <br />
            communities
            <br />
            <span>together.</span>
          </h1>

          <p className="register-brand-description">
            Create your CivicShield account to report incidents,
            track complaints and stay informed about public safety.
          </p>
        </div>

        <div className="register-brand-footer">
          <span></span>
          Your safety matters
        </div>
      </section>

      <section className="register-form-section">
        <div className="register-form-container">
          <p className="register-label">GET STARTED</p>

          <h2>Create your account</h2>

          <p className="register-subtitle">
            Enter your details to create a CivicShield account.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="register-field">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Create a password"
                value={form.password}
                onChange={handleChange}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChange={handleChange}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="accountType">Account Type</label>
              <select
                id="accountType"
                name="accountType"
                value={form.accountType}
                onChange={handleChange}
              >
                <option value="citizen">Citizen</option>
                <option value="official">Authorized Official</option>
              </select>
            </div>

            <label className="register-terms">
              <input type="checkbox" required />
              <span>
                I agree to the CivicShield terms and privacy policy.
              </span>
            </label>

            {error && (
              <p role="alert" style={{ color: "crimson" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="register-button"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
              <span>→</span>
            </button>
          </form>

          <div className="register-login">
            Already have an account?
            <Link to="/login">Sign in</Link>
          </div>

          <Link to="/" className="register-back">
            ← Back to home
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Register;
