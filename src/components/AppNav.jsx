import { NavLink } from "react-router-dom";

export default function AppNav() {
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
      </ul>
    </nav>
  );
}
