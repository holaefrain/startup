import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppNav from "../../components/AppNav.jsx";
import ChevronIcon from "../../components/ChevronIcon.jsx";
import ReportDialog from "../../components/ReportDialog.jsx";
import DeleteAccountDialog from "../../components/DeleteAccountDialog.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useDiscoverMode } from "../../context/DiscoverModeContext.jsx";
import { CRISIS_NOTE, CRISIS_RESOURCES } from "../../constants/crisisResources.js";
import "./Settings.css";

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
// Two rows a press rather than Profile's three: these rows carry a second line of explanation under most labels, so one row here is roughly the height of two there.
const ROWS_PER_PRESS = 2;

// The groups in column order. Kept as data so the jump list and the sections themselves can't fall out of step - adding a group is one entry, not two lists to remember.
const SETTINGS_GROUPS = [
  { id: "account", title: "Account" },
  { id: "discovery", title: "Discovery" },
  { id: "safety", title: "Safety" },
  { id: "crisis", title: "Crisis support" },
  { id: "legal", title: "Legal & data" },
  { id: "danger", title: "Danger zone" },
];

// The main photo stands in for you here the same way it does on every Chat row and in Discover's match overlay - index 0, which Profile.jsx badges "Main" for exactly this reason. Drawn rather than fetched when there's no photo yet: /api/photos/:userId/0 404s on an empty photoKeys, and a broken <img> is a worse empty state than a mark that was always meant to be one.
function FaceMark() {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="#2c4a52" strokeWidth="4" aria-hidden="true">
      <circle cx="50" cy="37" r="17" />
      <path d="M18 90c0-18 14-29 32-29s32 11 32 29" strokeLinecap="round" />
    </svg>
  );
}

// Every row on this page is label + control, so the row itself is a component rather than four lines of markup repeated twenty times. `hint` is the second line under the label; omitting it is what makes a row single-line.
function SettingsRow({ label, hint, children }) {
  return (
    <div className="settings-row">
      <dt className="settings-label">
        {label}
        {hint && <small>{hint}</small>}
      </dt>
      <dd className="settings-control">{children}</dd>
    </div>
  );
}

// The same switch AppNav's real/demo toggle and Profile's visibility columns use - one component, so "on" looks identical wherever the app asks a yes/no question.
function SettingsSwitch({ checked, label, onClick, disabled }) {
  return (
    <button
      type="button"
      className="settings-switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="switch-track" aria-hidden="true">
        <span className="switch-knob" />
      </span>
    </button>
  );
}

// React Deilverable Part 1: Components
export default function Settings() {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const { mode, toggleMode, resetDemoMode, resetting } = useDiscoverMode();
  const groupsRef = useRef(null);
  // Which chevrons are still worth pressing. Both true when the column doesn't overflow at all, which disables the pair rather than leaving two controls that do nothing.
  const [groupEdges, setGroupEdges] = useState({ atStart: true, atEnd: true });
  const [currentGroup, setCurrentGroup] = useState(SETTINGS_GROUPS[0].id);
  // null until seeded from `user` below, the same way Profile.jsx seeds its field values - seeded once rather than re-synced on every refreshUser(), since the optimistic update in togglePause already keeps this accurate.
  const [paused, setPaused] = useState(null);
  const [pauseError, setPauseError] = useState("");
  // null while loading, [] once loaded and empty - the two render differently, so they can't share a value.
  const [blocked, setBlocked] = useState(null);
  const [blockError, setBlockError] = useState("");
  // The match picked from the fallback list, or null when the dialog is closed. Settings has no profile in front of it, so unlike Discover and Chat it has to ask who first.
  const [reportTarget, setReportTarget] = useState(null);
  const [matches, setMatches] = useState(null);
  const [pickingReport, setPickingReport] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasPhoto = (user?.photoKeys?.length ?? 0) > 0;

  function syncGroupEdges() {
    const column = groupsRef.current;
    if (!column) {
      setGroupEdges({ atStart: true, atEnd: true });
      return;
    }
    const furthest = column.scrollHeight - column.clientHeight;
    setGroupEdges({ atStart: column.scrollTop <= 1, atEnd: column.scrollTop >= furthest - 1 });

    // Whichever group's heading currently sits nearest the top of the column is the one the jump list marks.
    let nearest = SETTINGS_GROUPS[0].id;
    let best = Infinity;
    for (const group of SETTINGS_GROUPS) {
      const section = column.querySelector(`#settings-group-${group.id}`);
      if (!section) continue;
      const distance = Math.abs(section.offsetTop - column.scrollTop);
      if (distance < best) {
        best = distance;
        nearest = group.id;
      }
    }
    setCurrentGroup(nearest);
  }

  // Measured off the real distance between two rows rather than a guessed pixel step, so the column never comes to rest mid-row - the same approach Profile.jsx's rail uses. Falls back to a single row's height when only one is rendered, which is a column with nothing to scroll anyway.
  function scrollGroups(direction) {
    const column = groupsRef.current;
    if (!column) return;
    const rows = column.querySelectorAll(".settings-row");
    const pitch = rows.length > 1 ? rows[1].offsetTop - rows[0].offsetTop : (rows[0]?.offsetHeight ?? 0);
    const reduceMotion = window.matchMedia(REDUCE_MOTION_QUERY).matches;
    column.scrollBy({ top: direction * pitch * ROWS_PER_PRESS, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function jumpToGroup(id) {
    const column = groupsRef.current;
    const section = column?.querySelector(`#settings-group-${id}`);
    if (!section) return;
    const reduceMotion = window.matchMedia(REDUCE_MOTION_QUERY).matches;
    // offsetTop is measured from .settings-groups itself, which Settings.css positions for exactly this reason - left static it would resolve against #settings and every jump would overshoot by the masthead's height.
    column.scrollTo({ top: section.offsetTop, behavior: reduceMotion ? "auto" : "smooth" });
  }

  // The masthead's photo is the only part of this page that depends on `user`, so the first measurement waits for it - measured any earlier the column is a different height and both chevrons would sit wrong.
  useEffect(() => {
    syncGroupEdges();
  }, [user]);

  useEffect(() => {
    if (!user || paused !== null) return;
    setPaused(user.paused === true);
  }, [user, paused]);

  function loadBlocked() {
    return fetch("/api/blocks")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error())))
      .then(setBlocked)
      .catch(() => setBlocked([]));
  }

  useEffect(() => {
    loadBlocked();
  }, []);

  // The blocked list is the only group whose height changes after load, so the rail has to remeasure once it arrives or the chevrons stay wrong for a column that has since grown.
  useEffect(() => {
    syncGroupEdges();
  }, [blocked]);

  function unblock(person) {
    setBlockError("");
    const name = [person.first_name, person.last_name].filter(Boolean).join(" ") || "that account";
    // Removed first, restored on failure - the same optimistic trade the pause switch makes.
    setBlocked((prev) => prev.filter((entry) => entry.id !== person.id));
    fetch(`/api/blocks/${person.id}`, { method: "DELETE" })
      .then((response) => {
        if (!response.ok) throw new Error();
      })
      .catch(() => {
        setBlocked((prev) => [person, ...prev]);
        setBlockError(`Couldn't unblock ${name}. Please try again.`);
      });
  }

  // Settings is the one entry point with nobody in front of it, so the picker comes from the people you've actually matched with - reporting a stranger you've never been shown isn't a thing the app can support.
  function openReportPicker() {
    setPickingReport(true);
    setBlockError("");
    if (matches) return;
    fetch("/api/matches")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error())))
      .then(setMatches)
      .catch(() => setMatches([]));
  }

  function handleResetDemo() {
    resetDemoMode().catch(() => {});
  }

  // Moves the switch first and puts it back if the request fails, the same trade Profile.jsx's photo handlers make - a switch that waits on the network before moving reads as broken, and this one is cheap to reverse.
  function togglePause() {
    const next = !paused;
    setPaused(next);
    setPauseError("");
    fetch("/api/account/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paused: next }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to save.");
        return refreshUser();
      })
      .catch(() => {
        setPaused(!next);
        setPauseError(next ? "Couldn't pause your account. Please try again." : "Couldn't unpause your account. Please try again.");
      });
  }

  return (
    <div id="settings">
      <AppNav />

      <main>
        {reportTarget && (
          <ReportDialog
            person={reportTarget}
            context={{ kind: "profile" }}
            onClose={() => setReportTarget(null)}
            onReported={(wasBlocked) => {
              setReportTarget(null);
              // The blocked list is on this very page, so it has to reflect the block that just happened rather than waiting for a reload.
              if (wasBlocked) loadBlocked();
            }}
          />
        )}

        {deleting && (
          <DeleteAccountDialog
            photoCount={user?.photoKeys?.length ?? 0}
            onClose={() => setDeleting(false)}
            onDeleted={() => {
              // The server has already cleared the cookie; this drops the client's copy of the user so ProtectedRoute doesn't briefly render a page for an account that no longer exists. Same two-step shape AppNav's log out uses.
              logout();
              navigate("/");
            }}
          />
        )}

        <div className="settings-shell">
          <section className="settings-identity">
            <div className="settings-face">
              {hasPhoto ? <img src={`/api/photos/${user.id}/0`} alt="Your main photo" /> : <FaceMark />}
            </div>

            {/* This page's subject is the settings, not you - so unlike Profile, where your name is the h1, the title names the page and your identity sits under it. */}
            <h1 className="settings-name">Settings</h1>
            {user?.email && <p className="settings-email">{user.email}</p>}
            {user?.createdAt && (
              <p className="settings-since">
                Member since{" "}
                <b>
                  {new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </b>
              </p>
            )}

            {/* HTML Deilverable: Proper HTML element usage - a list of jumps is a list, and each entry moves the column rather than the page, so these are buttons rather than in-page anchors. */}
            <ul className="settings-index">
              {SETTINGS_GROUPS.map((group) => (
                <li key={group.id}>
                  <button
                    type="button"
                    aria-current={currentGroup === group.id}
                    onClick={() => jumpToGroup(group.id)}
                  >
                    {group.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* Its own column between the identity block and the groups, the same place Chat, Discover and Profile put theirs. */}
          <div className="scroll-rail">
            <button
              type="button"
              className="scroll-chev"
              aria-label="Scroll settings up"
              disabled={groupEdges.atStart}
              onClick={() => scrollGroups(-1)}
            >
              <ChevronIcon direction="up" />
            </button>
            <button
              type="button"
              className="scroll-chev"
              aria-label="Scroll settings down"
              disabled={groupEdges.atEnd}
              onClick={() => scrollGroups(1)}
            >
              <ChevronIcon direction="down" />
            </button>
          </div>

          <div className="settings-groups" ref={groupsRef} onScroll={syncGroupEdges}>
            {/* ACCOUNT */}
            <section className="settings-group" id="settings-group-account">
              <h2 className="settings-group-title">Account</h2>
              <div className="settings-card">
                <dl className="settings-list">
                  <SettingsRow label="Email">
                    <button type="button" className="settings-value" disabled>
                      {user?.email ?? "—"}
                    </button>
                  </SettingsRow>
                  <SettingsRow label="Phone">
                    <button
                      type="button"
                      className={`settings-value${user?.phone ? "" : " settings-value-empty"}`}
                      disabled
                    >
                      {user?.phone || "Add"}
                    </button>
                  </SettingsRow>
                  <SettingsRow label="Password">
                    <button type="button" className="settings-value" disabled>
                      Change
                    </button>
                  </SettingsRow>
                  <SettingsRow
                    label="Profile details"
                    hint="Your fields, photos, and what each one shows on Discover are edited on your profile."
                  >
                    <button type="button" className="settings-value" onClick={() => navigate("/profile")}>
                      Open profile
                    </button>
                  </SettingsRow>
                </dl>
              </div>
            </section>

            {/* DISCOVERY */}
            <section className="settings-group" id="settings-group-discovery">
              <h2 className="settings-group-title">Discovery</h2>
              <div className="settings-card">
                <dl className="settings-list">
                  <SettingsRow
                    label="Demo profiles"
                    hint="Swaps Discover between real people and the seeded demo set. Also in the nav drawer."
                  >
                    <span className={`settings-mark${mode === "demo" ? " settings-mark-live" : ""}`}>
                      {mode === "demo" ? "Demo" : "Real"}
                    </span>
                    <SettingsSwitch
                      checked={mode === "demo"}
                      label="Show demo profiles in Discover"
                      onClick={toggleMode}
                      disabled={resetting}
                    />
                  </SettingsRow>
                  {mode === "demo" && (
                    <SettingsRow
                      label="Reset demo mode"
                      hint="Clears your swipes, matches and messages with demo profiles. Real ones aren't touched."
                    >
                      <button
                        type="button"
                        className="settings-value"
                        onClick={handleResetDemo}
                        disabled={resetting}
                      >
                        {resetting ? "Resetting..." : "Reset"}
                      </button>
                    </SettingsRow>
                  )}
                  <SettingsRow
                    label="Pause my account"
                    hint="Hides you from Discover. Your matches and chats stay exactly as they are."
                  >
                    {/* "Visible" is the healthy state here, so the green sits on the off position where every other switch in the app puts it on the on position. */}
                    <span className={`settings-mark${paused ? "" : " settings-mark-live"}`}>
                      {paused ? "Paused" : "Visible"}
                    </span>
                    <SettingsSwitch
                      checked={paused === true}
                      label="Pause my account"
                      onClick={togglePause}
                      disabled={paused === null}
                    />
                  </SettingsRow>
                  {pauseError && (
                    <p role="alert" className="settings-error">
                      {pauseError}
                    </p>
                  )}
                </dl>
              </div>
            </section>

            {/* SAFETY */}
            <section className="settings-group" id="settings-group-safety">
              <h2 className="settings-group-title">Safety</h2>
              <div className="settings-card">
                <dl className="settings-list">
                  <SettingsRow
                    label="Report someone"
                    hint="You can also report straight from a profile in Discover or from a chat thread."
                  >
                    <button type="button" className="settings-value" onClick={openReportPicker}>
                      Report
                    </button>
                  </SettingsRow>
                  {pickingReport && (
                    <div className="settings-picker">
                      {matches === null && <p className="settings-picker-note">Loading your matches...</p>}
                      {matches?.length === 0 && (
                        <p className="settings-picker-note">
                          You haven't matched with anyone yet. Reports start from a profile in Discover or from a chat.
                        </p>
                      )}
                      {matches?.map((match) => (
                        <button
                          key={match.id}
                          type="button"
                          className="settings-picker-row"
                          onClick={() => {
                            setReportTarget(match.otherUser);
                            setPickingReport(false);
                          }}
                        >
                          {[match.otherUser.first_name, match.otherUser.last_name].filter(Boolean).join(" ")}
                        </button>
                      ))}
                      <button type="button" className="settings-picker-cancel" onClick={() => setPickingReport(false)}>
                        Cancel
                      </button>
                    </div>
                  )}
                  <SettingsRow
                    label="After you report"
                    hint="A reviewer reads every report, usually within a day. The person you reported is never notified and never learns who reported them."
                  >
                    <button type="button" className="settings-value" disabled>
                      How it works
                    </button>
                  </SettingsRow>
                  <SettingsRow
                    label="Meeting someone safely"
                    hint="Picking a first place, telling a friend, and leaving early without it being awkward."
                  >
                    <button type="button" className="settings-value" disabled>
                      Read
                    </button>
                  </SettingsRow>
                </dl>
              </div>

              <h3 className="settings-subtitle">Blocked accounts</h3>
              <div className="settings-card">
                <div className="blocked-body">
                  {blocked === null && <p className="blocked-empty">Loading...</p>}
                  {blocked?.length === 0 && <p className="blocked-empty">Nobody blocked.</p>}
                  {blocked?.length > 0 && (
                    <ul className="blocked-list">
                      {blocked.map((person) => {
                        const name = [person.first_name, person.last_name].filter(Boolean).join(" ") || "Account";
                        return (
                          <li key={person.id} className="blocked-row">
                            {person.photoKeys?.length > 0 ? (
                              <img className="blocked-face" src={`/api/photos/${person.id}/0`} alt="" />
                            ) : (
                              <span className="blocked-face" aria-hidden="true">
                                {name.charAt(0)}
                              </span>
                            )}
                            <span className="blocked-name">
                              {name}
                              <small>Blocked {new Date(person.blockedAt).toLocaleDateString()}</small>
                            </span>
                            <button type="button" className="blocked-undo" onClick={() => unblock(person)}>
                              Unblock
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {blockError && (
                    <p role="alert" className="settings-error">
                      {blockError}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* CRISIS - the plainest card on the page. Someone reaching this section is not browsing, so it carries no pills to decode and no state to read: names, what each line is for, and the fastest way to reach it. */}
            <section className="settings-group" id="settings-group-crisis">
              <h2 className="settings-group-title">Crisis support</h2>
              <p className="crisis-note">{CRISIS_NOTE}</p>
              <div className="settings-card">
                <ul className="crisis-list">
                  {CRISIS_RESOURCES.map((resource) => (
                    <li key={resource.name} className="crisis-item">
                      <span className="crisis-name">{resource.name}</span>
                      <p className="crisis-desc">{resource.description}</p>
                      <div className="crisis-actions">
                        {resource.actions.map((action) => (
                          <a key={action.href} className="crisis-action" href={action.href}>
                            {action.label}
                          </a>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* LEGAL */}
            <section className="settings-group" id="settings-group-legal">
              <h2 className="settings-group-title">Legal &amp; data</h2>
              <div className="settings-card">
                <dl className="settings-list">
                  <SettingsRow label="Terms of Service">
                    <button type="button" className="settings-value" disabled>
                      Read
                    </button>
                  </SettingsRow>
                  <SettingsRow label="Privacy Policy">
                    <button type="button" className="settings-value" disabled>
                      Read
                    </button>
                  </SettingsRow>
                  <SettingsRow label="Community Guidelines">
                    <button type="button" className="settings-value" disabled>
                      Read
                    </button>
                  </SettingsRow>
                  {/* A plain link rather than a fetch: the endpoint already answers with Content-Disposition: attachment, so the browser saves the file itself - reading it into memory only to rebuild it as a blob would be the same download with extra steps and a copy of every message in the tab. */}
                  <SettingsRow label="Download my data" hint="Your profile, matches and messages as a JSON file.">
                    <a className="settings-value" href="/api/account/export" download>
                      Download
                    </a>
                  </SettingsRow>
                </dl>
              </div>
            </section>

            {/* DANGER - only what cannot be undone. Log out lives in AppNav, where it already is, because it is reversible and belongs with navigation rather than here. */}
            <section className="settings-group settings-group-danger" id="settings-group-danger">
              <h2 className="settings-group-title">Danger zone</h2>
              <div className="settings-card">
                <dl className="settings-list">
                  <SettingsRow
                    label="Delete my account"
                    hint="Erases your profile, photos, matches, messages and swipes. There is no grace period and nothing can be restored afterward."
                  >
                    <button type="button" className="danger-btn" onClick={() => setDeleting(true)}>
                      Delete
                    </button>
                  </SettingsRow>
                </dl>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
