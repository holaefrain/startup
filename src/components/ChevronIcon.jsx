// The scroll rail's arrow, shared by Chat's three rails and Discover's field card so the same control is never drawn two different ways - the same reason ProfileIcons.jsx exists. Sizes to the .scroll-chev button around it rather than to a font, so it can't drift with the type scale.

export default function ChevronIcon({ direction }) {
  return (
    <svg viewBox="0 0 32 20" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === "up" ? "M3 17 16 4l13 13" : "M3 3 16 16l13-13"} />
    </svg>
  );
}
