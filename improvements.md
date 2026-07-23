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

### No rate limiting on POST /api/signup, PATCH /api/profile, PATCH /api/profile/photo, or POST /api/swipes

In [server/index.js](server/index.js), `POST /api/signup` has no rate limiter, unlike `POST/PUT /api/auth` and `GET /api/users/exists` (`server/auth.js`), which each use `express-rate-limit`. This is the most expensive endpoint in the app - unauthenticated, and does a real S3 upload per photo plus a Mongo write - so it's a bigger abuse/cost target than the endpoints already covered, even with the `bare_profile_ttl` index bounding long-term junk accumulation.

`server/profile.js`'s `PATCH /api/profile` and `PATCH /api/profile/photo`, and `server/swipes.js`'s `POST /api/swipes` (added in Phases 2-3 of the backend rewrite) have the same gap. Lower urgency than signup/auth since all three require a valid session (abuse is bounded to registered accounts, not the open internet), but still worth covering for consistency - `POST /api/swipes` in particular could otherwise be hammered in a tight loop to spam-create matches.

Add a limiter to all four matching the pattern already in `server/auth.js` (e.g. a shared or dedicated `rateLimit(...)` instance per route), tuned looser than the auth endpoints since a real user only hits these occasionally, not repeatedly in a tight loop.

### Discover (and Chat's "View profile") must respect the per-field visibility toggle

In [server/discover.js](server/discover.js), `DISCOVER_PROJECTION` is a single fixed field set returned for every profile, regardless of that user's own `visibility` map (`Profile.jsx`'s Visible/Hidden toggle, persisted via `PATCH /api/profile` in `server/profile.js`). This is `architecture.md`'s own documented "Current Limitations" gap ("nothing enforces it anywhere"), not something newly introduced - but it needs to actually be fixed, not just noted.

Requirement: a field the user has marked "visible" (including the implicit default for a field they've never touched) is projected to other users; a field marked "hidden" is not - except the fields `Profile.jsx` locks regardless of the map (`first_name`/`last_name`/`age`/`height`/`location` always shown, `interested_in` never shown, `photoKeys` always included and not part of the toggle system at all).

Being fixed as part of Phase 4 of the backend rewrite (see the plan file) - `server/userSchema.js` gets a shared `projectVisibleFields(user)` helper (derives which fields to include from `PROFILE_EDITABLE_FIELDS`/`VISIBILITY_FIELDS`, not a fourth hand-maintained list) used by both the `GET /api/discover` retrofit and the new `GET /api/matches`, so the fix lands in one place instead of being duplicated or missed in the new endpoint.

### server/dbClient.js caches a failed initial connection forever

Discovered while debugging repeated `"Server selection timed out"` errors during manual testing - the root cause that day turned out to be unrelated (too many concurrent Node processes competing for MongoDB Atlas connections at once, not a code bug), but investigating it surfaced a real, separate robustness gap: `getDb()`'s `connectPromise` is set once, on the first call, and never retried or reset - `if (!connectPromise) { connectPromise = client.connect().then(...) }`. If that very first connection attempt happens to fail for any transient reason (a brief network blip, DNS hiccup, momentary Atlas unavailability), the *rejected* promise gets cached permanently for that process's entire lifetime. Every subsequent request instantly re-throws the same stale error, even seconds later once the network has fully recovered - the only fix today is restarting the whole server process.

Fix would be to not cache a rejected connection promise - e.g. reset `connectPromise = null` in a `.catch()` so the next `getDb()` call gets a fresh attempt instead of replaying a stale failure indefinitely.
