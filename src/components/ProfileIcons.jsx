// The three at-a-glance profile facts, shared by Discover's card and Chat's profile view so the same fact is never drawn two different ways. Each sizes to 1em, so it takes the type size of whatever row it sits in.

export function AgeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 3 L19 20 L5 20 Z" strokeLinejoin="round" />
      <circle cx="12" cy="3" r="1.4" fill="currentColor" stroke="none" />
      <path d="M5 20 H19" />
    </svg>
  );
}

export function HeightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="9" y="2" width="6" height="20" rx="1" />
      <path d="M9 6 H12 M9 10 H13 M9 14 H12 M9 18 H13" />
    </svg>
  );
}

export function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 21s7-7.58 7-12a7 7 0 1 0-14 0c0 4.42 7 12 7 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="2.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
