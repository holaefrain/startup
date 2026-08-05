// The app's dismissal cross - Discover's pass button and Profile's photo remove - so the same X is never drawn two slightly different ways, the same reason ChevronIcon.jsx exists. Carries no size of its own: it takes the button around it rather than a font, so it can't drift with the type scale.

export default function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4 20 20M20 4 4 20" />
    </svg>
  );
}
