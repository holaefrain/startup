# Areas to improve

Notes for future deliverables (Service/DB/WebSocket) where these mocks need to become real.

## No rate limiting on POST /api/signup, PATCH /api/profile, PATCH /api/profile/photo, or POST /api/swipes

In [server/index.js](server/index.js), `POST /api/signup` has no rate limiter, unlike `POST/PUT /api/auth` and `GET /api/users/exists` (`server/auth.js`), which each use `express-rate-limit`. This is the most expensive endpoint in the app - unauthenticated, and does a real S3 upload per photo plus a Mongo write - so it's a bigger abuse/cost target than the endpoints already covered, even with the `bare_profile_ttl` index bounding long-term junk accumulation.

`server/profile.js`'s `PATCH /api/profile` and `PATCH /api/profile/photo`, and `server/swipes.js`'s `POST /api/swipes` (added in Phases 2-3 of the backend rewrite) have the same gap. Lower urgency than signup/auth since all three require a valid session (abuse is bounded to registered accounts, not the open internet), but still worth covering for consistency - `POST /api/swipes` in particular could otherwise be hammered in a tight loop to spam-create matches.

Add a limiter to all four matching the pattern already in `server/auth.js` (e.g. a shared or dedicated `rateLimit(...)` instance per route), tuned looser than the auth endpoints since a real user only hits these occasionally, not repeatedly in a tight loop.

## server/dbClient.js caches a failed initial connection forever

Discovered while debugging repeated `"Server selection timed out"` errors during manual testing - the root cause that day turned out to be unrelated (too many concurrent Node processes competing for MongoDB Atlas connections at once, not a code bug), but investigating it surfaced a real, separate robustness gap: `getDb()`'s `connectPromise` is set once, on the first call, and never retried or reset - `if (!connectPromise) { connectPromise = client.connect().then(...) }`. If that very first connection attempt happens to fail for any transient reason (a brief network blip, DNS hiccup, momentary Atlas unavailability), the *rejected* promise gets cached permanently for that process's entire lifetime. Every subsequent request instantly re-throws the same stale error, even seconds later once the network has fully recovered - the only fix today is restarting the whole server process.

Fix would be to not cache a rejected connection promise - e.g. reset `connectPromise = null` in a `.catch()` so the next `getDb()` call gets a fresh attempt instead of replaying a stale failure indefinitely.

## Validate geolocation ranges in server/places.js

In [server/places.js](server/places.js), `GET /api/venues` checks that `lat`/`lng` are finite numbers but not that they fall within realistic ranges (-90 to 90 for latitude, -180 to 180 for longitude).

```js
const lat = Number(req.query.lat);
const lng = Number(req.query.lng);
if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
```

Add range checks alongside the existing finiteness check so an out-of-range value is rejected before it reaches the Google Places API call.

## Reduce redundant lookups in server/auth.js registration

In [server/auth.js](server/auth.js), `POST /auth`'s no-`userId` branch calls `users.find({ email }).toArray()` and pulls back full documents just to check `.password` on each candidate.

```js
const candidates = await users.find({ email }).toArray();
if (candidates.some((doc) => doc.password)) {
```

Add a projection (e.g. `{ password: 1 }`) to this query so only the field actually needed is transferred from MongoDB, instead of the full user document for every candidate.

## No dedicated mobile layout for the redesigned Discover/AppNav

The Discover page redesign ([src/pages/Discover/Discover.jsx](src/pages/Discover/Discover.jsx), [src/components/AppNav.jsx](src/components/AppNav.jsx), [src/index.css](src/index.css)) was built against desktop reference mocks - the two-column profile card, the fixed-height (`56rem`) photo carousel, and the absolute-positioned floating like/dislike buttons all assume a wide viewport. `.profile-card`'s `flex-wrap: wrap` means the two columns will stack rather than overlap on a narrow screen, but nothing beyond that has been tuned for mobile (carousel height, touch target sizing, the hamburger drawer's width, etc.).

A real mobile version is planned as a future deliverable, not yet started - when it happens, it'll likely need its own breakpoint pass rather than assuming the desktop flex-wrap fallback is sufficient.

## AppNav's drawer should push/squish the page instead of overlaying it

[src/components/AppNav.jsx](src/components/AppNav.jsx) currently opens as a fixed-position drawer sliding on top of the page, with a semi-transparent backdrop behind it (the animejs-driven `translateX`/`opacity` pair in the `useEffect` there). The requested behavior instead is a "push" pattern - the drawer's slide-in should visibly shrink/squish the actual page content sideways (the profile card compressing to make room), rather than just floating an overlay above it with a backdrop.

Implementing this would mean animating the main content area's width/transform in sync with the drawer (not just the drawer itself), and probably dropping the backdrop entirely since the page itself visibly reacts to the drawer opening. Noted as a future enhancement, not implemented yet.
