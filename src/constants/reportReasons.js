// Must stay in step with REPORT_REASONS in server/safety.js, which allow-lists the same seven ids - the server rejects anything outside that set, so a value added here alone would fail at submit with a message about choosing a reason, which reads as a bug rather than as the mismatch it is.
// Ordered by how often each is the real answer rather than by severity: the first two cover most reports, and "Something else" stays last because it's the fallback, not a category.
export const REPORT_REASONS = [
  { id: "harassment", label: "Harassment" },
  { id: "fake", label: "Fake profile" },
  { id: "photos", label: "Inappropriate photos" },
  { id: "scam", label: "Spam or scam" },
  { id: "underage", label: "Underage" },
  { id: "safety", label: "Safety concern" },
  { id: "other", label: "Something else" },
];
