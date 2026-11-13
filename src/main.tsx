import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { hashUrlForPath } from "./shared/hashRoute";
import "./styles.css";

const promoted = hashUrlForPath(location.pathname, location.search, location.hash);
if (promoted) location.replace(promoted);

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline mode for job sites: the service worker caches the app so it opens with no signal.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
