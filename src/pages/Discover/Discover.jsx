import { Link } from "react-router-dom";
import Footer from "../../components/Footer.jsx";

export default function Discover() {
  return (
    <div id="discover">
      <header>
        <h1>Discover</h1>
        <p>Swipe through profiles. Tap the heart or X to like or pass.</p>
      </header>

      <main>
        <section className="swipe-area" aria-live="polite">
          <article className="profile-card" data-profile-id="db-profile-placeholder">
            <div className="profile-photos">
              <div className="photo-placeholder">Photo</div>
            </div>

            <div className="profile-meta">
              <h2 className="profile-name">Name, Age</h2>
              <p className="profile-location">Hometown</p>
              <p className="profile-bio">Short bio or tagline goes here.</p>
              <p className="database-placeholder">
                Database placeholder: future profile records will load here from MongoDB.
              </p>
            </div>
          </article>
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
          <button id="dislike-btn" aria-label="Dislike" type="button">
            Nope
          </button>
          <button id="like-btn" aria-label="Like" type="button">
            Like
          </button>
        </section>
      </main>

      <nav className="bottom-nav" aria-label="Primary navigation">
        <ul>
          <li>
            <Link to="/discover" aria-current="page">
              Discover
            </Link>
          </li>
          <li>
            <Link to="/liked">Liked me</Link>
          </li>
          <li>
            <Link to="/chats">Chats</Link>
          </li>
          <li>
            <Link to="/profile">Profile</Link>
          </li>
        </ul>
      </nav>

      <Footer />
    </div>
  );
}
