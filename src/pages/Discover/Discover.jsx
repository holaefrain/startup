import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import AppNav from "../../components/AppNav.jsx";
import { optionLabel } from "../../components/OptionSelect.jsx";
import { ALL_PROFILE_FIELDS } from "../../constants/profileFields.js";
import { useDiscoverMode } from "../../context/DiscoverModeContext.jsx";
import placeholderPhoto from "../../assets/img/1920x1080.png";

// Already shown elsewhere on the card - name (h2), age/height/location (icon row), gender/pronouns (subtitle line) - so skipped when rendering the field table below.
const CARD_HEADER_FIELDS = new Set(["first_name", "last_name", "age", "height", "location", "gender", "pronouns"]);
const FIELD_SCROLL_STEP = 120; // px per chevron click, roughly two table rows
const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const PEEK_PHOTO_SCALE = 0.82; // how much smaller a non-active carousel slide renders

function AgeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 3 L19 20 L5 20 Z" strokeLinejoin="round" />
      <circle cx="12" cy="3" r="1.4" fill="currentColor" stroke="none" />
      <path d="M5 20 H19" />
    </svg>
  );
}

function HeightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="9" y="2" width="6" height="20" rx="1" />
      <path d="M9 6 H12 M9 10 H13 M9 14 H12 M9 18 H13" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 21s7-7.58 7-12a7 7 0 1 0-14 0c0 4.42 7 12 7 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="2.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Discover() {
  const { mode, resetVersion } = useDiscoverMode();
  const [profiles, setProfiles] = useState(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [matchNotice, setMatchNotice] = useState(null);
  const fieldTableRef = useRef(null);

  function scrollFields(direction) {
    fieldTableRef.current?.scrollBy({ top: direction * FIELD_SCROLL_STEP, behavior: "smooth" });
  }

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
  const photoKeys = profile?.photoKeys ?? [];
  const photoCount = photoKeys.length;
  const [photoIndex, setPhotoIndex] = useState(0);
  const photoTrackRef = useRef(null);

  // A new profile always starts on its first photo, regardless of where the previous profile's carousel was left.
  useEffect(() => {
    setPhotoIndex(0);
  }, [profile?.id]);

  function goToPhoto(nextIndex) {
    setPhotoIndex(Math.max(0, Math.min(photoCount - 1, nextIndex)));
  }

  // Slides the track so the active photo is centered in its viewport, revealing equal peeks of its neighbors on either side - measured in pixels via the actual rendered slide/viewport rather than assumed percentages, so it stays correct at any card width. Scales each slide individually alongside the slide (not just the track as a whole) so the incoming center photo grows to full size while the outgoing one shrinks back down to peek size.
  useEffect(() => {
    const track = photoTrackRef.current;
    const slides = track ? Array.from(track.children) : [];
    const activeSlide = slides[photoIndex];
    if (!track || !activeSlide) return;

    const viewport = track.parentElement;
    const targetX = viewport.clientWidth / 2 - (activeSlide.offsetLeft + activeSlide.offsetWidth / 2);
    const reduceMotion = window.matchMedia(REDUCE_MOTION_QUERY).matches;
    const duration = reduceMotion ? 0 : 420;

    animate(track, { translateX: targetX, duration, ease: "outExpo" });
    slides.forEach((slide, slideIdx) => {
      animate(slide, { scale: slideIdx === photoIndex ? 1 : PEEK_PHOTO_SCALE, duration, ease: "outExpo" });
    });
  }, [photoIndex, photoCount]);

  // Gender/pronouns read as one italicized line rather than table rows - only the ones the profile actually has are joined, so a profile missing one doesn't leave a dangling separator.
  const subtitleParts = profile
    ? [profile.gender && optionLabel("gender", profile.gender), profile.pronouns && optionLabel("pronouns", profile.pronouns)].filter(
        Boolean
      )
    : [];

  const iconFacts = profile
    ? [
        profile.age != null && { key: "age", icon: <AgeIcon />, value: profile.age },
        profile.height && { key: "height", icon: <HeightIcon />, value: optionLabel("height", profile.height) },
        profile.location && { key: "location", icon: <LocationIcon />, value: profile.location },
      ].filter(Boolean)
    : [];

  // The field table's scroll container is the same DOM node across swipes (React just updates its contents), so without this a scroll position left on one profile would carry into the next.
  useEffect(() => {
    if (fieldTableRef.current) fieldTableRef.current.scrollTop = 0;
  }, [profile?.id]);

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

  // Shared by the real carousel and the no-photos fallback below so both anchor the buttons to the same .photo-carousel-viewport (the photo itself), not whichever wrapper happens to be tallest.
  function renderSwipeButtons() {
    return (
      <>
        <button
          id="like-btn"
          type="button"
          className="swipe-btn swipe-btn-like"
          aria-label="Like"
          disabled={!profile}
          onClick={() => swipe("like")}
        >
          ♥
        </button>
        <button
          id="dislike-btn"
          type="button"
          className="swipe-btn swipe-btn-dislike"
          aria-label="Dislike"
          disabled={!profile}
          onClick={() => swipe("pass")}
        >
          ✕
        </button>
      </>
    );
  }

  return (
    <div id="discover">
      <AppNav />

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
              <div className="profile-meta">
                <h2 className="profile-name">
                  {profile.first_name} {profile.last_name?.charAt(0)}
                  {profile.last_name ? "." : ""}
                </h2>

                {subtitleParts.length > 0 && <p className="profile-subtitle">{subtitleParts.join(" | ")}</p>}

                {iconFacts.length > 0 && (
                  <ul className="profile-icon-facts">
                    {iconFacts.map((fact) => (
                      <li key={fact.key}>
                        {fact.icon}
                        <span>{fact.value}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="profile-field-panel">
                  <div className="profile-field-table-wrap" ref={fieldTableRef}>
                    <table className="profile-field-table">
                      <tbody>
                        {ALL_PROFILE_FIELDS.filter(
                          (field) => !CARD_HEADER_FIELDS.has(field.key) && profile[field.key]
                        ).map((field) => (
                          <tr key={field.key}>
                            <th scope="row">{field.label}</th>
                            <td>{optionLabel(field.key, profile[field.key])}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="profile-field-scroll">
                    <button type="button" aria-label="Scroll fields up" onClick={() => scrollFields(-1)}>
                      ⌃
                    </button>
                    <button type="button" aria-label="Scroll fields down" onClick={() => scrollFields(1)}>
                      ⌄
                    </button>
                  </div>
                </div>
              </div>

              <div className="profile-photos">
                {photoCount > 0 ? (
                  <div className="photo-carousel">
                    <div className="photo-carousel-viewport">
                      <div className="photo-carousel-clip">
                        <div className="photo-carousel-track" ref={photoTrackRef}>
                          {photoKeys.map((_, photoIdx) => (
                            <div className="photo-carousel-slide" key={photoIdx}>
                              <img
                                src={`/api/photos/${profile.id}/${photoIdx}`}
                                alt={`${profile.first_name} ${profile.last_name}, photo ${photoIdx + 1} of ${photoCount}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {photoIndex > 0 && (
                        <button
                          type="button"
                          className="photo-carousel-nav photo-carousel-prev"
                          aria-label="Previous photo"
                          onClick={() => goToPhoto(photoIndex - 1)}
                        >
                          ‹
                        </button>
                      )}
                      {photoIndex < photoCount - 1 && (
                        <button
                          type="button"
                          className="photo-carousel-nav photo-carousel-next"
                          aria-label="Next photo"
                          onClick={() => goToPhoto(photoIndex + 1)}
                        >
                          ›
                        </button>
                      )}

                      {renderSwipeButtons()}
                    </div>

                    {photoCount > 1 && (
                      <div className="photo-carousel-dots">
                        {photoKeys.map((_, photoIdx) => (
                          <button
                            key={photoIdx}
                            type="button"
                            className={`photo-carousel-dot${photoIdx === photoIndex ? " photo-carousel-dot-active" : ""}`}
                            aria-label={`Go to photo ${photoIdx + 1}`}
                            aria-current={photoIdx === photoIndex}
                            onClick={() => goToPhoto(photoIdx)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="photo-carousel-viewport">
                    <img
                      className="photo-placeholder"
                      src={placeholderPhoto}
                      alt={`${profile.first_name} ${profile.last_name}`}
                    />
                    {renderSwipeButtons()}
                  </div>
                )}
              </div>
            </article>
          )}
        </section>
      </main>
    </div>
  );
}
