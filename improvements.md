# Areas to improve

Notes for future deliverables (Service/DB/WebSocket) where these mocks need to become real.

## Persist likes in Discover.jsx

In [src/pages/Discover/Discover.jsx](src/pages/Discover/Discover.jsx), the "Like" and "Nope" buttons currently only advance the local index without notifying the backend.

```js
const advance = () => setIndex((prev) => prev + 1);
// ...
<button id="like-btn" onClick={advance}>Like</button>
```

To move beyond the mock, implement a fetch call to a `POST /api/like` endpoint within `advance` to persist user interactions in MongoDB.

## Synchronize profile visibility

In [src/pages/Profile/Profile.jsx](src/pages/Profile/Profile.jsx), the visibility toggle is reactive in the UI but does not persist to the database.

```js
function toggleVisibility(key) {
  setVisibility((prev) => ({ ...prev, [key]: prev[key] === "visible" ? "hidden" : "visible" }));
}
```

Add a `useEffect` or a save button that triggers a `PATCH` request to update the user's profile settings on the server so these preferences are remembered.

## Robust ID generation in Chat.jsx

In [src/pages/Chat/Chat.jsx](src/pages/Chat/Chat.jsx), `Date.now()` is used to generate unique IDs for new messages.

```js
const myMessage = { id: Date.now(), sender: "me", text: draft.trim() };
```

Fine for a mock, but this can lead to key collisions if multiple messages are processed in the same millisecond. Use `crypto.randomUUID()` for more reliable client-side unique identifiers.

## Dynamic error feedback in Home.jsx

In [src/pages/Home/Home.jsx](src/pages/Home/Home.jsx), the login error message is hardcoded to a generic string.

```js
if (!response.ok) {
  setLoginError("Incorrect email or password.");
  return;
}
```

Parse the JSON response (e.g., `await response.json()`) and display the specific error message returned by the Express server instead.
