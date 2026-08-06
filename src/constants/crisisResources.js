// Single source of truth for the Settings page's crisis section, kept as data rather than markup for the same reason PROFILE_FIELD_GROUPS is: a number that changes should change in one place. Deliberately free of any auth or fetch dependency - this list has to render even when /api/user/me is still loading or has failed outright, which is the moment someone is least able to go hunting for a number.
// US lines only. `note` below says so rather than the list quietly implying it covers everyone.
export const CRISIS_NOTE =
  "Free, confidential, and open 24 hours. These are US lines — outside the US, findahelpline.com lists local equivalents.";

// `actions` is ordered by how fast it gets someone to a person: a line that answers a text sooner than a call lists the text first.
export const CRISIS_RESOURCES = [
  {
    name: "988 Suicide & Crisis Lifeline",
    description: "Any kind of emotional crisis, not only suicide.",
    actions: [
      { label: "Call 988", href: "tel:988" },
      { label: "Text 988", href: "sms:988" },
    ],
  },
  {
    name: "Crisis Text Line",
    description: "Message a trained counselor if you'd rather not speak out loud.",
    actions: [{ label: "Text HOME to 741741", href: "sms:741741?&body=HOME" }],
  },
  {
    name: "RAINN Sexual Assault Hotline",
    description: "Support after an assault, whenever it happened.",
    actions: [{ label: "Call 800-656-4673", href: "tel:18006564673" }],
  },
  {
    name: "National Domestic Violence Hotline",
    description: "Safety planning and support for abusive relationships.",
    actions: [
      { label: "Call 800-799-7233", href: "tel:18007997233" },
      { label: "Text START to 88788", href: "sms:88788?&body=START" },
    ],
  },
  {
    name: "The Trevor Project",
    description: "Crisis support for LGBTQ+ young people.",
    actions: [{ label: "Call 1-866-488-7386", href: "tel:18664887386" }],
  },
];
