// Each entry is the *end* cutoff of a sign; a date belongs to the first
// entry whose cutoff it falls on or before. Dates after Dec 21 fall through
// to Capricorn (Dec 22-31).
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

export function getZodiacSign(birthday) {
  const [, month, day] = birthday.split("-").map(Number);
  const match = ZODIAC_CUTOFFS.find(
    (entry) => month < entry.month || (month === entry.month && day <= entry.day)
  );
  return match ? match.sign : "Capricorn";
}

export function getAge(birthday) {
  const [year, month, day] = birthday.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  const hasHadBirthdayThisYear =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}
