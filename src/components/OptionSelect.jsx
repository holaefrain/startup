// Single source of truth for every profile field that's a dropdown instead of free text -
// shared by the Signup step components and Profile.jsx's edit UI so the two can't drift
// out of sync (a value picked at signup always has a matching label when shown back in Profile).
export const FIELD_OPTIONS = {
  pronouns: [
    { value: "she_her", label: "She / Her" },
    { value: "he_him", label: "He / Him" },
    { value: "they_them", label: "They / Them" },
    { value: "ze_zir", label: "Ze / Zir" },
    { value: "other", label: "Other" },
    { value: "prefer_not", label: "Prefer not to say" },
  ],
  gender: [
    { value: "female", label: "Female" },
    { value: "male", label: "Male" },
    { value: "nonbinary", label: "Non-binary" },
    { value: "trans", label: "Transgender" },
    { value: "other", label: "Other" },
    { value: "prefer_not", label: "Prefer not to say" },
  ],
  sexuality: [
    { value: "heterosexual", label: "Heterosexual / Straight" },
    { value: "homosexual", label: "Homosexual / Gay" },
    { value: "bisexual", label: "Bisexual" },
    { value: "pansexual", label: "Pansexual" },
    { value: "asexual", label: "Asexual" },
    { value: "other", label: "Other" },
    { value: "prefer_not", label: "Prefer not to say" },
  ],
  interested_in: [
    { value: "women", label: "Women" },
    { value: "men", label: "Men" },
    { value: "nonbinary", label: "Non-binary people" },
    { value: "everyone", label: "Everyone" },
    { value: "other", label: "Other" },
    { value: "prefer_not", label: "Prefer not to say" },
  ],
  // 4'6" to 7'0", stored as total inches (string) to match how MoreInfoStep always has.
  height: Array.from({ length: 31 }, (_, index) => {
    const totalInches = 54 + index;
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return { value: String(totalInches), label: `${feet}'${inches}"` };
  }),
  ethnicity: [
    { value: "asian", label: "Asian" },
    { value: "black", label: "Black / African descent" },
    { value: "hispanic_latino", label: "Hispanic / Latino" },
    { value: "middle_eastern", label: "Middle Eastern" },
    { value: "native_american", label: "Native American" },
    { value: "pacific_islander", label: "Pacific Islander" },
    { value: "south_asian", label: "South Asian" },
    { value: "white", label: "White / Caucasian" },
    { value: "multiracial", label: "Multiracial" },
    { value: "other", label: "Other" },
    { value: "prefer_not", label: "Prefer not to say" },
  ],
  children: [
    { value: "have_children", label: "Have children" },
    { value: "dont_have_children", label: "Don't have children" },
    { value: "prefer_not", label: "Prefer not to say" },
  ],
  family_plans: [
    { value: "want_children", label: "Want children" },
    { value: "dont_want_children", label: "Don't want children" },
    { value: "open_to_children", label: "Open to children" },
    { value: "not_sure", label: "Not sure yet" },
    { value: "prefer_not", label: "Prefer not to say" },
  ],
  pets: [
    { value: "dog", label: "Dog" },
    { value: "cat", label: "Cat" },
    { value: "dog_and_cat", label: "Dog and cat" },
    { value: "other_pet", label: "Other pet" },
    { value: "pet_free", label: "Pet-free" },
    { value: "want_a_pet", label: "Want a pet" },
    { value: "allergic", label: "Allergic to pets" },
  ],
  education_level: [
    { value: "high_school", label: "High school" },
    { value: "some_college", label: "Some college" },
    { value: "associates", label: "Associate's degree" },
    { value: "bachelors", label: "Bachelor's degree" },
    { value: "masters", label: "Master's degree" },
    { value: "phd", label: "PhD / Doctorate" },
    { value: "trade_school", label: "Trade school" },
    { value: "prefer_not", label: "Prefer not to say" },
  ],
  religion: [
    { value: "agnostic", label: "Agnostic" },
    { value: "atheist", label: "Atheist" },
    { value: "buddhist", label: "Buddhist" },
    { value: "catholic", label: "Catholic" },
    { value: "christian", label: "Christian" },
    { value: "hindu", label: "Hindu" },
    { value: "jewish", label: "Jewish" },
    { value: "muslim", label: "Muslim" },
    { value: "spiritual", label: "Spiritual" },
    { value: "other", label: "Other" },
    { value: "prefer_not", label: "Prefer not to say" },
  ],
  politics: [
    { value: "liberal", label: "Liberal" },
    { value: "moderate", label: "Moderate" },
    { value: "conservative", label: "Conservative" },
    { value: "not_political", label: "Not political" },
    { value: "other", label: "Other" },
    { value: "prefer_not", label: "Prefer not to say" },
  ],
  dating_intentions: [
    { value: "life_partner", label: "Life partner" },
    { value: "long_term", label: "Long-term relationship" },
    { value: "long_term_open_short", label: "Long-term, open to short" },
    { value: "short_term_open_long", label: "Short-term, open to long" },
    { value: "short_term", label: "Short-term fun" },
    { value: "figuring_out", label: "Figuring out my intentions" },
    { value: "prefer_not", label: "Prefer not to say" },
  ],
  relationship_type: [
    { value: "monogamy", label: "Monogamy" },
    { value: "non_monogamy", label: "Non-monogamy" },
    { value: "figuring_out", label: "Figuring out my relationship type" },
    { value: "prefer_not", label: "Prefer not to say" },
  ],
};

// Looks up the friendly label for a stored value - falls back to the raw value itself for
// fields with no FIELD_OPTIONS entry (or a value that doesn't match any known option).
export function optionLabel(field, value) {
  const match = FIELD_OPTIONS[field]?.find((option) => option.value === value);
  return match ? match.label : value;
}

// Generic dropdown for any field in FIELD_OPTIONS - callers pass their own id/name/value/onChange
// (plus `required` where signup needs it) exactly like a plain <select>, so it drops into both
// Signup's always-visible fields and Profile's click-to-edit rows without either bending to fit.
export default function OptionSelect({ field, placeholder, ...selectProps }) {
  const options = FIELD_OPTIONS[field] ?? [];
  return (
    <select {...selectProps}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
