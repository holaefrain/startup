const express = require("express");
const rateLimit = require("express-rate-limit");
const { getAuthenticatedUser } = require("./authHelpers");

const PLACES_API_ROOT = "https://places.googleapis.com/v1/places";
const MIN_AUTOCOMPLETE_INPUT_LENGTH = 2;

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
