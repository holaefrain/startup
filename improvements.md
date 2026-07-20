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

## User testing feedback

Notes from a manual walkthrough of the app. All point back to the same root cause as the items above - most screens hold their data in local `useState` with no backend/localStorage round-trip, so anything entered is lost on refresh, navigation, or reply from another screen.

### Chat messages don't survive leaving the screen

In [src/pages/Chat/Chat.jsx](src/pages/Chat/Chat.jsx), matches and messages live entirely in `useState(INITIAL_MATCHES)` (line 72). There's no read/write to localStorage or an API, so navigating away from Chat and back (or refreshing) drops every message sent during the session.

```js
const [matches, setMatches] = useState(INITIAL_MATCHES);
```

Persist thread state either client-side (`localStorage`, keyed per match) as a stopgap, or via the planned `GET/POST /api/messages` endpoints once the chat backend exists - matches the "Planned: Chat" note already in this file's Chat.jsx comment block.

### Profile doesn't reflect signup answers, and edits don't persist

In [src/pages/Profile/Profile.jsx](src/pages/Profile/Profile.jsx), two related bugs:

1. `INITIAL_VALUES` (lines 47-70) is a hardcoded sample profile ("Jordan Rivera", etc.) rather than the data the user actually entered during Signup - the two forms aren't connected at all.
2. Because `values`/`visibility` are local `useState`, editing a field and then navigating to another tab (Discover, Chat) and back remounts `Profile` and resets to `INITIAL_VALUES`, discarding the edit.

Fixing both requires the same underlying change: source `INITIAL_VALUES` from the logged-in user's stored profile (fetched via `useAuth`/an API call) instead of a hardcoded object, and persist `updateValue`/`toggleVisibility` changes back to that store (or at minimum localStorage) instead of only local component state.

### Signup phone number field accepts anything

In [src/pages/Signup/steps/AccountStep.jsx](src/pages/Signup/steps/AccountStep.jsx#L46-L55), the phone input is `type="tel"` with `required` but no `pattern` or format validation, so non-numeric input like "few" is accepted.

```jsx
<input
  id="phone"
  name="phone"
  type="tel"
  placeholder="+1-555-555-5555"
  value={formData.phone}
  onChange={onChange}
  required
/>
```

Add a `pattern` attribute (or JS validation on submit) to reject non-phone-shaped input before it reaches the server.

### Signup allows the same photo to be reused across slots

In [src/pages/Signup/steps/PhotosStep.jsx](src/pages/Signup/steps/PhotosStep.jsx), `onPhotoChange` (called at line 17) sets whichever file was picked into that slot with no check against the files already chosen for other slots, so the same image can satisfy all `MIN_PHOTOS` slots.

```js
const handlePhotoChange = (index, event) => {
  const file = event.target.files[0] ?? null;
  setPhotos((prev) => prev.map((photo, i) => (i === index ? file : photo)));
};
```

Compare the incoming file against the other entries in `photos` (e.g. by name + size, or a hash) and reject/warn on duplicates.

### Duplicate-email error only surfaces on the final signup step

In [src/pages/Signup/Signup.jsx](src/pages/Signup/Signup.jsx#L88-L120), `handleSubmit` only calls `POST /api/signup` once `step === TOTAL_STEPS` (the "Finish" click on step 5), so a duplicate-email rejection from the server isn't seen until after the user has filled out all 5 steps, including photos.

```js
if (step < TOTAL_STEPS) {
  setStep((prev) => prev + 1);
  return;
}
// ...POST /api/signup only happens here, on the last step
```

Check email availability earlier - e.g. an `onBlur` handler on the email field in [AccountStep.jsx](src/pages/Signup/steps/AccountStep.jsx) that calls a lightweight `GET /api/users/exists?email=` (or equivalent) and shows an inline error on step 1, rather than waiting for the full submit at step 5.
