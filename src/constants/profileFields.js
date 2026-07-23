// Single source of truth for every profile field's display label/group - shared by Profile.jsx's editable list and Discover.jsx's read-only card so a label change can't drift between the two.
export const PROFILE_FIELD_GROUPS = [
  {
    title: "My Vitals",
    fields: [
      { key: "first_name", label: "First Name", locked: "visible" },
      { key: "last_name", label: "Last Name", locked: "visible" },
      { key: "age", label: "Age", locked: "visible" },
      { key: "height", label: "Height", locked: "visible" },
      { key: "location", label: "Location", locked: "visible" },
      { key: "ethnicity", label: "Ethnicity" },
      { key: "children", label: "Children" },
      { key: "family_plans", label: "Family Plans" },
      { key: "pets", label: "Pets" },
      { key: "zodiac_sign", label: "Zodiac Sign" },
    ],
  },
  {
    title: "Identity",
    fields: [
      { key: "pronouns", label: "Pronouns" },
      { key: "gender", label: "Gender" },
      { key: "sexuality", label: "Sexuality" },
      { key: "interested_in", label: "I'm interested in", locked: "hidden" },
    ],
  },
  {
    title: "My Virtues",
    fields: [
      { key: "job_title", label: "Job Title" },
      { key: "school", label: "School" },
      { key: "education_level", label: "Education Level" },
      { key: "religion", label: "Religious Beliefs" },
      { key: "hometown", label: "Hometown" },
      { key: "politics", label: "Politics" },
      { key: "languages", label: "Languages Spoken" },
      { key: "dating_intentions", label: "Dating Intentions" },
      { key: "relationship_type", label: "Relationship Type" },
    ],
  },
];

export const ALL_PROFILE_FIELDS = PROFILE_FIELD_GROUPS.flatMap((group) => group.fields);
