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

  // Resets seed swipes/matches/messages before every mode flip, in either direction, so demo mode is always entered fresh rather than resuming a prior session - swallows a failed reset the same way swipe() in Discover.jsx swallows its own background POST, since blocking the toggle on a network hiccup would be worse than an occasional stale reset.
  function toggleMode() {
    const next = mode === "demo" ? "production" : "demo";
    setResetting(true);
    return requestDemoReset()
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
    return requestDemoReset().finally(() => setResetting(false));
  }

  return (
    <DiscoverModeContext.Provider value={{ mode, toggleMode, resetDemoMode, resetting }}>
      {children}
    </DiscoverModeContext.Provider>
  );
}

export function useDiscoverMode() {
  return useContext(DiscoverModeContext);
}
