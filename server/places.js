const express = require("express");
const rateLimit = require("express-rate-limit");
const { getAuthenticatedUser } = require("./authHelpers");

const PLACES_API_ROOT = "https://places.googleapis.com/v1/places";
const MIN_AUTOCOMPLETE_INPUT_LENGTH = 2;

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
async function callPlacesApi(action, body, fieldMask) {
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

// Nearby venue suggestions for Chat.jsx's "Plan a date" - auth required, real coordinates from the caller's own browser geolocation.
router.get("/venues", requireAuth, async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
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
      "places.displayName,places.formattedAddress"
    );

    const venues = (data.places ?? []).map((place) => ({
      name: place.displayName?.text ?? "Unknown",
      detail: place.formattedAddress ?? "",
    }));
    res.json(venues);
  } catch (err) {
    console.error("GET /api/venues failed", err);
    res.status(502).json({ error: "Failed to load nearby venues." });
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

module.exports = router;
