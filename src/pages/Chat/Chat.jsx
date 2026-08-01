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
  const listRef = useRef(null);
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
      .catch(() => setError("Couldn't load your chats. Please try again."));
  }, []);

  const selectedMatch = matches?.find((match) => match.id === selectedId) ?? null;
  const selectedMessages = selectedId ? messagesByMatch[selectedId] : null;

  // Keeps the newest message in view as the thread grows.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedMessages]);

  function scrollList(direction) {
    listRef.current?.scrollBy({ top: direction * LIST_SCROLL_STEP, behavior: "smooth" });
  }

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

              {/* Scaffolding: bubbles land in 4.3, the composer in 4.4, and the planner and profile views in 4.5 and 4.6. */}
              {panelMode !== "chat" && (
                <p className="chat-panel-pending">
                  {panelMode === "plan" ? "Venue suggestions" : "Profile"} lands in the next bullet.
                </p>
              )}

              <ul className="message-thread" hidden={panelMode !== "chat"}>
                {threadLoading && !selectedMessages && <li>Loading messages...</li>}
                {selectedMessages?.length === 0 && <li>Say hi to {selectedMatch.otherUser.first_name}!</li>}
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

              <form className="message-form" hidden={panelMode !== "chat"} onSubmit={handleSend}>
                <label htmlFor="message-draft">Message</label>
                <input
                  id="message-draft"
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Type your message here..."
                />
                <button type="submit" disabled={!draft.trim()}>
                  Send
                </button>
              </form>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
