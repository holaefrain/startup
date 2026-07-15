import { useEffect, useRef, useState } from "react";
import AppNav from "../../components/AppNav.jsx";
import Footer from "../../components/Footer.jsx";
import placeholderPhoto from "../../assets/img/1080x1920.png";

// local state only, no real
// matches/messages backend or WebSocket yet (see architecture.md's
// "Planned: Chat" section). Structure matches that plan though - a match
// list with a last-message preview, click into a full thread, and a
// "Plan a date" button that would call the Google Maps API server-side.

const MOCK_REPLIES = [
  "Sounds good to me!",
  "Haha, fair enough.",
  "Let's do it.",
  "I was just thinking the same thing.",
];

const MOCK_VENUES = [
  { name: "Rye Diner", detail: "Cafe · 0.4 mi away" },
  { name: "The Gateway", detail: "Shops & food · 1.2 mi away" },
  { name: "Liberty Park", detail: "Park · 0.8 mi away" },
];

const INITIAL_MATCHES = [
  {
    id: 1,
    name: "Ava",
    age: 29,
    job_title: "Graphic Designer",
    hometown: "Salt Lake City, UT",
    messages: [
      { id: 1, sender: "match", text: "Hey! How was the coffee place you mentioned?" },
      { id: 2, sender: "me", text: "Really good actually, we should go sometime" },
      { id: 3, sender: "match", text: "I'm free this weekend if you want to propose something" },
    ],
  },
  {
    id: 2,
    name: "Daniel",
    age: 32,
    job_title: "Product Manager",
    hometown: "Provo, UT",
    messages: [
      { id: 1, sender: "match", text: "Hey, great to match with you!" },
      { id: 2, sender: "me", text: "You too! What are you up to this week?" },
    ],
  },
  {
    id: 3,
    name: "Grace",
    age: 27,
    job_title: "Teacher",
    hometown: "Logan, UT",
    messages: [{ id: 1, sender: "match", text: "Haha okay that's a good one" }],
  },
];

// Hinge-style grouping: it's "your turn" when the match's last message is
// waiting on a reply from me, "their turn" once I've replied and I'm the
// one waiting. Derived from the messages themselves rather than stored, so
// it can't drift out of sync with the thread.
function lastMessageOf(match) {
  return match.messages[match.messages.length - 1];
}

function isYourTurn(match) {
  return lastMessageOf(match).sender === "match";
}

export default function Chat() {
  const [matches, setMatches] = useState(INITIAL_MATCHES);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState("");
  const [showDatePlanner, setShowDatePlanner] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const threadEndRef = useRef(null);

  const selectedMatch = matches.find((match) => match.id === selectedId) ?? null;
  const yourTurnMatches = matches.filter(isYourTurn);
  const theirTurnMatches = matches.filter((match) => !isYourTurn(match));

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedMatch?.messages]);

  function openMatch(id) {
    setSelectedId(id);
    setShowDatePlanner(false);
    setShowProfile(false);
  }

  function handleSend(event) {
    event.preventDefault();
    if (!draft.trim() || !selectedMatch) return;

    const myMessage = { id: Date.now(), sender: "me", text: draft.trim() };
    const matchId = selectedMatch.id;
    setDraft("");
    setMatches((prev) =>
      prev.map((match) => (match.id === matchId ? { ...match, messages: [...match.messages, myMessage] } : match))
    );

    // Mocked reply so the thread feels alive without a backend.
    const reply = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
    setTimeout(() => {
      setMatches((prev) =>
        prev.map((match) =>
          match.id === matchId
            ? { ...match, messages: [...match.messages, { id: Date.now() + 1, sender: "match", text: reply }] }
            : match
        )
      );
    }, 800);
  }

  return (
    <div id="chat">
      <header>
        <h1>Chat</h1>
        <p>Messages with your matches will appear here.</p>
        <AppNav />
      </header>

      <main>
        {!selectedMatch && (
          <section className="match-list" aria-live="polite">
            <h2>Matches</h2>

            <h3>Your turn ({yourTurnMatches.length})</h3>
            <ul>
              {yourTurnMatches.map((match) => (
                <MatchRow key={match.id} match={match} onSelect={openMatch} />
              ))}
            </ul>

            <h3>Their turn ({theirTurnMatches.length})</h3>
            <ul>
              {theirTurnMatches.map((match) => (
                <MatchRow key={match.id} match={match} onSelect={openMatch} />
              ))}
            </ul>
          </section>
        )}

        {selectedMatch && (
          <section className="conversation" aria-live="polite">
            <div className="conversation-header">
              <button type="button" onClick={() => setSelectedId(null)}>
                Back
              </button>
              <h2>{selectedMatch.name}</h2>
              <button type="button" onClick={() => setShowProfile((prev) => !prev)}>
                View profile
              </button>
              <button type="button" onClick={() => setShowDatePlanner((prev) => !prev)}>
                Plan a date
              </button>
            </div>

            {showProfile && (
              <div className="profile-preview">
                <img className="photo-placeholder" src={placeholderPhoto} alt={selectedMatch.name} />
                <p>
                  <strong>{selectedMatch.name}</strong>, {selectedMatch.age}
                </p>
                <p>{selectedMatch.job_title}</p>
                <p>{selectedMatch.hometown}</p>
              </div>
            )}

            {showDatePlanner && (
              <div className="date-planner">
                <p>Nearby venue suggestions (Google Maps placeholder):</p>
                <ul>
                  {MOCK_VENUES.map((venue) => (
                    <li key={venue.name}>
                      <strong>{venue.name}</strong> - {venue.detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ul className="message-thread">
              {selectedMatch.messages.map((message) => (
                <li key={message.id} className={`message message-${message.sender}`}>
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

function MatchRow({ match, onSelect }) {
  const lastMessage = lastMessageOf(match);
  return (
    <li>
      <button type="button" className="match-row" onClick={() => onSelect(match.id)}>
        <img className="match-photo-placeholder" src={placeholderPhoto} alt="" aria-hidden="true" />
        <span className="match-info">
          <span className="match-name">{match.name}</span>
          <span className="match-preview">
            {lastMessage.sender === "me" ? "You: " : ""}
            {lastMessage.text}
          </span>
        </span>
      </button>
    </li>
  );
}
