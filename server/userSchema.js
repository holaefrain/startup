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
//   createdAt: Date,
// }
//
// `password` is intentionally NOT in USER_FIELDS and never persisted here.
// Storing it plaintext would be a real vulnerability, and hashing it
// properly (bcrypt) belongs to the auth/Service deliverable, not this step
// - the client doesn't even send it to this endpoint.

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

// Allow-list a request body against a known set of fields instead of
// spreading it directly into a Mongo insert, so a client can't smuggle
// arbitrary fields into the document.
function pickFields(source, allowedFields) {
  const result = {};
  for (const field of allowedFields) {
    if (source[field] !== undefined) {
      result[field] = source[field];
    }
  }
  return result;
}

module.exports = { USER_FIELDS, pickFields };
