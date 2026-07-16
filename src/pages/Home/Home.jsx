import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppNav from "../../components/AppNav.jsx";
import Footer from "../../components/Footer.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import sections from "./sections/index.js";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState("");

  function openLogin() {
    setIsLoginOpen(true);
  }

  function closeLogin() {
    setIsLoginOpen(false);
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setLoginError("");

    const { email, password } = event.target;
    const response = await fetch("/api/auth", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value, password: password.value }),
    });

    if (!response.ok) {
      setLoginError("Incorrect email or password.");
      return;
    }

    const { email: loggedInEmail } = await response.json();
    login(loggedInEmail);
    navigate("/discover");
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
          <p className={`login-message${loginError ? "" : " hidden"}`} id="loginMessage" role="alert">
            {loginError}
          </p>
        </form>
      </div>

      {sections.map((Section, index) => (
        <Section key={index} />
      ))}

      <Footer />
    </div>
  );
}
