import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { animate } from "animejs";
import AppNav from "../../components/AppNav.jsx";
import ChevronIcon from "../../components/ChevronIcon.jsx";
import { optionLabel } from "../../components/OptionSelect.jsx";
import { AgeIcon, HeightIcon, LocationIcon } from "../../components/ProfileIcons.jsx";
import { ALL_PROFILE_FIELDS } from "../../constants/profileFields.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useDiscoverMode } from "../../context/DiscoverModeContext.jsx";
import placeholderPhoto from "../../assets/img/1920x1080.png";
import "./Discover.css";

// Already shown elsewhere on the card - name (h2), age/height/location (icon row), gender/pronouns/sexuality (subtitle line) - so skipped when rendering the field table below. Must stay in step with Chat's PROFILE_HEADER_FIELDS, which splits the same profile the same way.
const CARD_HEADER_FIELDS = new Set(["first_name", "last_name", "age", "height", "location", "gender", "pronouns", "sexuality"]);
const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const PEEK_PHOTO_SCALE = 0.82; // how much smaller a non-active carousel slide renders

function MatchHeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <path d="M12 21s-7.5-4.87-10.2-9.36C.1 8.9 1.4 5 5.1 4.2c2-.44 3.9.4 5 2 .1.15.3.25.5.25s.4-.1.5-.25c1.1-1.6 3-2.44 5-2 3.7.8 5 4.7 3.3 7.44C19.5 16.13 12 21 12 21Z" />
    </svg>
  );
}

export default function Discover() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode, resetVersion } = useDiscoverMode();
  const [profiles, setProfiles] = useState(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  // Holds { matchId, profile } for the just-matched person, or null - `profile` is the swiped profile object swipe() already has in scope (photoKeys, first_name, id and all), not a separate fetch.
  const [matchNotice, setMatchNotice] = useState(null);
  const fieldCardRef = useRef(null);
  // Which chevrons are still worth pressing. Both true when the card doesn't overflow at all, which disables the pair rather than leaving two controls that do nothing.
  const [fieldEdges, setFieldEdges] = useState({ atStart: true, atEnd: true });

  function syncFieldEdges() {
    const card = fieldCardRef.current;
    if (!card) return;
    const furthest = card.scrollHeight - card.clientHeight;
    setFieldEdges({ atStart: card.scrollTop <= 1, atEnd: card.scrollTop >= furthest - 1 });
  }

  // One fact per press, measured off the real distance between two rows rather than a guessed pixel step, so the card never comes to rest mid-row. Falls back to a single row's height when only one is rendered (nothing to scroll then anyway).
  function scrollFields(direction) {
    const card = fieldCardRef.current;
    if (!card) return;
    const rows = card.querySelectorAll(".profile-fact-row");
    const pitch = rows.length > 1 ? rows[1].offsetTop - rows[0].offsetTop : (rows[0]?.offsetHeight ?? 0);
    const reduceMotion = window.matchMedia(REDUCE_MOTION_QUERY).matches;
    card.scrollBy({ top: direction * pitch, behavior: reduceMotion ? "auto" : "smooth" });
  }

  useEffect(() => {
    // Resets everything first - the profile list, swipe index, and any stale error/match state from a previous load would otherwise carry over into a completely different data set - then fetches. Re-runs on `mode` (AppNav's real/demo switch) and on `resetVersion` (bumped by a reset-demo call even when `mode` itself doesn't change, e.g. AppNav's "Reset Demo Mode" link while staying in demo).
    setProfiles(null);
    setIndex(0);
    setError("");
    setMatchNotice(null);
    // HTML Deilverable: DB data placeholder
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

  // Gender/pronouns/sexuality read as one italicized line rather than table rows - only the ones the profile actually has are joined, so a profile missing one doesn't leave a dangling separator. Sexuality fills the mock's third slot: the mock labels it "Interested in", but interested_in is a matching preference the server deliberately withholds (see projectVisibleFields in userSchema.js), so it can never reach this component.
  const subtitleParts = profile
    ? [
        profile.gender && optionLabel("gender", profile.gender),
        profile.pronouns && optionLabel("pronouns", profile.pronouns),
        profile.sexuality && optionLabel("sexuality", profile.sexuality),
      ].filter(Boolean)
    : [];

  // Everything not already in the header block, and only what this person actually filled in - a blank value never becomes an empty row.
  const visibleFields = profile
    ? ALL_PROFILE_FIELDS.filter((field) => !CARD_HEADER_FIELDS.has(field.key) && profile[field.key])
    : [];

  const iconFacts = profile
    ? [
        profile.age != null && { key: "age", icon: <AgeIcon />, value: profile.age },
        profile.height && { key: "height", icon: <HeightIcon />, value: optionLabel("height", profile.height) },
        profile.location && { key: "location", icon: <LocationIcon />, value: profile.location },
      ].filter(Boolean)
    : [];

  // The fact card's scroll container is the same DOM node across swipes (React just updates its contents), so without this a scroll position left on one profile would carry into the next. Re-reads the edges afterwards because the next profile may have fewer facts, and a card that no longer overflows must disable both chevrons.
  useEffect(() => {
    if (fieldCardRef.current) fieldCardRef.current.scrollTop = 0;
    syncFieldEdges();
  }, [profile?.id, visibleFields.length]);

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
        if (data?.matched) setMatchNotice({ matchId: data.matchId, profile: swipedProfile });
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

  function renderMatchOverlay() {
    if (!matchNotice) return null;
    const { matchId, profile: matchedProfile } = matchNotice;
    const yourPhoto = user?.photoKeys?.length ? `/api/photos/${user.id}/0` : placeholderPhoto;
    const theirPhoto = matchedProfile.photoKeys?.length ? `/api/photos/${matchedProfile.id}/0` : placeholderPhoto;

    return (
      <div className="match-overlay" role="dialog" aria-modal="true" aria-labelledby="matchTitle">
        <button className="match-close" type="button" aria-label="Close and keep swiping" onClick={() => setMatchNotice(null)}>
          ×
        </button>

        <div className="match-photos">
          <img className="match-photo match-photo-you" src={yourPhoto} alt="Your profile" />
          <span className="match-heart">
            <MatchHeartIcon />
          </span>
          <img className="match-photo match-photo-them" src={theirPhoto} alt={matchedProfile.first_name} />
        </div>

        <h2 id="matchTitle" className="match-title">
          It's a match!
        </h2>
        <p className="match-subtitle">You and {matchedProfile.first_name} liked each other.</p>

        <div className="match-actions">
          <button
            type="button"
            className="match-chat-btn"
            onClick={() => {
              setMatchNotice(null);
              navigate("/chat", { state: { matchId } });
            }}
          >
            Send a message
          </button>
          <button type="button" className="match-keep-swiping-btn" onClick={() => setMatchNotice(null)}>
            Keep swiping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="discover">
      <AppNav />

      <main>
        {renderMatchOverlay()}

        <section className="swipe-area" aria-live="polite">
          {error && <p role="alert">{error}</p>}

          {!error && !profiles && <p>Loading profiles...</p>}

          {!error && profiles && !profile && <p>No more profiles right now - check back later.</p>}

          {/* HTML Deilverable: Proper HTML element usage */}
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

                {/* HTML Deilverable: Proper HTML element usage - label/value pairs are a definition list, not a table. Each value is a pill, so a fact reads as the same kind of object as Chat's "See Profile" control. */}
                {visibleFields.length > 0 && (
                  <div className="profile-fact-card" ref={fieldCardRef} onScroll={syncFieldEdges}>
                    <dl className="profile-fact-list">
                      {visibleFields.map((field) => (
                        <div className="profile-fact-row" key={field.key}>
                          <dt className="profile-fact-label">{field.label}</dt>
                          <dd className="profile-fact-value">{optionLabel(field.key, profile[field.key])}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>

              {/* The rail sits between the facts and the photos as its own column, the same place Chat puts it - not nested beside the table, which is where it lived when the card was a two-column flex row. */}
              <div className="scroll-rail">
                <button
                  type="button"
                  className="scroll-chev"
                  aria-label="Scroll facts up"
                  disabled={fieldEdges.atStart}
                  onClick={() => scrollFields(-1)}
                >
                  <ChevronIcon direction="up" />
                </button>
                <button
                  type="button"
                  className="scroll-chev"
                  aria-label="Scroll facts down"
                  disabled={fieldEdges.atEnd}
                  onClick={() => scrollFields(1)}
                >
                  <ChevronIcon direction="down" />
                </button>
              </div>

              <div className="profile-photos">
                {photoCount > 0 ? (
                  <div className="photo-carousel">
                    <div className="photo-carousel-viewport">
                      <div className="photo-carousel-clip">
                        <div className="photo-carousel-track" ref={photoTrackRef}>
                          {photoKeys.map((_, photoIdx) => (
                            <div className="photo-carousel-slide" key={photoIdx}>
                              {/* HTML Deilverable: Images */}
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
