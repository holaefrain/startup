import { useEffect, useRef, useState } from "react";
import { REPORT_REASONS } from "../constants/reportReasons.js";
import "./ReportDialog.css";

// One dialog for all three places a report can start - Discover's card, a Chat thread, and the Settings page - so the questions asked, the wording, and what happens afterward can't differ depending on where someone was standing when they decided to report.
// `context` is passed straight through to the server, which stores it so a reviewer knows where to look; it never affects what this component asks.
export default function ReportDialog({ person, context, onClose, onReported }) {
  const dialogRef = useRef(null);
  const [reason, setReason] = useState(REPORT_REASONS[0].id);
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const name = [person?.first_name, person?.last_name].filter(Boolean).join(" ") || "this account";

  // showModal() rather than the `open` attribute: it's what puts the dialog in the top layer, traps focus inside it, and makes Escape work - none of which the attribute alone does.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function submit(event) {
    event.preventDefault();
    setSending(true);
    setError("");

    fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedUserId: person.id, reason, details, block, context }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Couldn't send that report.");
        }
        return response.json();
      })
      .then((result) => {
        // Closed from here rather than by the form's own dialog submit, so the dialog stays put with its message if the request failed.
        dialogRef.current?.close();
        onReported?.(result.blocked);
      })
      .catch((problem) => setError(problem.message))
      .finally(() => setSending(false));
  }

  return (
    // onClose covers Escape as well as close() - without it, dismissing with the keyboard would leave the parent still rendering a dialog the browser has already hidden.
    <dialog ref={dialogRef} className="app-dialog" onClose={onClose}>
      <form className="app-dialog-body" onSubmit={submit}>
        <h2 className="app-dialog-title">Report {name}</h2>
        <p className="app-dialog-lede">
          A reviewer reads this, usually within a day. <b>{name} is never notified</b>, and never sees your name.
        </p>

        <fieldset className="report-reasons">
          <legend className="app-dialog-label">Reason</legend>
          {REPORT_REASONS.map((option) => (
            <label key={option.id}>
              <input
                type="radio"
                name="reason"
                value={option.id}
                checked={reason === option.id}
                onChange={() => setReason(option.id)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <label className="app-dialog-field">
          <span className="app-dialog-label">What happened (optional)</span>
          <textarea
            value={details}
            maxLength={2000}
            placeholder="Anything that helps the reviewer understand."
            onChange={(event) => setDetails(event.target.value)}
          />
        </label>

        <label className="report-check">
          <input type="checkbox" checked={block} onChange={(event) => setBlock(event.target.checked)} />
          <span>
            Also block {name} — you'll stop seeing each other in Discover and Chat right away.
          </span>
        </label>

        {error && (
          <p role="alert" className="app-dialog-error">
            {error}
          </p>
        )}

        <div className="app-dialog-actions">
          <button type="button" className="app-dialog-cancel" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
          <button type="submit" className="app-dialog-submit" disabled={sending}>
            {sending ? "Sending..." : "Send report"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
