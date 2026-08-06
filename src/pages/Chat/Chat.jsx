import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import AppNav from "../../components/AppNav.jsx";
import ChevronIcon from "../../components/ChevronIcon.jsx";
import { optionLabel } from "../../components/OptionSelect.jsx";
import { AgeIcon, HeightIcon, LocationIcon } from "../../components/ProfileIcons.jsx";
import ReportDialog from "../../components/ReportDialog.jsx";
import { ALL_PROFILE_FIELDS } from "../../constants/profileFields.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useChatSocket } from "../../hooks/useChatSocket.js";
import placeholderPhoto from "../../assets/img/1080x1920.png";
import "./Chat.css";

const LIST_SCROLL_STEP = 150; // px per chevron click, roughly one and a half rows
const FIELD_SCROLL_STEP = 100; // px per chevron click in the profile's field table, roughly two rows

// Already shown in the profile view's own header rows - the subtitle line and the icon facts - so skipped when rendering the field table below. Mirrors Discover's card.
const PROFILE_HEADER_FIELDS = new Set(["first_name", "last_name", "age", "height", "location", "gender", "pronouns", "sexuality"]);

// Matches the breakpoint in Chat.css where the two columns collapse into one. Below it the list *is* the page and the panel takes over on tap, so nothing may be auto-selected - that would both hide the list behind a conversation nobody asked for and mark it read unseen.
// Must be the exact complement of Chat.css's `max-width: 60rem` stacked block, hence 60.001 rather than 60 - at exactly 60rem a `min-width: 60rem` query still matches while the CSS has already stacked, and auto-select would open a panel covering the list.
const TWO_COLUMN_QUERY = "(min-width: 60.001rem)";

// The panel is one surface with three modes. The header offers the two you're *not* in, which is why this is a fixed order filtered by the current mode rather than three hand-written pairs - it reproduces all three of the mock's header states on its own.
const PANEL_MODES = [
  { id: "profile", label: "See Profile" },
  { id: "chat", label: "See Chat" },
  { id: "plan", label: "Plan a date" },
];

// "Efrain C." - the mock shows a first name and a last initial, same shortening Discover's card uses.
function displayName(person) {
  const initial = person.last_name ? ` ${person.last_name.charAt(0)}.` : "";
  return `${person.first_name}${initial}`;
}

function photoUrl(person) {
  return person.photoKeys?.length ? `/api/photos/${person.id}/0` : placeholderPhoto;
}

// The list preview: the last thing said, prefixed when it was me. A match nobody has written in yet invites the first message rather than showing an empty row.
function previewText(match, currentUserId) {
  if (!match.lastMessage) return "Say hi!";
  const prefix = match.lastMessage.senderId === currentUserId ? "You: " : "";
  return `${prefix}${match.lastMessage.text}`;
}

// An open path, deliberately: it's filled white but only its two drawn segments are stroked, so the bubble's own bottom border stays unbroken and the tail reads as hanging off it. A closed triangle would stroke a line across the bubble's edge.
function BubbleTail() {
  return (
    <svg className="chat-tail" viewBox="0 0 34 26" aria-hidden="true">
      <path d="M1.5 0 L1.5 24 L32 0" fill="var(--color-surface)" />
      <path d="M1.5 0 L1.5 24 L32 0" fill="none" stroke="var(--color-text)" strokeWidth="3" strokeLinejoin="miter" />
    </svg>
  );
}

// The next seven days as weekday labels, which is the granularity the mock's chip shows - a plan here is a human label, not a calendar entry.
function upcomingDays() {
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: "long" });
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : formatter.format(date);
  });
}

const TIME_OPTIONS = Array.from({ length: 16 }, (_, index) => {
  const hour = index + 8;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
});

// The mock breaks the address after the street line, which is the first comma.
function addressLines(address) {
  const split = address.indexOf(",");
  return split === -1 ? [address] : [address.slice(0, split + 1), address.slice(split + 1).trim()];
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 2 3 6.6 7 .8-5.2 4.9 1.4 7L12 17.9 5.8 21.3l1.4-7L2 9.4l7-.8z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m4 13 5.5 5.5L20 6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 5 5" />
    </svg>
  );
}

// Shared by the planner list and (from bullet 4.7) the sent proposal in the thread, so a plan reads the same wherever it appears.
function VenueCard({ venue }) {
  const [street, region] = addressLines(venue.address ?? "");
  return (
    <>
      <img
        className="chat-venue-face"
        src={venue.photoName ? `/api/venues/photo?name=${encodeURIComponent(venue.photoName)}` : placeholderPhoto}
        alt=""
        aria-hidden="true"
      />
      <span className="chat-venue-lines">
        <span className="chat-venue-top">
          {venue.name}
          {venue.rating != null && (
            <span className="chat-venue-rating">
              <StarIcon />
              {venue.rating.toFixed(1)}
            </span>
          )}
        </span>
        <span className="chat-venue-mid">
          {venue.kind && <span className="chat-venue-kind">{venue.kind}</span>}
          {venue.hours && (
            <span className="chat-venue-hours">
              {venue.openNow != null && `${venue.openNow ? "Open" : "Closed"} • `}
              {venue.hours}
            </span>
          )}
        </span>
        <span className="chat-venue-low">
          <span className="chat-venue-addr">
            {street}
            {region && (
              <>
                <br />
                {region}
              </>
            )}
          </span>
          {venue.price && <span className="chat-venue-price">{venue.price}</span>}
        </span>
      </span>
    </>
  );
}

// The match's profile inside the conversation panel: the same information Discover's card shows, laid out for a narrower surface. Reads entirely from the visibility-filtered otherUser the match list already returned, so it needs no extra request.
function MatchProfile({ person, photoIndex, onPhoto, fieldTableRef }) {
  const photoCount = person.photoKeys?.length ?? 0;

  // Only the parts this person actually filled in, so a missing one never leaves a dangling separator. Same three parts Discover's subtitleParts builds - these two views claim to show the same information, so they pick the same fields.
  const subtitle = [
    person.gender && optionLabel("gender", person.gender),
    person.pronouns && optionLabel("pronouns", person.pronouns),
    person.sexuality && optionLabel("sexuality", person.sexuality),
  ]
    .filter(Boolean)
    .join(" | ");

  const facts = [
    person.age != null && { key: "age", icon: <AgeIcon />, value: person.age },
    person.height && { key: "height", icon: <HeightIcon />, value: optionLabel("height", person.height) },
    person.location && { key: "location", icon: <LocationIcon />, value: person.location },
  ].filter(Boolean);

  const fields = ALL_PROFILE_FIELDS.filter((field) => !PROFILE_HEADER_FIELDS.has(field.key) && person[field.key]);

  return (
    <div className="chat-profile">
      <div className="chat-profile-meta">
        {subtitle && <p className="chat-profile-subtitle">{subtitle}</p>}

        {facts.length > 0 && (
          <ul className="chat-profile-facts">
            {facts.map((fact) => (
              <li key={fact.key}>
                {fact.icon}
                <span>{fact.value}</span>
              </li>
            ))}
          </ul>
        )}

        {fields.length > 0 && (
          <div className="chat-field-panel">
            <div className="chat-field-wrap" ref={fieldTableRef}>
              <table className="chat-field-table">
                <tbody>
                  {fields.map((field) => (
                    <tr key={field.key}>
                      <th scope="row">{field.label}</th>
                      <td>{optionLabel(field.key, person[field.key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="scroll-rail">
              <button
                type="button"
                className="scroll-chev"
                aria-label="Scroll details up"
                onClick={() => fieldTableRef.current?.scrollBy({ top: -FIELD_SCROLL_STEP, behavior: "smooth" })}
              >
                <ChevronIcon direction="up" />
              </button>
              <button
                type="button"
                className="scroll-chev"
                aria-label="Scroll details down"
                onClick={() => fieldTableRef.current?.scrollBy({ top: FIELD_SCROLL_STEP, behavior: "smooth" })}
              >
                <ChevronIcon direction="down" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="chat-carousel">
        <div className="chat-carousel-viewport">
          {/* Each slide is half the viewport, so centring slide i is a translate of 25% - i*50% - no measurement, and the peek either side falls out of it. */}
          <div className="chat-carousel-track" style={{ transform: `translateX(calc(25% - ${photoIndex * 50}%))` }}>
            {photoCount > 0 ? (
              person.photoKeys.map((_, index) => (
                <div className="chat-slide" key={index} data-peek={index === photoIndex ? undefined : ""}>
                  <img src={`/api/photos/${person.id}/${index}`} alt={`${person.first_name}, photo ${index + 1} of ${photoCount}`} />
                </div>
              ))
            ) : (
              <div className="chat-slide">
                <img src={placeholderPhoto} alt={person.first_name} />
              </div>
            )}
          </div>

          {photoIndex > 0 && (
            <button type="button" className="chat-carousel-nav chat-carousel-prev" aria-label="Previous photo" onClick={() => onPhoto(photoIndex - 1)}>
              &lsaquo;
            </button>
          )}
          {photoIndex < photoCount - 1 && (
            <button type="button" className="chat-carousel-nav chat-carousel-next" aria-label="Next photo" onClick={() => onPhoto(photoIndex + 1)}>
              &rsaquo;
            </button>
          )}
        </div>

        {photoCount > 1 && (
          <div className="chat-dots">
            {person.photoKeys.map((_, index) => (
              <button
                key={index}
                type="button"
                className="chat-dot"
                aria-label={`Go to photo ${index + 1}`}
                aria-current={index === photoIndex}
                onClick={() => onPhoto(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 2 2 10.4l7.3 2.6 9.3-7.4-7.1 8.4 2.7 7.6z" />
    </svg>
  );
}

export default function Chat() {
  const { user } = useAuth();
  // Set by Discover's match overlay: navigate("/chat", { state: { matchId } }).
  const requestedMatchId = useLocation().state?.matchId;
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [reporting, setReporting] = useState(false);
  // Only meaningful below the two-column breakpoint, where list and panel share the screen and this decides which one you're looking at.
  const [panelOpen, setPanelOpen] = useState(false);
  const [messagesByMatch, setMessagesByMatch] = useState({});
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [panelMode, setPanelMode] = useState("chat");
  // What was unread in each match at the moment it was opened. Opening marks a thread read, so without capturing it here the mock's badge beside the newest incoming bubble would vanish the instant you could see it.
  const [unreadAtOpen, setUnreadAtOpen] = useState({});
  const [scope, setScope] = useState("them");
  // Keyed by scope, and by match for "them" since each match resolves to a different person's coordinates - reusing one flat list would show the wrong city after switching conversations.
  const [venuesByKey, setVenuesByKey] = useState({});
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [venuesError, setVenuesError] = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState(null);
  const [when, setWhen] = useState({ day: upcomingDays()[0], time: "8 PM" });
  const [photoIndex, setPhotoIndex] = useState(0);
  const listRef = useRef(null);
  const threadRef = useRef(null);
  const fieldTableRef = useRef(null);

  // Loads the match list once on mount.
  // Service Deilverable: Frontend calls service endpoints
  useEffect(() => {
    fetch("/api/matches")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load matches.");
        return response.json();
      })
      .then(setMatches)
      .catch(() => setError("Couldn't load your chats. Please try again."));
  }, []);

  const selectedMatch = matches?.find((match) => match.id === selectedId) ?? null;
  const selectedMessages = selectedId ? messagesByMatch[selectedId] : null;

  // Keeps the newest message in view as the thread grows. Scrolls the container rather than an end-sentinel element, which in this grid would add an empty row's worth of gap below the last bubble.
  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [selectedMessages]);

  function scrollList(direction) {
    listRef.current?.scrollBy({ top: direction * LIST_SCROLL_STEP, behavior: "smooth" });
  }

  function scrollThread(direction) {
    threadRef.current?.scrollBy({ top: direction * LIST_SCROLL_STEP, behavior: "smooth" });
  }

  // The carousel and the field table's scroll position are the same DOM nodes across matches, so without resetting them one person's third photo and scrolled table would carry into the next.
  useEffect(() => {
    setPhotoIndex(0);
    if (fieldTableRef.current) fieldTableRef.current.scrollTop = 0;
  }, [selectedId]);

  // The newest message from the other person, badged with whatever was unread when this thread was opened - the mock shows that count once, beside the latest incoming bubble, not on every unread message.
  const newestUnreadId =
    selectedMatch && unreadAtOpen[selectedMatch.id] > 0
      ? [...(selectedMessages ?? [])].reverse().find((message) => message.senderId !== user.id)?.id
      : null;

  // Zeroes the badge locally the moment a thread is opened rather than waiting on the request - the read stamp is bookkeeping, and a slow or failed one shouldn't leave a badge sitting on a conversation the user is looking at.
  function markRead(matchId) {
    setMatches((prev) => prev?.map((match) => (match.id === matchId ? { ...match, unreadCount: 0 } : match)) ?? prev);
    fetch(`/api/matches/${matchId}/read`, { method: "POST" }).catch(() => {});
  }

  // Fetches a match's thread once and caches it - only on success, so a failed request isn't permanently mistaken for "this match really has no messages" and doesn't block a retry on reselect.
  // Picks the opening conversation once the list arrives. Discover's "Send a message" navigates here with a matchId, which always wins and always opens the panel - the user asked for that person specifically. Otherwise the first conversation opens, but only on the two-column layout, where the panel isn't covering anything.
  useEffect(() => {
    if (selectedId || !matches?.length) return;

    const requested = requestedMatchId && matches.find((match) => match.id === requestedMatchId);
    if (requested) {
      openMatch(requested.id);
      return;
    }
    if (window.matchMedia(TWO_COLUMN_QUERY).matches) openMatch(matches[0].id);
  }, [matches]);

  function openMatch(id) {
    setSelectedId(id);
    setPanelOpen(true);
    setDraft("");
    setPanelMode("chat");
    // Read before markRead zeroes it, and re-set on every open so it always reflects this visit rather than a stale earlier one.
    setUnreadAtOpen((prev) => ({ ...prev, [id]: matches?.find((match) => match.id === id)?.unreadCount ?? 0 }));
    markRead(id);

    if (messagesByMatch[id]) return;
    setThreadLoading(true);
    fetch(`/api/matches/${id}/messages`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load thread.");
        return response.json();
      })
      .then((thread) => setMessagesByMatch((prev) => ({ ...prev, [id]: thread })))
      .catch(() => {})
      .finally(() => setThreadLoading(false));
  }

  // Sends the draft, appends the real saved message to the thread cache and the match list's lastMessage summary, and restores the draft on failure instead of silently losing what was typed.
  function handleSend(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selectedMatch) return;

    setDraft("");
    fetch(`/api/matches/${selectedMatch.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to send message.");
        return response.json();
      })
      .then((message) => appendMessage(selectedMatch.id, message))
      .catch(() => setDraft(text));
  }

  // Shared by handleSend and the socket push below - adds to the thread cache only when it's already loaded (a push for a never-opened thread would otherwise leave a cache entry holding just that one message), de-dupes by id to absorb the sender's own echo, and always refreshes the list's summary.
  function appendMessage(matchId, message) {
    setMessagesByMatch((prev) => {
      const existing = prev[matchId];
      if (!existing || existing.some((m) => m.id === message.id)) return prev;
      return { ...prev, [matchId]: [...existing, message] };
    });
    setMatches((prev) =>
      prev?.map((match) =>
        match.id === matchId
          ? {
              ...match,
              lastMessage: { senderId: message.senderId, text: message.text, createdAt: message.createdAt },
              // A message arriving in the thread already on screen is read on arrival; anywhere else it raises the badge.
              unreadCount:
                message.senderId === user.id || matchId === selectedId ? match.unreadCount ?? 0 : (match.unreadCount ?? 0) + 1,
            }
          : match
      ) ?? prev
    );
  }

  const venueKey = selectedMatch ? (scope === "me" ? "me" : `them:${selectedMatch.id}`) : null;
  const venues = venueKey ? venuesByKey[venueKey] : null;

  // Fetches once per key and caches - "Near Me" is the same wherever you are in the app, and "Near Them" only changes when the conversation does, so neither needs refetching on every visit to the planner.
  // Errors leave the cache empty so the next open retries rather than getting stuck on a failure.
  useEffect(() => {
    if (panelMode !== "plan" || !venueKey || venuesByKey[venueKey]) return;

    let cancelled = false;
    setVenuesError("");
    setVenuesLoading(true);

    function load(query) {
      fetch(`/api/venues?${query}`)
        .then((response) => (response.ok ? response.json() : response.json().then((body) => Promise.reject(body))))
        .then((results) => !cancelled && setVenuesByKey((prev) => ({ ...prev, [venueKey]: results })))
        .catch((body) => !cancelled && setVenuesError(body?.error ?? "Couldn't load places. Please try again."))
        .finally(() => !cancelled && setVenuesLoading(false));
    }

    if (scope === "them") {
      load(`scope=them&matchId=${selectedMatch.id}`);
      return () => {
        cancelled = true;
      };
    }

    if (!navigator.geolocation) {
      setVenuesError("This browser can't share your location. Try Near Them instead.");
      setVenuesLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => !cancelled && load(`scope=me&lat=${position.coords.latitude}&lng=${position.coords.longitude}`),
      () => {
        if (cancelled) return;
        setVenuesError("Location is turned off for this site. Turn it on, or try Near Them.");
        setVenuesLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [panelMode, venueKey]);

  // Sends the plan itself, plus whatever was typed as a separate note - the draft stays optional, so an empty composer sends just the card rather than putting words in anyone's mouth.
  function handleSendPlan(event) {
    event.preventDefault();
    const venue = venues?.find((item) => item.id === selectedVenueId);
    if (!venue || !selectedMatch) return;

    const note = draft.trim();
    setDraft("");
    setSelectedVenueId(null);
    setPanelMode("chat");

    fetch(`/api/matches/${selectedMatch.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "date", venue, when }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to send the plan.");
        return response.json();
      })
      .then((message) => {
        appendMessage(selectedMatch.id, message);
        if (note) return sendText(selectedMatch.id, note);
      })
      .catch(() => {
        // Back to the planner with the choice intact, rather than silently dropping the user into an empty conversation.
        setSelectedVenueId(venue.id);
        setPanelMode("plan");
        setDraft(note);
      });
  }

  // The newest plan the other person sent that nobody has accepted. Mirrors the server's own rule, so the button never appears for something POST /accept would reject - you can't accept your own plan, or one that's already on.
  const pendingProposal = [...(selectedMessages ?? [])]
    .reverse()
    .find((message) => message.kind === "date" && message.senderId !== user.id && message.dateStatus !== "accepted");

  // Flips the card locally too rather than waiting on the socket - the sender's own echo is de-duped anyway, and a dropped connection shouldn't leave the accepter looking at a plan that still says pending.
  function handleAccept() {
    if (!pendingProposal || !selectedMatch) return;

    fetch(`/api/matches/${selectedMatch.id}/messages/${pendingProposal.id}/accept`, { method: "POST" })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to accept the plan.");
        return response.json();
      })
      .then((result) => {
        markPlanAccepted(selectedMatch.id, pendingProposal.id);
        appendMessage(selectedMatch.id, result.message);
      })
      .catch(() => {});
  }

  function markPlanAccepted(matchId, messageId) {
    setMessagesByMatch((prev) => {
      const thread = prev[matchId];
      if (!thread) return prev;
      return {
        ...prev,
        [matchId]: thread.map((message) => (message.id === messageId ? { ...message, dateStatus: "accepted" } : message)),
      };
    });
  }

  function sendText(matchId, text) {
    return fetch(`/api/matches/${matchId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Failed to send message."))))
      .then((message) => appendMessage(matchId, message));
  }

  // WebSocket Deilverable: WebSocket data displayed
  useChatSocket({
    enabled: !!user,
    onMessage: appendMessage,
    onDateAccepted: markPlanAccepted,
    onRead: (matchId) =>
      setMatches((prev) => prev?.map((match) => (match.id === matchId ? { ...match, unreadCount: 0 } : match)) ?? prev),
  });

  return (
    <div id="chat" className={panelOpen ? "chat-panel-open" : undefined}>
      <AppNav />

      <main className="chat-shell">
        <div className="chat-list-col">
          <h1 className="chat-title">Chats</h1>

          {error && <p role="alert">{error}</p>}
          {!error && !matches && <p>Loading chats...</p>}
          {matches && matches.length === 0 && <p>No matches yet - keep swiping on Discover!</p>}

          {matches && matches.length > 0 && (
            <ul className="chat-list" ref={listRef}>
              {matches.map((match) => (
                <li key={match.id} className="chat-list-item">
                  <button
                    type="button"
                    className="chat-row"
                    data-unread={match.unreadCount > 0 ? "" : undefined}
                    aria-current={match.id === selectedId}
                    onClick={() => openMatch(match.id)}
                  >
                    {/* HTML Deilverable: Images */}
                    <img className="chat-row-face" src={photoUrl(match.otherUser)} alt="" aria-hidden="true" />
                    <span className="chat-row-text">
                      <span className="chat-row-name">{displayName(match.otherUser)}</span>
                      <span className="chat-row-preview">{previewText(match, user.id)}</span>
                    </span>
                  </button>
                  {match.unreadCount > 0 && (
                    <span className="chat-badge" aria-label={`${match.unreadCount} unread`}>
                      {match.unreadCount}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {matches && matches.length > 0 && (
          <div className="scroll-rail">
            <button type="button" className="scroll-chev" aria-label="Scroll chats up" onClick={() => scrollList(-1)}>
              <ChevronIcon direction="up" />
            </button>
            <button type="button" className="scroll-chev" aria-label="Scroll chats down" onClick={() => scrollList(1)}>
              <ChevronIcon direction="down" />
            </button>
          </div>
        )}

        <div className="chat-panel-col">
          {/* Drops the thread from the list on success rather than refetching - the server has already stopped returning it from GET /api/matches, so a reload would only confirm what's known, and the panel has to close either way since opening it now 403s. */}
          {reporting && selectedMatch && (
            <ReportDialog
              person={selectedMatch.otherUser}
              context={{ kind: "message", matchId: selectedMatch.id }}
              onClose={() => setReporting(false)}
              onReported={(blocked) => {
                setReporting(false);
                if (!blocked) return;
                setMatches((prev) => prev?.filter((match) => match.id !== selectedMatch.id) ?? prev);
                setSelectedId(null);
                setPanelOpen(false);
              }}
            />
          )}

          {selectedMatch && (
            <section className="chat-panel" aria-label={`Conversation with ${displayName(selectedMatch.otherUser)}`}>
              <header className="chat-panel-head">
                <div className="chat-panel-id">
                  {/* Only reachable on the stacked layout, where the panel covers the list; CSS hides it once both columns are visible. */}
                  <button type="button" className="chat-back" onClick={() => setPanelOpen(false)}>
                    &lsaquo; Chats
                  </button>
                  <h2 className="chat-panel-name">{displayName(selectedMatch.otherUser)}</h2>
                  <div className="chat-modes">
                    {PANEL_MODES.filter((mode) => mode.id !== panelMode).map((mode) => (
                      <button key={mode.id} type="button" className="chat-mode" onClick={() => setPanelMode(mode.id)}>
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  {/* Beside the mode pills rather than among them: those switch what this panel shows, and this leaves the conversation entirely. Kept as the quiet underlined control it is on Discover so the same action looks the same in both places. */}
                  <button type="button" className="report-open" onClick={() => setReporting(true)}>
                    Report this person
                  </button>
                </div>
                <img
                  className="chat-panel-face"
                  src={photoUrl(selectedMatch.otherUser)}
                  alt={displayName(selectedMatch.otherUser)}
                />
              </header>

              <div className="chat-panel-body">
                {panelMode === "profile" && (
                  <MatchProfile
                    person={selectedMatch.otherUser}
                    photoIndex={photoIndex}
                    onPhoto={setPhotoIndex}
                    fieldTableRef={fieldTableRef}
                  />
                )}

                {panelMode === "plan" && (
                  <div className="chat-planner">
                    <div className="chat-scope">
                      <button
                        type="button"
                        className="chat-scope-pill"
                        aria-pressed={scope === "me"}
                        onClick={() => setScope("me")}
                      >
                        Near Me
                      </button>
                      <button
                        type="button"
                        className="chat-scope-pill"
                        aria-pressed={scope === "them"}
                        onClick={() => setScope("them")}
                      >
                        Near Them
                      </button>
                      {/* Rendered disabled so the planner keeps the mock's layout; Places text search lands in phase 5. */}
                      <button type="button" className="chat-scope-search" disabled aria-label="Search places (not available yet)">
                        <SearchIcon />
                      </button>
                    </div>

                    {venuesLoading && <p className="chat-thread-note">Finding places...</p>}
                    {venuesError && (
                      <p className="chat-thread-note" role="alert">
                        {venuesError}
                      </p>
                    )}
                    {venues?.length === 0 && <p className="chat-thread-note">No places found nearby.</p>}

                    {venues?.length > 0 && (
                      <ul className="chat-venues">
                        {venues.map((venue) => (
                          <li key={venue.id} data-selected={venue.id === selectedVenueId ? "" : undefined}>
                            <button
                              type="button"
                              className="chat-venue"
                              aria-pressed={venue.id === selectedVenueId}
                              onClick={() => setSelectedVenueId((prev) => (prev === venue.id ? null : venue.id))}
                            >
                              <VenueCard venue={venue} />
                            </button>
                            <span className="chat-venue-check" aria-hidden="true">
                              <CheckIcon />
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <ul className="chat-thread" ref={threadRef} hidden={panelMode !== "chat"}>
                  {threadLoading && !selectedMessages && <li className="chat-thread-note">Loading messages...</li>}
                  {selectedMessages?.length === 0 && (
                    <li className="chat-thread-note">Say hi to {selectedMatch.otherUser.first_name}!</li>
                  )}

                  {selectedMessages?.map((message) => {
                    const mine = message.senderId === user.id;
                    return (
                      <li key={message.id} className={`chat-msg${mine ? " chat-msg-me" : ""}`}>
                        <span className="chat-msg-face">
                          <img src={photoUrl(mine ? user : selectedMatch.otherUser)} alt="" aria-hidden="true" />
                          {message.id === newestUnreadId && (
                            <span className="chat-badge chat-badge-msg">{unreadAtOpen[selectedMatch.id]}</span>
                          )}
                        </span>
                        {message.kind === "date" ? (
                          <div className="chat-bubble chat-bubble-plan">
                            <VenueCard venue={message.venue} />
                            <span className="chat-when-chip">
                              {message.when.day}
                              <br />
                              {message.when.time}
                            </span>
                            {message.dateStatus === "accepted" && (
                              <span className="chat-plan-accepted" aria-label="Accepted">
                                <CheckIcon />
                              </span>
                            )}
                            <BubbleTail />
                          </div>
                        ) : (
                          <div className="chat-bubble">
                            {message.text}
                            <BubbleTail />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {panelMode === "chat" && (
                  <div className="scroll-rail chat-thread-rail">
                    <button type="button" className="scroll-chev" aria-label="Scroll conversation up" onClick={() => scrollThread(-1)}>
                      <ChevronIcon direction="up" />
                    </button>
                    <button type="button" className="scroll-chev" aria-label="Scroll conversation down" onClick={() => scrollThread(1)}>
                      <ChevronIcon direction="down" />
                    </button>
                  </div>
                )}
              </div>

              {/* One composer across both modes: in the planner the draft becomes an optional note attached to the plan, and the send control commits the selected venue instead of the text. */}
              <form
                className="chat-composer"
                hidden={panelMode === "profile"}
                onSubmit={panelMode === "plan" ? handleSendPlan : handleSend}
              >
                <label className="chat-composer-label" htmlFor="message-draft">
                  {panelMode === "plan" ? "Note to send with the plan" : "Message"}
                </label>

                {/* type="button" on purpose - this sits inside the composer form, and a default submit would send the draft instead of accepting. */}
                {panelMode === "chat" && pendingProposal && (
                  <button type="button" className="chat-accept" onClick={handleAccept}>
                    Accept
                    <br />
                    Date
                  </button>
                )}
                <div className="chat-input-pill">
                  <input
                    id="message-draft"
                    type="text"
                    autoComplete="off"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={panelMode === "plan" ? "Let's meet here?" : "Type your message here..."}
                  />
                  {panelMode === "plan" && (
                    <span className="chat-when">
                      <select
                        aria-label="Day"
                        value={when.day}
                        onChange={(event) => setWhen((prev) => ({ ...prev, day: event.target.value }))}
                      >
                        {upcomingDays().map((day) => (
                          <option key={day}>{day}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Time"
                        value={when.time}
                        onChange={(event) => setWhen((prev) => ({ ...prev, time: event.target.value }))}
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time}>{time}</option>
                        ))}
                      </select>
                    </span>
                  )}
                </div>
                <button
                  className="chat-send"
                  type="submit"
                  disabled={panelMode === "plan" ? !selectedVenueId : !draft.trim()}
                  aria-label={panelMode === "plan" ? "Send date plan" : "Send message"}
                >
                  <SendIcon />
                </button>
              </form>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
