import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/screens/launcher";
import { loadAndApplySettings } from "./lib/theme";
import "./lib/launcher-lifecycle";
import "./styles/global.css";

loadAndApplySettings();

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
