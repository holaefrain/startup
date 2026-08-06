import AppNav from "../../components/AppNav.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import "./Settings.css";

// The main photo stands in for you here the same way it does on every Chat row and in Discover's match overlay - index 0, which Profile.jsx badges "Main" for exactly this reason. Drawn rather than fetched when there's no photo yet: /api/photos/:userId/0 404s on an empty photoKeys, and a broken <img> is a worse empty state than a mark that was always meant to be one.
function FaceMark() {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="#2c4a52" strokeWidth="4" aria-hidden="true">
      <circle cx="50" cy="37" r="17" />
      <path d="M18 90c0-18 14-29 32-29s32 11 32 29" strokeLinecap="round" />
    </svg>
  );
}

// React Deilverable Part 1: Components
export default function Settings() {
  const { user } = useAuth();
  const hasPhoto = (user?.photoKeys?.length ?? 0) > 0;

  return (
    <div id="settings">
      <AppNav />

      <main>
        <section className="settings-identity">
          <div className="settings-face">
            {hasPhoto ? <img src={`/api/photos/${user.id}/0`} alt="Your main photo" /> : <FaceMark />}
          </div>

          {/* This page's subject is the settings, not you - so unlike Profile, where your name is the h1, the title names the page and your identity sits under it. */}
          <h1 className="settings-name">Settings</h1>
          {user?.email && <p className="settings-email">{user.email}</p>}
        </section>
      </main>
    </div>
  );
}
