import { createContext, useContext, useState } from "react";

const DiscoverModeContext = createContext(null);

const DISCOVER_MODE_KEY = "debrief:discoverMode";

function requestDemoReset() {
  return fetch("/api/discover/reset-demo", { method: "POST" }).then((response) => {
    if (!response.ok) throw new Error("Failed to reset demo mode.");
    return response.json();
  });
}

export function DiscoverModeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem(DISCOVER_MODE_KEY) || "production");
  const [resetting, setResetting] = useState(false);
  // Bumped after every successful reset-demo call, whether or not `mode` itself changed - Discover.jsx's profile-loading effect depends on this too, so a manual "Reset Demo Mode" click (same mode, no mode change) still triggers a reload, not just a toggle.
  const [resetVersion, setResetVersion] = useState(0);

  // Resets seed swipes/matches/messages before every mode flip, in either direction, so demo mode is always entered fresh rather than resuming a prior session - swallows a failed reset the same way swipe() in Discover.jsx swallows its own background POST, since blocking the toggle on a network hiccup would be worse than an occasional stale reset.
  function toggleMode() {
    const next = mode === "demo" ? "production" : "demo";
    setResetting(true);
    return requestDemoReset()
      .then(() => setResetVersion((prev) => prev + 1))
      .catch(() => {})
      .finally(() => {
        localStorage.setItem(DISCOVER_MODE_KEY, next);
        setMode(next);
        setResetting(false);
      });
  }

  // Manual "start over without leaving demo mode" - unlike toggleMode, lets a failed request reject so the caller can surface an error.
  function resetDemoMode() {
    setResetting(true);
    return requestDemoReset()
      .then((result) => {
        setResetVersion((prev) => prev + 1);
        return result;
      })
      .finally(() => setResetting(false));
  }

  return (
    <DiscoverModeContext.Provider value={{ mode, toggleMode, resetDemoMode, resetting, resetVersion }}>
      {children}
    </DiscoverModeContext.Provider>
  );
}

export function useDiscoverMode() {
  return useContext(DiscoverModeContext);
}
