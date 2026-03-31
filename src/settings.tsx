import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SettingsApp } from "./components/SettingsApp";
import { loadAndApplyTheme } from "./lib/theme";
import "./styles/settings.css";

loadAndApplyTheme();

createRoot(document.getElementById("settings-app")!).render(
  <StrictMode>
    <SettingsApp />
  </StrictMode>
);
