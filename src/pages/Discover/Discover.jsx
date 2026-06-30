export default function Discover() {
  return (
    <div id="discover">
      <header>
        <h1>Discover</h1>
        <p>Swipe through profiles. Tap the heart or X to like or pass.</p>
      </header>

      <main>
        <section className="swipe-area" aria-live="polite">
          <article className="profile-card" data-profile-id="">
            <div className="profile-photos">
              <div className="photo-placeholder">Photo</div>
            </div>

            <div className="profile-meta">
              <h2 className="profile-name">Name, Age</h2>
              <p className="profile-location">Hometown</p>
              <p className="profile-bio">Short bio or tagline goes here.</p>
            </div>
          </article>
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
            <a href="discover.html" aria-current="page">
              Discover
            </a>
          </li>
          <li>
            <a href="liked.html">Liked me</a>
          </li>
          <li>
            <a href="chats.html">Chats</a>
          </li>
          <li>
            <a href="profile.html">Profile</a>
          </li>
        </ul>
      </nav>
    </div>
  );
}
