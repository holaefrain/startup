// Every chevron in the app - Chat's three scroll rails, Discover's field card and Discover's photo carousel - so the same arrow is never drawn four slightly different ways, the same reason ProfileIcons.jsx exists. Sizes to the button around it rather than to a font, so it can't drift with the type scale.

const PATHS = {
  up: "M3 17 16 4l13 13",
  down: "M3 3 16 16l13-13",
  left: "M17 3 4 16l13 13",
  right: "M3 3 16 16 3 29",
};

export default function ChevronIcon({ direction }) {
  // Left/right are the same shape rotated, so they need the taller viewBox rather than a transform.
  const horizontal = direction === "left" || direction === "right";

  return (
    <svg
      viewBox={horizontal ? "0 0 20 32" : "0 0 32 20"}
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[direction]} />
    </svg>
  );
}
