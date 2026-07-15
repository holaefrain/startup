import { useEffect, useState } from "react";
import AppNav from "../../components/AppNav.jsx";
import Footer from "../../components/Footer.jsx";
import placeholderPhoto from "../../assets/img/1920x1080.png";

export default function Discover() {
  const [profiles, setProfiles] = useState(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/discover")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load profiles.");
        return response.json();
      })
      .then(setProfiles)
      .catch(() => setError("Couldn't load profiles. Please try again."));
  }, []);

  const advance = () => setIndex((prev) => prev + 1);
  const profile = profiles?.[index];

  return (
    <div id="discover">
      <header>
        <h1>Discover</h1>
        <p>Swipe through profiles. Tap the heart or X to like or pass.</p>
        <AppNav />
      </header>

      <main>
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
          <button id="dislike-btn" aria-label="Dislike" type="button" disabled={!profile} onClick={advance}>
            Nope
          </button>
          <button id="like-btn" aria-label="Like" type="button" disabled={!profile} onClick={advance}>
            Like
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
