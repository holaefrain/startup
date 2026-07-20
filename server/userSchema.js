// Shape of a `users` document, written in one insert from the signup
// wizard's final submit (src/pages/Signup/Signup.jsx):
//
// {
//   _id: ObjectId,
//   first_name, last_name, birthday, email, phone,
//   pronouns, gender, sexuality, interested_in,
//   job_title, school, education_level, religion,
//   hometown, politics, languages,
//   dating_intentions, relationship_type,
//   height, location, ethnicity, children,
//   family_plans, pets, age, zodiac_sign,
//   photoKeys: [String],
//   registered: Boolean, // false at signup, flipped true by POST /api/auth
//   createdAt: Date,
//   password: String,  // bcrypt hash, set by POST /api/auth (server/auth.js)
//   token: String,     // current session token, set by POST/PUT /api/auth
// }
//
// `password`, `token`, and `registered` are intentionally NOT in USER_FIELDS
// - they're written directly by server/auth.js or server/index.js's signup
// handler, not through this endpoint's client-controlled body, so a signup
// request can never smuggle in a pre-hashed password, hijack a session
// token, or mark itself already-registered. `registered: false` also backs
// a TTL index (server/index.js) that auto-expires abandoned bare profiles
// instead of a later request being able to overwrite/reuse them - see the
// signup handler's comments for why that reuse approach was rejected.

const USER_FIELDS = [
  "first_name",
  "last_name",
  "birthday",
  "email",
  "phone",
  "pronouns",
  "gender",
  "sexuality",
  "interested_in",
  "job_title",
  "school",
  "education_level",
  "religion",
  "hometown",
  "politics",
  "languages",
  "dating_intentions",
  "relationship_type",
  "height",
  "location",
  "ethnicity",
  "children",
  "family_plans",
  "pets",
  "age",
  "zodiac_sign",
];

// Subset of USER_FIELDS that PATCH /api/profile (server/profile.js) allows editing after signup - deliberately excludes `email` and `phone`, which each now have a partial unique index, and `birthday`, which Profile.jsx never shows (it shows the computed `age` instead); matches src/pages/Profile/Profile.jsx's FIELD_GROUPS keys exactly.
const PROFILE_EDITABLE_FIELDS = [
  "first_name",
  "last_name",
  "age",
  "height",
  "location",
  "ethnicity",
  "children",
  "family_plans",
  "pets",
  "zodiac_sign",
  "pronouns",
  "gender",
  "sexuality",
  "interested_in",
  "job_title",
  "school",
  "education_level",
  "religion",
  "hometown",
  "politics",
  "languages",
  "dating_intentions",
  "relationship_type",
];

// Further subset of PROFILE_EDITABLE_FIELDS whose visibility can be toggled - excludes `first_name`/`last_name`/`age`/`height`/`location` (locked "Always Visible" in Profile.jsx) and `interested_in` (locked "Always Hidden").
const VISIBILITY_FIELDS = [
  "ethnicity",
  "children",
  "family_plans",
  "pets",
  "zodiac_sign",
  "pronouns",
  "gender",
  "sexuality",
  "job_title",
  "school",
  "education_level",
  "religion",
  "hometown",
  "politics",
  "languages",
  "dating_intentions",
  "relationship_type",
];

// Allow-list a request body against a known set of fields instead of spreading it directly into a Mongo insert, so a client can't smuggle arbitrary fields into the document.
function pickFields(source, allowedFields) {
  const result = {};
  for (const field of allowedFields) {
    if (source[field] !== undefined) {
      result[field] = source[field];
    }
  }
  return result;
}

module.exports = { USER_FIELDS, PROFILE_EDITABLE_FIELDS, VISIBILITY_FIELDS, pickFields };
