import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { animate } from "animejs";
import Footer from "../../components/Footer.jsx";
import ScrollProgress from "../../components/ScrollProgress.jsx";
import PinnedScrollStage from "./PinnedScrollStage.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import sections from "./sections/index.js";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loginError, setLoginError] = useState("");
  const overlayRef = useRef(null);
  const dropdownRef = useRef(null);

  function openLogin() {
    setIsLoginOpen(true);
  }

  function closeLogin() {
    setIsLoginOpen(false);
  }

  // showModal (not isLoginOpen) drives the `hidden` class below, so the
  // close animation gets to play before display:none actually removes it.
  useEffect(() => {
    if (isLoginOpen) {
      setShowModal(true);
      animate(overlayRef.current, { opacity: [0, 1], duration: 250, ease: "outQuad" });
      animate(dropdownRef.current, {
        opacity: [0, 1],
        scale: [0.94, 1],
        duration: 300,
        ease: "outQuad",
      });
    } else if (showModal) {
      animate(overlayRef.current, { opacity: [1, 0], duration: 200, ease: "inQuad" });
      animate(dropdownRef.current, {
        opacity: [1, 0],
        scale: [1, 0.94],
        duration: 200,
        ease: "inQuad",
      }).then(() => setShowModal(false));
    }
  }, [isLoginOpen]);

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
      if (response.status === 401) {
        setLoginError("Incorrect email or password.");
      } else {
        const data = await response.json().catch(() => null);
        console.error("Login request failed", data?.error);
        setLoginError("Something went wrong. Please try again.");
      }
      return;
    }

    await login();
    navigate("/discover");
  }

  return (
    <div id="home">
      <ScrollProgress />
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
        ref={overlayRef}
        className={`login-overlay${showModal ? "" : " hidden"}`}
        id="loginOverlay"
        type="button"
        aria-label="Close login form"
        onClick={closeLogin}
      ></button>

      <div
        ref={dropdownRef}
        className={`login-dropdown${showModal ? "" : " hidden"}`}
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

      <PinnedScrollStage sections={sections} />

      <Footer />
    </div>
  );
}
