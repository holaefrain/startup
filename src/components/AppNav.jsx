import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { animate, stagger } from "animejs";
import { useAuth } from "../context/AuthContext.jsx";
import { useDiscoverMode } from "../context/DiscoverModeContext.jsx";

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export default function AppNav() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mode, toggleMode, resetDemoMode, resetting } = useDiscoverMode();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef(null);
  const backdropRef = useRef(null);
  const mounted = useRef(false);

  // Skips the first run (page load, always closed) so the drawer doesn't play an opening slide before the hamburger's ever been touched.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const reduceMotion = window.matchMedia(REDUCE_MOTION_QUERY).matches;
    const duration = reduceMotion ? 0 : open ? 420 : 260;

    animate(drawerRef.current, { translateX: open ? "0%" : "-100%", duration, ease: "outExpo" });
    animate(backdropRef.current, { opacity: open ? 1 : 0, duration, ease: "outExpo" });

    if (open) {
      animate(".app-nav-links li", {
        opacity: [0, 1],
        translateY: [12, 0],
        duration: reduceMotion ? 0 : 420,
        delay: reduceMotion ? 0 : stagger(60, { start: 120 }),
        ease: "outExpo",
      });
    }
  }, [open]);

  function close() {
    setOpen(false);
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    logout();
    close();
    navigate("/");
  }

  function handleResetDemo() {
    resetDemoMode().catch(() => {});
  }

  return (
    <>
      <button
        type="button"
        className="app-nav-toggle"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span aria-hidden="true">{open ? "✕" : "☰"}</span>
      </button>

      <div
        ref={backdropRef}
        className={`app-nav-backdrop${open ? " app-nav-backdrop-open" : ""}`}
        onClick={close}
      />

      <nav ref={drawerRef} className={`app-nav${open ? " app-nav-open" : ""}`} aria-label="App navigation">
        <ul className="app-nav-links">
          <li>
            <NavLink to="/discover" onClick={close}>
              Discover
            </NavLink>
          </li>
          <li>
            <NavLink to="/chat" onClick={close}>
              Chat
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile" onClick={close}>
              Profile
            </NavLink>
          </li>
        </ul>

        <div className="app-nav-mode">
          <button
            type="button"
            className="app-nav-mode-toggle"
            role="switch"
            aria-checked={mode === "demo"}
            aria-label="Toggle real or demo profiles"
            onClick={toggleMode}
            disabled={resetting}
          >
            <span>Real</span>
            <span className="app-nav-mode-track" aria-hidden="true">
              <span className="app-nav-mode-knob" />
            </span>
            <span>Demo</span>
          </button>
          {mode === "demo" && (
            <button type="button" className="app-nav-reset-demo" onClick={handleResetDemo} disabled={resetting}>
              {resetting ? "Resetting..." : "Reset Demo Mode"}
            </button>
          )}
        </div>

        {user && (
          <div className="app-nav-bottom">
            <NavLink to="/settings" className="app-nav-settings" onClick={close}>
              <span aria-hidden="true">{"⚙"}</span> Settings
            </NavLink>
            <button type="button" className="app-nav-logout" onClick={handleLogout}>
              Log Out
            </button>
            <a className="app-nav-github" href="https://github.com/holaefrain/startup" target="_blank" rel="noreferrer">
              View on GitHub
            </a>
          </div>
        )}
      </nav>
    </>
  );
}
