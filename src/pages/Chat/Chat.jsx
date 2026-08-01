import { useEffect, useRef, useState } from "react";
import AppNav from "../../components/AppNav.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useChatSocket } from "../../hooks/useChatSocket.js";
import placeholderPhoto from "../../assets/img/1080x1920.png";
import "./Chat.css";

const LIST_SCROLL_STEP = 150; // px per chevron click, roughly one and a half rows

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

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 2 2 10.4l7.3 2.6 9.3-7.4-7.1 8.4 2.7 7.6z" />
    </svg>
  );
}

function ChevronIcon({ direction }) {
  return (
    <svg viewBox="0 0 32 20" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === "up" ? "M3 17 16 4l13 13" : "M3 3 16 16l13-13"} />
    </svg>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
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
  const listRef = useRef(null);
  const threadRef = useRef(null);

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
  // Opens the first conversation once the list arrives, so the panel is never a blank half-page. Bullet 4.8 makes this prefer the match Discover navigated here with.
  useEffect(() => {
    if (!selectedId && matches?.length) openMatch(matches[0].id);
  }, [matches]);

  function openMatch(id) {
    setSelectedId(id);
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
    onRead: (matchId) =>
      setMatches((prev) => prev?.map((match) => (match.id === matchId ? { ...match, unreadCount: 0 } : match)) ?? prev),
  });

  return (
    <div id="chat" className={selectedMatch ? "chat-thread-open" : undefined}>
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
          <div className="chat-rail">
            <button type="button" className="chat-chev" aria-label="Scroll chats up" onClick={() => scrollList(-1)}>
              <ChevronIcon direction="up" />
            </button>
            <button type="button" className="chat-chev" aria-label="Scroll chats down" onClick={() => scrollList(1)}>
              <ChevronIcon direction="down" />
            </button>
          </div>
        )}

        <div className="chat-panel-col">
          {selectedMatch && (
            <section className="chat-panel" aria-label={`Conversation with ${displayName(selectedMatch.otherUser)}`}>
              <header className="chat-panel-head">
                <div className="chat-panel-id">
                  <h2 className="chat-panel-name">{displayName(selectedMatch.otherUser)}</h2>
                  <div className="chat-modes">
                    {PANEL_MODES.filter((mode) => mode.id !== panelMode).map((mode) => (
                      <button key={mode.id} type="button" className="chat-mode" onClick={() => setPanelMode(mode.id)}>
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
                <img
                  className="chat-panel-face"
                  src={photoUrl(selectedMatch.otherUser)}
                  alt={displayName(selectedMatch.otherUser)}
                />
              </header>

              <div className="chat-panel-body">
                {/* Scaffolding: the profile view lands in 4.6. */}
                {panelMode === "profile" && <p className="chat-panel-pending">Profile lands in the next bullet.</p>}

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
                        <div className="chat-bubble">
                          {message.text}
                          <BubbleTail />
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {panelMode === "chat" && (
                  <div className="chat-rail chat-thread-rail">
                    <button type="button" className="chat-chev" aria-label="Scroll conversation up" onClick={() => scrollThread(-1)}>
                      <ChevronIcon direction="up" />
                    </button>
                    <button type="button" className="chat-chev" aria-label="Scroll conversation down" onClick={() => scrollThread(1)}>
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
