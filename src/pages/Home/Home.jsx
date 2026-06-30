import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div id="home">
      {/* Navigation */}
      <nav id="main-nav">
        <div className="nav-content">
          <h2 className="nav-bar-quote">TIRED OF DATING? LET'S AIR IT OUT</h2>
          <button className="nav-cta" id="login-button" type="button">
            LOGIN / SIGN UP
          </button>
        </div>
      </nav>

      {/* Login Overlay */}
      <div className="login-overlay hidden" id="loginOverlay"></div>

      <div
        className="login-dropdown hidden"
        id="loginDropdown"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loginTitle"
      >
        <button className="close-btn" id="loginClose" aria-label="Close login form">
          ×
        </button>
        <h2 id="loginTitle">Login to Debrief</h2>
        <form id="loginForm">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" name="email" required placeholder="you@example.com" />

          <label htmlFor="password">Password</label>
          <input id="password" type="password" name="password" required placeholder="Enter your password" />

          <button type="submit" className="submit-btn">
            Log in
          </button>
          <p className="signup-line">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
          <p className="login-message hidden" id="loginMessage"></p>
        </form>
      </div>

      {/* Hero Section */}
      <section id="hero-section">
        <div className="hero-content">
          {/* image content */}

          {/* title */}
          <div className="hero-title">
            <h1>DEBRIEF</h1>
          </div>
          {/* subtitle */}
          <div className="hero-subtitle">
            <h2>A DATING APP MEANT FOR DATING</h2>
          </div>
        </div>
      </section>

      {/* Elevator Pitch */}
      <section id="elevator-pitch">
        <div className="elevator-pitch-content">
          <h2>Why Debrief?</h2>
          <p>
            Debrief is different from other dating apps because we focus on creating a space for honest
            conversation and personal growth. Instead of just matching people based on superficial criteria,
            we encourage users to share their real experiences and learn from each other.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works">
        <div className="how-it-works-content">
          <h2>How It Works</h2>
          <p>
            Debrief makes it easy to connect with others who share similar dating experiences. Our platform
            allows you to share your stories, ask questions, and get advice from a community of like-minded individuals.
          </p>
        </div>
      </section>
    </div>
  );
}
