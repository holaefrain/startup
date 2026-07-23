import { useEffect, useState } from "react";
import AppNav from "../../components/AppNav.jsx";
import Footer from "../../components/Footer.jsx";
import placeholderPhoto from "../../assets/img/1920x1080.png";

const DISCOVER_MODE_KEY = "debrief:discoverMode";

export default function Discover() {
  const [mode, setMode] = useState(() => localStorage.getItem(DISCOVER_MODE_KEY) || "production");
  const [profiles, setProfiles] = useState(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [matchNotice, setMatchNotice] = useState(null);
  const [resetting, setResetting] = useState(false);

  // Resets everything first - the profile list, swipe index, and any stale error/match state from a previous load would otherwise carry over into a completely different data set - then fetches. Shared by the mode-change effect below and the "Reset Demo Mode" button.
  function loadProfiles(forMode) {
    setProfiles(null);
    setIndex(0);
    setError("");
    setMatchNotice(null);
    fetch(`/api/discover?mode=${forMode}`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load profiles.");
        return response.json();
      })
      .then(setProfiles)
      .catch(() => setError("Couldn't load profiles. Please try again."));
  }

  useEffect(() => {
    loadProfiles(mode);
  }, [mode]);

  function toggleMode() {
    const next = mode === "demo" ? "production" : "demo";
    localStorage.setItem(DISCOVER_MODE_KEY, next);
    setMode(next);
  }

  // Clears this account's swipes/matches/messages with seed users specifically (never touches real relationships), then reloads the demo deck from a clean slate.
  function resetDemoMode() {
    setResetting(true);
    fetch("/api/discover/reset-demo", { method: "POST" })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to reset demo mode.");
        loadProfiles(mode);
      })
      .catch(() => setError("Couldn't reset demo mode. Please try again."))
      .finally(() => setResetting(false));
  }

  const profile = profiles?.[index];

  // Advances immediately regardless of the swipe request's latency - the swipe write doesn't need to block the UI. Captures `profile` before advancing since `index` (and therefore `profile`) changes right away.
  function swipe(action) {
    const swipedProfile = profile;
    setIndex((prev) => prev + 1);
    if (!swipedProfile) return;

    fetch("/api/swipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: swipedProfile.id, action }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.matched) setMatchNotice(`You and ${swipedProfile.first_name} matched!`);
      })
      .catch(() => {});
  }

  return (
    <div id="discover">
      <header>
        <h1>Discover</h1>
        <p>Swipe through profiles. Tap the heart or X to like or pass.</p>
        <button type="button" className="mode-toggle" onClick={toggleMode}>
          {mode === "demo" ? "Viewing demo profiles - switch to real" : "Viewing real profiles - switch to demo"}
        </button>
        {mode === "demo" && (
          <button type="button" className="reset-demo" onClick={resetDemoMode} disabled={resetting}>
            {resetting ? "Resetting..." : "Reset Demo Mode"}
          </button>
        )}
        <AppNav />
      </header>

      <main>
        {matchNotice && (
          <div className="match-banner" role="status">
            <p>{matchNotice}</p>
            <button type="button" onClick={() => setMatchNotice(null)}>
              Dismiss
            </button>
          </div>
        )}

        <section className="swipe-area" aria-live="polite">
          {error && <p role="alert">{error}</p>}

          {!error && !profiles && <p>Loading profiles...</p>}

          {!error && profiles && !profile && <p>No more profiles right now - check back later.</p>}

          {profile && (
            <article className="profile-card" data-profile-id={profile.id}>
              <div className="profile-photos">
                <img
                  className="photo-placeholder"
                  src={placeholderPhoto}
                  alt={`${profile.first_name} ${profile.last_name}`}
                />
              </div>

              <div className="profile-meta">
                <h2 className="profile-name">
                  {profile.first_name} {profile.last_name}
                  {profile.age != null ? `, ${profile.age}` : ""}
                </h2>
                {profile.hometown && <p className="profile-location">{profile.hometown}</p>}
                {profile.job_title && <p className="profile-bio">{profile.job_title}</p>}
              </div>
            </article>
          )}
        </section>

        <section className="venue-placeholder">
          <h2>Date ideas nearby</h2>
          <p>Third-party API placeholder: Google Maps venue suggestions will appear here.</p>
        </section>

        <section className="notifications" aria-live="polite">
          <h2>Notifications</h2>
          <p>WebSocket placeholder: waiting for new matches, chats, and date proposals...</p>
        </section>

        <section className="controls">
          <button id="dislike-btn" aria-label="Dislike" type="button" disabled={!profile} onClick={() => swipe("pass")}>
            Nope
          </button>
          <button id="like-btn" aria-label="Like" type="button" disabled={!profile} onClick={() => swipe("like")}>
            Like
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
