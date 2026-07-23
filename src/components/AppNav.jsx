import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useDiscoverMode } from "../context/DiscoverModeContext.jsx";

export default function AppNav() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mode, toggleMode, resetDemoMode, resetting } = useDiscoverMode();
  const [open, setOpen] = useState(false);

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

      {open && <div className="app-nav-backdrop" onClick={close} />}

      <nav className={`app-nav${open ? " app-nav-open" : ""}`} aria-label="App navigation">
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
          </div>
        )}
      </nav>
    </>
  );
}
