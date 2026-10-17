import { Link } from "react-router-dom";
import "./Home.css";

function Home() {
  return (
    <div className="home">

      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          Civic<span>Shield</span>
        </div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <a href="#safety">Safety</a>
        </div>

        <Link to="/login" className="nav-button">
        Login/Sign Up
        </Link>

      </nav>

      {/* Hero Section */}
      <section className="hero" id="home">
        <div className="hero-content">
          <p className="hero-tag">PUBLIC SAFETY • SMART REPORTING</p>

          <h1>
            Safer Communities.
            <br />
            <span>Smarter Reporting.</span>
          </h1>

          <p className="hero-description">
            Report crimes, suspicious activities and public safety
            hazards with descriptions, evidence and location data.
            Our AI-assisted platform helps authorized officials
            manage reports efficiently.
          </p>

          <div className="hero-buttons">
            <Link to="/login" className="primary-button">
            Report an Incident
            </Link>

            <button className="secondary-button">
            Explore Safety Map
            </button>
          </div>
        </div>

        <div className="hero-card">
          <div className="status-dot"></div>
          <p>Community Safety</p>
          <h2>Stay Alert. Stay Safe.</h2>

          <div className="mini-stats">
            <div>
              <strong>24/7</strong>
              <span>Reporting</span>
            </div>

            <div>
              <strong>AI</strong>
              <span>Assistance</span>
            </div>

            <div>
              <strong>Live</strong>
              <span>Tracking</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-section" id="how-it-works">
        <p className="section-tag">HOW IT WORKS</p>

        <h2>From Report to Resolution</h2>

        <div className="steps">
          <div className="step">
            <div className="step-number">01</div>
            <h3>Report</h3>
            <p>
              Citizens submit incidents with descriptions,
              photographs, videos and location information.
            </p>
          </div>

          <div className="step">
            <div className="step-number">02</div>
            <h3>AI Assistance</h3>
            <p>
              AI assists with incident classification,
              urgency assessment and duplicate detection.
            </p>
          </div>

          <div className="step">
            <div className="step-number">03</div>
            <h3>Official Review</h3>
            <p>
              Authorized officials review, assign and
              investigate reported incidents.
            </p>
          </div>

          <div className="step">
            <div className="step-number">04</div>
            <h3>Track</h3>
            <p>
              Citizens can follow the status and progress
              of their submitted reports.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">
        <p className="section-tag">KEY FEATURES</p>

        <h2>Built for Safer Communities</h2>

        <div className="feature-grid">
          <div className="feature-card">
            <span>📍</span>
            <h3>Location-Based Reporting</h3>
            <p>
              Submit incidents with accurate location information.
            </p>
          </div>

          <div className="feature-card">
            <span>🤖</span>
            <h3>AI-Assisted Analysis</h3>
            <p>
              Assist officials with classification and report analysis.
            </p>
          </div>

          <div className="feature-card">
            <span>🚨</span>
            <h3>Urgency Assessment</h3>
            <p>
              Help identify reports that may require faster attention.
            </p>
          </div>

          <div className="feature-card">
            <span>🔎</span>
            <h3>Duplicate Detection</h3>
            <p>
              Identify potentially repeated reports of the same incident.
            </p>
          </div>

          <div className="feature-card">
            <span>📊</span>
            <h3>Case Tracking</h3>
            <p>
              Keep citizens informed about the status of their reports.
            </p>
          </div>

          <div className="feature-card">
            <span>🔔</span>
            <h3>Safety Alerts</h3>
            <p>
              Provide relevant public safety information to users.
            </p>
          </div>
        </div>
      </section>

      {/* AI Responsibility */}
      <section className="trust-section" id="safety">
        <div>
          <p className="section-tag">RESPONSIBLE AI</p>

          <h2>
            AI assists.
            <br />
            <span>Officials decide.</span>
          </h2>
        </div>

        <p>
          AI is used to assist authorized officials by analyzing
          submitted reports, identifying patterns and helping
          prioritize cases. It does not independently determine
          guilt or label individuals as criminals.
        </p>
      </section>

      {/* Footer */}
      <footer>
        <div className="logo">
          Civic<span>Shield</span>
        </div>

        <p>
          Technology for safer and more connected communities.
        </p>
      </footer>

    </div>
  );
}

export default Home;