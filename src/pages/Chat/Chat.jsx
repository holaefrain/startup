import { useEffect, useRef, useState } from "react";
import AppNav from "../../components/AppNav.jsx";
import Footer from "../../components/Footer.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useChatSocket } from "../../hooks/useChatSocket.js";
import placeholderPhoto from "../../assets/img/1080x1920.png";

// A fresh match with no messages yet is "your turn" (the "you matched, say hi" state); otherwise it's your turn whenever the other person sent the most recent message - read from each match's precomputed lastMessage summary, not the full thread.
function isYourTurn(match, currentUserId) {
  return !match.lastMessage || match.lastMessage.senderId !== currentUserId;
}

export default function Chat() {
  const { user } = useAuth();
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [messagesByMatch, setMessagesByMatch] = useState({});
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [showDatePlanner, setShowDatePlanner] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [venues, setVenues] = useState(null);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [venuesError, setVenuesError] = useState("");
  const threadEndRef = useRef(null);

  // Loads the match list once on mount.
  // Service Deilverable: Frontend calls service endpoints
  useEffect(() => {
    fetch("/api/matches")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load matches.");
        return response.json();
      })
      .then(setMatches)
      .catch(() => setError("Couldn't load matches. Please try again."));
  }, []);

  const selectedMatch = matches?.find((match) => match.id === selectedId) ?? null;
  const selectedMessages = selectedId ? messagesByMatch[selectedId] : null;
  const yourTurnMatches = matches?.filter((match) => isYourTurn(match, user.id)) ?? [];
  const theirTurnMatches = matches?.filter((match) => !isYourTurn(match, user.id)) ?? [];

  // Keeps the newest message in view as the thread grows.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedMessages]);

  // Fetches a match's thread once and caches it - only on success, so a failed request isn't permanently mistaken for "this match really has no messages" and doesn't block a retry on reselect.
  function openMatch(id) {
    setSelectedId(id);
    setShowDatePlanner(false);
    setShowProfile(false);

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
      .then((message) => {
        setMessagesByMatch((prev) => ({
          ...prev,
          [selectedMatch.id]: [...(prev[selectedMatch.id] ?? []), message],
        }));
        setMatches((prev) =>
          prev.map((match) =>
            match.id === selectedMatch.id
              ? {
                  ...match,
                  lastMessage: { senderId: message.senderId, text: message.text, createdAt: message.createdAt },
                }
              : match
          )
        );
      })
      .catch(() => setDraft(text));
  }

  // Fetches venues once (lazily, on first open) and reuses them across matches/reopens - "nearby" is based on the current browser's location, not anything match-specific, so there's no reason to refetch per match. Errors leave `venues` null so the next open retries instead of getting stuck on a failure.
  function loadVenues() {
    if (venues || venuesLoading) return;
    if (!navigator.geolocation) {
      setVenuesError("Location isn't available in this browser.");
      return;
    }

    setVenuesLoading(true);
    setVenuesError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetch(`/api/venues?lat=${latitude}&lng=${longitude}`)
          .then((response) => {
            if (!response.ok) throw new Error("Failed to load venues.");
            return response.json();
          })
          .then(setVenues)
          .catch(() => setVenuesError("Couldn't load venue suggestions. Please try again."))
          .finally(() => setVenuesLoading(false));
      },
      () => {
        setVenuesError("Location permission denied. Enable it to see nearby venues.");
        setVenuesLoading(false);
      }
    );
  }

  function toggleDatePlanner() {
    setShowDatePlanner((prev) => {
      const next = !prev;
      if (next) loadVenues();
      return next;
    });
  }

  // Only appends to a match's thread cache if it's already loaded - a push for a never-opened thread would otherwise create a cache entry containing just this one message, silently producing an incomplete thread once the user does open it. Always updates the list's lastMessage summary, and de-dupes by id to absorb the sender's own echo (server broadcasts to both match participants, not just "the other one").
  // WebSocket Deilverable: WebSocket data displayed
  useChatSocket({
    enabled: !!user,
    onMessage: (matchId, message) => {
      setMessagesByMatch((prev) => {
        const existing = prev[matchId];
        if (!existing || existing.some((m) => m.id === message.id)) return prev;
        return { ...prev, [matchId]: [...existing, message] };
      });
      setMatches((prev) =>
        prev?.map((match) =>
          match.id === matchId
            ? { ...match, lastMessage: { senderId: message.senderId, text: message.text, createdAt: message.createdAt } }
            : match
        ) ?? prev
      );
    },
  });

  return (
    <div id="chat">
      <header>
        <h1>Chat</h1>
        <p>Messages with your matches will appear here.</p>
        <AppNav />
      </header>

      <main>
        {error && <p role="alert">{error}</p>}

        {!error && !selectedMatch && (
          <section className="match-list" aria-live="polite">
            <h2>Matches</h2>

            {!matches && <p>Loading matches...</p>}

            {matches && matches.length === 0 && <p>No matches yet - keep swiping on Discover!</p>}

            {matches && matches.length > 0 && (
              <>
                <h3>Your turn ({yourTurnMatches.length})</h3>
                <ul>
                  {yourTurnMatches.map((match) => (
                    <MatchRow key={match.id} match={match} currentUserId={user.id} onSelect={openMatch} />
                  ))}
                </ul>

                <h3>Their turn ({theirTurnMatches.length})</h3>
                <ul>
                  {theirTurnMatches.map((match) => (
                    <MatchRow key={match.id} match={match} currentUserId={user.id} onSelect={openMatch} />
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {selectedMatch && (
          <section className="conversation" aria-live="polite">
            <div className="conversation-header">
              <button type="button" onClick={() => setSelectedId(null)}>
                Back
              </button>
              <h2>{selectedMatch.otherUser.first_name}</h2>
              <button type="button" onClick={() => setShowProfile((prev) => !prev)}>
                View profile
              </button>
              <button type="button" onClick={toggleDatePlanner}>
                Plan a date
              </button>
            </div>

            {showProfile && (
              <div className="profile-preview">
                <img className="photo-placeholder" src={placeholderPhoto} alt={selectedMatch.otherUser.first_name} />
                <p>
                  <strong>{selectedMatch.otherUser.first_name}</strong>
                  {selectedMatch.otherUser.age != null ? `, ${selectedMatch.otherUser.age}` : ""}
                </p>
                {selectedMatch.otherUser.job_title && <p>{selectedMatch.otherUser.job_title}</p>}
                {selectedMatch.otherUser.hometown && <p>{selectedMatch.otherUser.hometown}</p>}
              </div>
            )}

            {showDatePlanner && (
              <div className="date-planner">
                <p>Nearby venue suggestions:</p>
                {venuesLoading && <p>Finding nearby places...</p>}
                {venuesError && <p role="alert">{venuesError}</p>}
                {venues && venues.length === 0 && <p>No nearby venues found.</p>}
                {venues && venues.length > 0 && (
                  <ul>
                    {venues.map((venue, index) => (
                      <li key={venue.id ?? index}>
                        <strong>{venue.name}</strong>
                        {venue.detail ? ` - ${venue.detail}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <ul className="message-thread">
              {threadLoading && !selectedMessages && <li>Loading messages...</li>}
              {selectedMessages?.length === 0 && (
                <li className="message-empty">Say hi to {selectedMatch.otherUser.first_name}!</li>
              )}
              {selectedMessages?.map((message) => (
                <li
                  key={message.id}
                  className={`message ${message.senderId === user.id ? "message-me" : "message-match"}`}
                >
                  {message.text}
                </li>
              ))}
              <li ref={threadEndRef} />
            </ul>

            <form className="message-form" onSubmit={handleSend}>
              <label htmlFor="message-draft">Message</label>
              <input
                id="message-draft"
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type a message..."
              />
              <button type="submit" disabled={!draft.trim()}>
                Send
              </button>
            </form>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

// One row in the match list - shows the other person's name and either the last message (prefixed "You: " if I sent it) or a "Say hi!" prompt for a message-less match.
function MatchRow({ match, currentUserId, onSelect }) {
  return (
    <li>
      <button type="button" className="match-row" onClick={() => onSelect(match.id)}>
        <img className="match-photo-placeholder" src={placeholderPhoto} alt="" aria-hidden="true" />
        <span className="match-info">
          <span className="match-name">{match.otherUser.first_name}</span>
          <span className="match-preview">
            {match.lastMessage
              ? `${match.lastMessage.senderId === currentUserId ? "You: " : ""}${match.lastMessage.text}`
              : "Say hi!"}
          </span>
        </span>
      </button>
    </li>
  );
}
