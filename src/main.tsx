import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./components/App";
import { loadAndApplyTheme } from "./lib/theme";
import "./styles/global.css";

loadAndApplyTheme();

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
