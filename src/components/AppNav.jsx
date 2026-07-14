import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function AppNav() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    logout();
    navigate("/");
  }

  return (
    <nav className="app-nav" aria-label="App navigation">
      <ul>
        <li>
          <NavLink to="/discover">Discover</NavLink>
        </li>
        <li>
          <NavLink to="/chat">Chat</NavLink>
        </li>
        <li>
          <NavLink to="/profile">Profile</NavLink>
        </li>
        {user && (
          <li>
            <button type="button" onClick={handleLogout}>
              Log out
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}
