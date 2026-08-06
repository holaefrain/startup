import { useEffect, useRef, useState } from "react";
import "./DeleteAccountDialog.css";

// The word someone has to type. Deliberately not localised and not case-insensitive: the whole point of the gate is that it can't be cleared by reflex, and a field that accepts "delete" is one an autofill or a distracted return-press can satisfy.
const CONFIRM_WORD = "DELETE";

// Two independent gates rather than one. The typed word proves the intent was read; the password proves it's the account holder and not someone who found an unlocked laptop. Either alone leaves a way to lose an account you didn't mean to.
export default function DeleteAccountDialog({ photoCount, onClose, onDeleted }) {
  const dialogRef = useRef(null);
  const [word, setWord] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const ready = word.trim() === CONFIRM_WORD && password.length > 0;

  function submit(event) {
    event.preventDefault();
    if (!ready) return;
    setDeleting(true);
    setError("");

    fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: password }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Couldn't delete your account.");
        }
        return response.json();
      })
      .then(() => {
        // Not closed first: the parent navigates away on this callback, and closing the dialog beforehand would flash the Settings page underneath before the redirect lands.
        onDeleted();
      })
      .catch((problem) => {
        setError(problem.message);
        setDeleting(false);
      });
  }

  return (
    <dialog ref={dialogRef} className="app-dialog" onClose={onClose}>
      <form className="app-dialog-body" onSubmit={submit}>
        <h2 className="app-dialog-title">Delete your account</h2>
        <p className="app-dialog-lede">
          This erases everything below and <b>cannot be undone</b>. There is no grace period and no way to recover it
          afterward.
        </p>

        {/* Named as a list rather than a sentence: someone deciding this needs to see whether the one thing they'd regret is on it, and prose is the wrong shape for scanning. Only the photo count is stated, because it's the one number the page actually knows - inventing the others would be worse than leaving them off. */}
        <ul className="delete-loss">
          <li>Your profile and every detail on it</li>
          <li>{photoCount === 1 ? "Your 1 photo" : `Your ${photoCount} photos`}</li>
          <li>Every match, and every message in those conversations</li>
          <li>Everyone you've liked or passed on</li>
        </ul>

        <div className="app-dialog-field">
          <label className="app-dialog-label" htmlFor="delete-word">
            Type {CONFIRM_WORD} to confirm
          </label>
          <input
            id="delete-word"
            type="text"
            autoComplete="off"
            value={word}
            placeholder={CONFIRM_WORD}
            onChange={(event) => setWord(event.target.value)}
          />
        </div>

        <div className="app-dialog-field">
          <label className="app-dialog-label" htmlFor="delete-password">
            Your password
          </label>
          <input
            id="delete-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="app-dialog-error">
            {error}
          </p>
        )}

        <div className="app-dialog-actions">
          {/* The safe choice is the one that says what it does, and it's first - the destructive button shouldn't be where a reflex press lands. */}
          <button type="button" className="app-dialog-cancel" onClick={() => dialogRef.current?.close()}>
            Keep my account
          </button>
          <button type="submit" className="app-dialog-submit delete-go" disabled={!ready || deleting}>
            {deleting ? "Deleting..." : "Delete forever"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
