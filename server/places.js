const express = require("express");
const rateLimit = require("express-rate-limit");
const { getAuthenticatedUser, loadMatchMembership } = require("./authHelpers");
const { getDb } = require("./dbClient");
const { SAFE_IMAGE_CONTENT_TYPES } = require("./imageTypes");

const PLACES_API_BASE = "https://places.googleapis.com/v1";
const PLACES_API_ROOT = `${PLACES_API_BASE}/places`;
const MIN_AUTOCOMPLETE_INPUT_LENGTH = 2;
const PLACE_LOOKUP_TIMEOUT_MS = 4000; // caps how long a signup can wait on the coordinate lookup below
const VENUE_PHOTO_MAX_HEIGHT_PX = 400; // the card renders these small; asking for less costs less bandwidth and still covers retina
const VENUE_PHOTO_TIMEOUT_MS = 6000;

// photoName goes straight into a googleapis URL path, so its shape is enforced before it's ever interpolated - without this, a crafted value could walk the path to a different Google endpoint (SSRF). Google's own format is places/<id>/photos/<ref>, both segments URL-safe base64 characters.
const VENUE_PHOTO_NAME_PATTERN = /^places\/[A-Za-z0-9_-]{1,255}\/photos\/[A-Za-z0-9_-]{1,512}$/;

// Everything the Chat "Plan a date" venue card renders. Wider than the old id/name/address trio, which puts these calls in a higher-cost Places SKU - see loadVenues' caching in Chat.jsx for why that's still one fetch per location, not per open.
const VENUE_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.shortFormattedAddress",
  "places.formattedAddress",
  "places.rating",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.currentOpeningHours",
  "places.utcOffsetMinutes",
  "places.priceLevel",
  "places.priceRange",
  "places.photos",
].join(",");

// Fallback ranges for places that expose only a coarse priceLevel enum and no concrete priceRange - deliberately approximate, and only ever reached when Google has no real numbers for the place.
const PRICE_LEVEL_RANGES = {
  PRICE_LEVEL_FREE: "~ Free",
  PRICE_LEVEL_INEXPENSIVE: "~$10-20",
  PRICE_LEVEL_MODERATE: "~$20-40",
  PRICE_LEVEL_EXPENSIVE: "~$40-80",
  PRICE_LEVEL_VERY_EXPENSIVE: "~$80+",
};

// Google returns opening times as UTC timestamps, so they're formatted against the venue's own utcOffsetMinutes rather than the server's clock - a venue in another timezone (routine once "Near Them" ships) would otherwise print the wrong hour.
function formatLocalTime(timestamp, utcOffsetMinutes) {
  if (!timestamp) return null;
  const shifted = new Date(new Date(timestamp).getTime() + (utcOffsetMinutes ?? 0) * 60000);
  if (Number.isNaN(shifted.getTime())) return null;
  const hours = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes();
  const suffix = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

// "Closes at 9 PM" / "Opens at 9 PM" / "Open 24 hours" - null when Google has no hours for the place at all, which the card renders as simply nothing rather than a guess.
function formatHours(place) {
  const hours = place.currentOpeningHours;
  if (!hours) return null;
  if (hours.openNow) {
    const closes = formatLocalTime(hours.nextCloseTime, place.utcOffsetMinutes);
    return closes ? `Closes at ${closes}` : "Open 24 hours";
  }
  const opens = formatLocalTime(hours.nextOpenTime, place.utcOffsetMinutes);
  return opens ? `Opens at ${opens}` : null;
}

// Prefers Google's concrete priceRange, falls back to the coarse priceLevel enum, and finally infers free for parks - that last step is an inference about the real world (parks generally cost nothing to enter), not something Google told us.
function formatPrice(place) {
  const start = place.priceRange?.startPrice?.units;
  const end = place.priceRange?.endPrice?.units;
  if (start && end) return `~$${start}-${end}`;
  if (start || end) return `~$${start ?? end}+`;
  if (place.priceLevel) return PRICE_LEVEL_RANGES[place.priceLevel] ?? null;
  return place.primaryType === "park" ? "~ Free" : null;
}

const router = express.Router();

// Plain session check, for the one route below that needs it - /api/places/autocomplete deliberately does NOT use this, since Signup's location/hometown fields are filled out before any session exists.
async function requireAuth(req, res, next) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }
  req.user = user;
  next();
}

// Unauthenticated and billed by Google per call, so - unlike every other endpoint in this rewrite - this gets rate limiting built in now instead of deferred (see the plan's Phase 6 notes for why).
const autocompleteRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// Shared by both routes below - Google's Places API (New) uses POST + a JSON body + these headers, not the old Legacy API's GET+query-param shape. X-Goog-FieldMask restricts the response to just what's needed, which the New Places API rewards for cost/size control.
// Service Deilverable: Calls to third party endpoints
// HTML Deilverable: 3rd party API placeholder (now the real integration)
async function callPlacesApi(action, body, fieldMask) {
  // Service Deilverable: Calls to third party endpoints - server-side fetch to Google Places API
  const response = await fetch(`${PLACES_API_ROOT}:${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Places API ${action} failed (${response.status}): ${errorBody}`);
  }
  return response.json();
}

// Resolves a placeId to coordinates, for the location a user picks at signup - Place Details is a plain GET on places/{id}, not the POST-to-places:{action} shape callPlacesApi handles, so it doesn't go through that helper.
// Deliberately best-effort: coordinates are an enhancement to venue search, so a failed, denied, or slow lookup resolves to null and the caller stores nothing rather than failing the signup or profile write it's attached to.
async function fetchPlaceCoordinates(placeId) {
  if (typeof placeId !== "string" || placeId.length === 0) return null;

  try {
    const response = await fetch(`${PLACES_API_ROOT}/${encodeURIComponent(placeId)}`, {
      headers: { "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY, "X-Goog-FieldMask": "location" },
      signal: AbortSignal.timeout(PLACE_LOOKUP_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Place details failed (${response.status})`);

    const { location } = await response.json();
    const { latitude, longitude } = location ?? {};
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { lat: latitude, lng: longitude };
  } catch (err) {
    console.error("Place coordinate lookup failed", err.message);
    return null;
  }
}

// Nearby venue suggestions for Chat.jsx's "Plan a date", in two scopes: "me" searches around coordinates the caller's own browser supplies, "them" searches around the other participant's saved location for a match the caller is actually part of.
// The match's coordinates are read and used entirely server-side and never appear in the response - "Near Them" returns places, never a location, so using it can't tell you where someone lives.
router.get("/venues", requireAuth, async (req, res) => {
  const scope = req.query.scope === "them" ? "them" : "me";
  let lat;
  let lng;

  if (scope === "them") {
    const { otherUserId, status, error } = await loadMatchMembership(req.user, req.query.matchId ?? "");
    if (error) {
      res.status(status).json({ error });
      return;
    }

    // Explicit projection because location_coords is deliberately absent from PUBLIC_QUERY_PROJECTION - nothing that reaches another user's browser carries it.
    const db = await getDb();
    const otherUser = await db.collection("users").findOne({ _id: otherUserId }, { projection: { location_coords: 1 } });
    const coords = otherUser?.location_coords;
    if (!coords) {
      res.status(409).json({ error: "They haven't added a location yet. Try Near Me instead." });
      return;
    }

    lat = coords.lat;
    lng = coords.lng;
  } else {
    lat = Number(req.query.lat);
    lng = Number(req.query.lng);
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "lat and lng are required." });
    return;
  }

  try {
    const data = await callPlacesApi(
      "searchNearby",
      {
        includedTypes: ["restaurant", "cafe", "park", "bar"],
        maxResultCount: 10,
        locationRestriction: {
          circle: { center: { latitude: lat, longitude: lng }, radius: 5000 },
        },
      },
      VENUE_FIELD_MASK
    );

    // shortFormattedAddress ("135 N University Ave, Provo, UT 84601") is what the card's two-line address wants; formattedAddress is the longer fallback when Google omits it.
    const venues = (data.places ?? []).map((place) => ({
      id: place.id,
      name: place.displayName?.text ?? "Unknown",
      address: place.shortFormattedAddress ?? place.formattedAddress ?? "",
      kind: place.primaryTypeDisplayName?.text ?? null,
      rating: typeof place.rating === "number" ? place.rating : null,
      openNow: place.currentOpeningHours?.openNow ?? null,
      hours: formatHours(place),
      price: formatPrice(place),
      photoName: place.photos?.[0]?.name ?? null,
    }));
    res.json(venues);
  } catch (err) {
    console.error("GET /api/venues failed", err);
    res.status(502).json({ error: "Failed to load nearby venues." });
  }
});

// Serves a venue photo for the "Plan a date" card. GET /api/venues returns Google's opaque photo *reference*, not an image, so this exchanges one for the bytes - proxied rather than handed to the browser as a signed Google URL, which keeps GOOGLE_MAPS_API_KEY server-side exactly like server/photos.js keeps the S3 bucket private.
// The photo reference is a query param rather than a path segment because it contains slashes of its own.
router.get("/venues/photo", requireAuth, async (req, res) => {
  const photoName = typeof req.query.name === "string" ? req.query.name : "";
  if (!VENUE_PHOTO_NAME_PATTERN.test(photoName)) {
    res.status(400).json({ error: "Invalid photo reference." });
    return;
  }

  try {
    const response = await fetch(
      `${PLACES_API_BASE}/${photoName}/media?maxHeightPx=${VENUE_PHOTO_MAX_HEIGHT_PX}`,
      {
        headers: { "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY },
        signal: AbortSignal.timeout(VENUE_PHOTO_TIMEOUT_MS),
      }
    );
    if (!response.ok) throw new Error(`Place photo failed (${response.status})`);

    // Buffered rather than streamed: these are capped at 400px, so a few tens of KB, and it avoids wiring web-stream-to-Node-stream plumbing for no practical gain.
    const contentType = response.headers.get("content-type") ?? "";
    if (!SAFE_IMAGE_CONTENT_TYPES.has(contentType)) throw new Error(`Unexpected photo content type: ${contentType}`);
    const body = Buffer.from(await response.arrayBuffer());

    res.set("Content-Type", contentType);
    res.set("X-Content-Type-Options", "nosniff");
    // A photo reference names one immutable image, and every miss here is a billed Google call - so this caches far harder than server/photos.js's private, max-age=3600.
    res.set("Cache-Control", "private, max-age=604800, immutable");
    res.end(body);
  } catch (err) {
    console.error("GET /api/venues/photo failed", err.message);
    res.status(502).json({ error: "Failed to load venue photo." });
  }
});

// City/region suggestions for the location/hometown autocomplete fields - no auth (see requireAuth's comment above), rate-limited, and short-circuits on short input before ever calling Google.
router.get("/places/autocomplete", autocompleteRateLimit, async (req, res) => {
  const input = typeof req.query.input === "string" ? req.query.input.trim() : "";
  if (input.length < MIN_AUTOCOMPLETE_INPUT_LENGTH) {
    res.json([]);
    return;
  }

  try {
    const data = await callPlacesApi(
      "autocomplete",
      { input, includedPrimaryTypes: ["locality"] },
      "suggestions.placePrediction.placeId,suggestions.placePrediction.text"
    );

    const suggestions = (data.suggestions ?? [])
      .map((entry) => entry.placePrediction)
      .filter(Boolean)
      .map((prediction) => ({ placeId: prediction.placeId, description: prediction.text?.text ?? "" }));

    res.json(suggestions);
  } catch (err) {
    console.error("GET /api/places/autocomplete failed", err);
    res.status(502).json({ error: "Failed to load city suggestions." });
  }
});

module.exports = { router, fetchPlaceCoordinates };
