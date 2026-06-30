import { StrictMode } from "react"; //additional import for StrictMode
import { createRoot } from "react-dom/client";
import "./index.css"; //styling for the app
import App from "./App.jsx"; //importing the main App component

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);