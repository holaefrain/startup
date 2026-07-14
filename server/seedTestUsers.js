const fs = require("fs");
const path = require("path");

// Seeds 10 fake profiles (5 female, 5 male) through the real POST /api/signup
// route - not a direct Mongo insert - so they go through the exact same
// validation, S3 upload, and document shape as a real signup. Requires the
// Express server to already be running (`npm run server`).

const API_URL = process.env.SEED_API_URL || "http://localhost:3000/api/signup";
const IMG_DIR = path.join(__dirname, "../src/assets/img");
const PHOTO_FILES = ["homepage1.jpg", "homepage2.jpg", "homepage3.jpeg"];

// Duplicated from src/pages/Signup/dateUtils.js (an ES module; this seed
// script is CommonJS) so seeded users get the same age/zodiac the real
// signup wizard would compute client-side.
const ZODIAC_CUTOFFS = [
  { sign: "Capricorn", month: 1, day: 19 },
  { sign: "Aquarius", month: 2, day: 18 },
  { sign: "Pisces", month: 3, day: 20 },
  { sign: "Aries", month: 4, day: 19 },
  { sign: "Taurus", month: 5, day: 20 },
  { sign: "Gemini", month: 6, day: 20 },
  { sign: "Cancer", month: 7, day: 22 },
  { sign: "Leo", month: 8, day: 22 },
  { sign: "Virgo", month: 9, day: 22 },
  { sign: "Libra", month: 10, day: 22 },
  { sign: "Scorpio", month: 11, day: 21 },
  { sign: "Sagittarius", month: 12, day: 21 },
];

function getZodiacSign(birthday) {
  const [, month, day] = birthday.split("-").map(Number);
  const match = ZODIAC_CUTOFFS.find(
    (entry) => month < entry.month || (month === entry.month && day <= entry.day)
  );
  return match ? match.sign : "Capricorn";
}

function getAge(birthday) {
  const [year, month, day] = birthday.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  const hasHadBirthdayThisYear =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

const PROFILES = [
  {
    first_name: "Ava", last_name: "Martinez", birthday: "1997-03-14",
    email: "ava.martinez@example.com", phone: "+18015551001",
    pronouns: "she_her", gender: "female", sexuality: "heterosexual", interested_in: "men",
    job_title: "Graphic Designer", school: "University of Utah", education_level: "bachelors",
    religion: "catholic", hometown: "Salt Lake City, UT", politics: "moderate",
    languages: "English, Spanish", dating_intentions: "long_term", relationship_type: "monogamy",
    height: "65", location: "Salt Lake City, UT", ethnicity: "hispanic_latino",
    children: "dont_have_children", family_plans: "want_children", pets: "dog",
  },
  {
    first_name: "Sophia", last_name: "Chen", birthday: "1994-07-22",
    email: "sophia.chen@example.com", phone: "+18015551002",
    pronouns: "she_her", gender: "female", sexuality: "bisexual", interested_in: "everyone",
    job_title: "Software Engineer", school: "BYU", education_level: "masters",
    religion: "agnostic", hometown: "Provo, UT", politics: "liberal",
    languages: "English, Mandarin", dating_intentions: "life_partner", relationship_type: "monogamy",
    height: "63", location: "Provo, UT", ethnicity: "asian",
    children: "dont_have_children", family_plans: "not_sure", pets: "cat",
  },
  {
    first_name: "Isabella", last_name: "Johnson", birthday: "2000-11-02",
    email: "isabella.johnson@example.com", phone: "+18015551003",
    pronouns: "she_her", gender: "female", sexuality: "heterosexual", interested_in: "men",
    job_title: "Nurse", school: "Utah Valley University", education_level: "bachelors",
    religion: "christian", hometown: "Ogden, UT", politics: "conservative",
    languages: "English", dating_intentions: "short_term_open_long", relationship_type: "monogamy",
    height: "67", location: "Ogden, UT", ethnicity: "white",
    children: "dont_have_children", family_plans: "want_children", pets: "dog_and_cat",
  },
  {
    first_name: "Maya", last_name: "Patel", birthday: "1996-01-30",
    email: "maya.patel@example.com", phone: "+18015551004",
    pronouns: "she_her", gender: "female", sexuality: "pansexual", interested_in: "everyone",
    job_title: "Marketing Manager", school: "University of Utah", education_level: "bachelors",
    religion: "hindu", hometown: "Sandy, UT", politics: "moderate",
    languages: "English, Hindi, Gujarati", dating_intentions: "long_term_open_short", relationship_type: "non_monogamy",
    height: "64", location: "Sandy, UT", ethnicity: "south_asian",
    children: "dont_have_children", family_plans: "open_to_children", pets: "pet_free",
  },
  {
    first_name: "Grace", last_name: "Williams", birthday: "1999-05-18",
    email: "grace.williams@example.com", phone: "+18015551005",
    pronouns: "she_her", gender: "female", sexuality: "homosexual", interested_in: "women",
    job_title: "Teacher", school: "Weber State University", education_level: "bachelors",
    religion: "spiritual", hometown: "Logan, UT", politics: "liberal",
    languages: "English", dating_intentions: "figuring_out", relationship_type: "figuring_out",
    height: "66", location: "Logan, UT", ethnicity: "black",
    children: "dont_have_children", family_plans: "not_sure", pets: "want_a_pet",
  },
  {
    first_name: "Ethan", last_name: "Brooks", birthday: "1995-09-09",
    email: "ethan.brooks@example.com", phone: "+18015551006",
    pronouns: "he_him", gender: "male", sexuality: "heterosexual", interested_in: "women",
    job_title: "Civil Engineer", school: "Utah State University", education_level: "bachelors",
    religion: "christian", hometown: "Layton, UT", politics: "conservative",
    languages: "English", dating_intentions: "long_term", relationship_type: "monogamy",
    height: "71", location: "Layton, UT", ethnicity: "white",
    children: "dont_have_children", family_plans: "want_children", pets: "dog",
  },
  {
    first_name: "Daniel", last_name: "Kim", birthday: "1993-12-25",
    email: "daniel.kim@example.com", phone: "+18015551007",
    pronouns: "he_him", gender: "male", sexuality: "heterosexual", interested_in: "women",
    job_title: "Product Manager", school: "BYU", education_level: "masters",
    religion: "agnostic", hometown: "Provo, UT", politics: "moderate",
    languages: "English, Korean", dating_intentions: "life_partner", relationship_type: "monogamy",
    height: "69", location: "Provo, UT", ethnicity: "asian",
    children: "dont_have_children", family_plans: "want_children", pets: "cat",
  },
  {
    first_name: "Marcus", last_name: "Turner", birthday: "1998-04-11",
    email: "marcus.turner@example.com", phone: "+18015551008",
    pronouns: "he_him", gender: "male", sexuality: "bisexual", interested_in: "everyone",
    job_title: "Personal Trainer", school: "Salt Lake Community College", education_level: "associates",
    religion: "other", hometown: "West Jordan, UT", politics: "not_political",
    languages: "English", dating_intentions: "short_term", relationship_type: "non_monogamy",
    height: "73", location: "West Jordan, UT", ethnicity: "black",
    children: "dont_have_children", family_plans: "open_to_children", pets: "dog",
  },
  {
    first_name: "Omar", last_name: "Hassan", birthday: "1990-02-17",
    email: "omar.hassan@example.com", phone: "+18015551009",
    pronouns: "he_him", gender: "male", sexuality: "heterosexual", interested_in: "women",
    job_title: "Restaurant Owner", school: "Salt Lake Community College", education_level: "trade_school",
    religion: "muslim", hometown: "Draper, UT", politics: "moderate",
    languages: "English, Arabic", dating_intentions: "long_term", relationship_type: "monogamy",
    height: "70", location: "Draper, UT", ethnicity: "middle_eastern",
    children: "have_children", family_plans: "open_to_children", pets: "pet_free",
  },
  {
    first_name: "Noah", last_name: "Garcia", birthday: "1997-08-08",
    email: "noah.garcia@example.com", phone: "+18015551010",
    pronouns: "he_him", gender: "male", sexuality: "homosexual", interested_in: "men",
    job_title: "Nurse", school: "University of Utah", education_level: "bachelors",
    religion: "catholic", hometown: "Murray, UT", politics: "liberal",
    languages: "English, Spanish", dating_intentions: "figuring_out", relationship_type: "figuring_out",
    height: "68", location: "Murray, UT", ethnicity: "hispanic_latino",
    children: "dont_have_children", family_plans: "not_sure", pets: "allergic",
  },
];

function loadPhotoBuffers() {
  return PHOTO_FILES.map((filename) => ({
    filename,
    buffer: fs.readFileSync(path.join(IMG_DIR, filename)),
    type: filename.endsWith(".png") ? "image/png" : "image/jpeg",
  }));
}

async function seedProfile(profile, photoFiles) {
  const body = new FormData();
  const fields = {
    ...profile,
    age: String(getAge(profile.birthday)),
    zodiac_sign: getZodiacSign(profile.birthday),
  };

  Object.entries(fields).forEach(([key, value]) => {
    if (value) body.append(key, value);
  });

  photoFiles.forEach(({ filename, buffer, type }) => {
    body.append("photos", new Blob([buffer], { type }), filename);
  });

  const response = await fetch(API_URL, { method: "POST", body });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to seed ${profile.first_name} ${profile.last_name}: ${data.error}`);
  }
  return data.userId;
}

async function main() {
  const photoFiles = loadPhotoBuffers();
  for (const profile of PROFILES) {
    const userId = await seedProfile(profile, photoFiles);
    console.log(`Created ${profile.first_name} ${profile.last_name} (${profile.gender}) -> ${userId}`);
  }
  console.log(`Seeded ${PROFILES.length} test users.`);
}

main().catch((error) => {
  console.error("Seeding failed:", error.message);
  process.exit(1);
});
