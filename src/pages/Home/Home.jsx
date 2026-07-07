import { useState } from "react";
import { Link } from "react-router-dom";
import AppNav from "../../components/AppNav.jsx";
import Footer from "../../components/Footer.jsx";
import homepage1 from "../../assets/img/homepage1.jpg";
import homepage2 from "../../assets/img/homepage2.jpg";
import homepage3 from "../../assets/img/homepage3.jpeg";
import "./Home.css";

export default function Home() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  function openLogin() {
    setIsLoginOpen(true);
  }

  function closeLogin() {
    setIsLoginOpen(false);
  }

  function handleLoginSubmit(event) {
    event.preventDefault();
  }

  return (
    <div id="home">
      <AppNav />
      {/* Navigation */}
      <nav id="main-nav">
        <div className="nav-content">
          <h2 className="nav-bar-quote">TIRED OF DATING? LET'S AIR IT OUT</h2>
          <button
            className="nav-cta"
            id="login-button"
            type="button"
            aria-controls="loginDropdown"
            aria-expanded={isLoginOpen}
            onClick={openLogin}
          >
            LOGIN/SIGN UP
          </button>
        </div>
      </nav>

      {/* Login Overlay */}
      <button
        className={`login-overlay${isLoginOpen ? "" : " hidden"}`}
        id="loginOverlay"
        type="button"
        aria-label="Close login form"
        onClick={closeLogin}
      ></button>

      <div
        className={`login-dropdown${isLoginOpen ? "" : " hidden"}`}
        id="loginDropdown"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loginTitle"
      >
        <button className="close-btn" id="loginClose" type="button" aria-label="Close login form" onClick={closeLogin}>
          ×
        </button>
        <h2 id="loginTitle">Login to Debrief</h2>
        <form id="loginForm" onSubmit={handleLoginSubmit}>
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
          <div className="hero-photo-grid" aria-label="Homepage preview images">
            <figure className="hero-photo">
              <img src={homepage1} alt="Homepage preview 1" />
            </figure>
            <figure className="hero-photo">
              <img src={homepage2} alt="Homepage preview 2" />
            </figure>
            <figure className="hero-photo">
              <img src={homepage3} alt="Homepage preview 3" />
            </figure>
          </div>

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

      <Footer />
    </div>
  );
}
