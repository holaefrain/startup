<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Debrief | Discover</title>
  <!--
    NOTE: No JS/CSS included here per request. Add styles and scripts later.
    JS TODOs (to implement later):
      - Fetch next profiles from the server and render them into the
        `.swipe-area` as `article.profile-card` elements.
      - Implement swipe gestures (touch/mouse) to trigger like/dislike.
      - Wire the `#like-btn` and `#dislike-btn` buttons to send POST
        requests to `/api/like` or `/api/dislike` and then advance the queue.
      - Handle empty state (no more profiles) and errors.
  -->
</head>
<body>
  <header>
    <h1>Discover</h1>
    <p>Swipe through profiles. Tap the heart or X to like or pass.</p>
  </header>

  <main>
    <!-- Swipe area: render one profile card at a time (server or JS-controlled) -->
    <section class="swipe-area" aria-live="polite">
      <!-- Example card structure (server can render one, JS can replace) -->
      <article class="profile-card" data-profile-id="">
        <!-- Image placeholder. Replace with <img> or carousel element later -->
        <div class="profile-photos">
          <!-- TODO: render profile photos here -->
          <div class="photo-placeholder">Photo</div>
        </div>

        <div class="profile-meta">
          <h2 class="profile-name">Name, Age</h2>
          <p class="profile-location">Hometown</p>
          <p class="profile-bio">Short bio or tagline goes here.</p>
        </div>
      </article>
    </section>

    <!-- Controls: these buttons should be wired to like/dislike actions -->
    <section class="controls" aria-hidden="false">
      <!-- JS TODO: connect these to the same handlers as swipe gestures -->
      <button id="dislike-btn" aria-label="Dislike">Nope</button>
      <button id="like-btn" aria-label="Like">Like</button>
    </section>
  </main>

  <!-- Bottom navigation: links to other app areas. These can be separate pages
       or routes in a single-page app. For now they point to simple HTML files. -->
  <nav class="bottom-nav" aria-label="Primary navigation">
    <ul>
      <li><a href="discover.html" aria-current="page">Discover</a></li>
      <li><a href="liked.html">Liked me</a></li>
      <li><a href="chats.html">Chats</a></li>
      <li><a href="profile.html">Profile</a></li>
    </ul>
  </nav>

  <!--
    NOTES for future JS integration:
      - The server can render `discover.html` with the first profile embedded
        (server-side rendering), then subsequent profiles are fetched via API.
      - If you prefer simple navigation, create separate HTML pages for
        `liked.html`, `chats.html`, and `profile.html`; otherwise implement
        them as client-side views in a single-page app.
  -->
</body>
</html>