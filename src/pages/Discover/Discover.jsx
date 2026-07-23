import { useEffect, useState } from "react";
import AppNav from "../../components/AppNav.jsx";
import Footer from "../../components/Footer.jsx";
import { optionLabel } from "../../components/OptionSelect.jsx";
import { PROFILE_FIELD_GROUPS } from "../../constants/profileFields.js";
import { useDiscoverMode } from "../../context/DiscoverModeContext.jsx";
import placeholderPhoto from "../../assets/img/1920x1080.png";

// Already shown in the card's name/age header, so skipped when rendering the rest of the profile fields below.
const CARD_HEADER_FIELDS = new Set(["first_name", "last_name", "age"]);

export default function Discover() {
  const { mode, resetVersion } = useDiscoverMode();
  const [profiles, setProfiles] = useState(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [matchNotice, setMatchNotice] = useState(null);

  useEffect(() => {
    // Resets everything first - the profile list, swipe index, and any stale error/match state from a previous load would otherwise carry over into a completely different data set - then fetches. Re-runs on `mode` (AppNav's real/demo switch) and on `resetVersion` (bumped by a reset-demo call even when `mode` itself doesn't change, e.g. AppNav's "Reset Demo Mode" link while staying in demo).
    setProfiles(null);
    setIndex(0);
    setError("");
    setMatchNotice(null);
    fetch(`/api/discover?mode=${mode}`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load profiles.");
        return response.json();
      })
      .then(setProfiles)
      .catch(() => setError("Couldn't load profiles. Please try again."));
  }, [mode, resetVersion]);

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

                {PROFILE_FIELD_GROUPS.map((group) => {
                  const detailFields = group.fields.filter(
                    (field) => !CARD_HEADER_FIELDS.has(field.key) && profile[field.key]
                  );
                  if (detailFields.length === 0) return null;
                  return (
                    <div key={group.title} className="profile-field-group">
                      <h3>{group.title}</h3>
                      <ul>
                        {detailFields.map((field) => (
                          <li key={field.key} className="profile-field-row">
                            <span className="profile-field-label">{field.label}</span>
                            <span className="profile-field-value">{optionLabel(field.key, profile[field.key])}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </article>
          )}
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
