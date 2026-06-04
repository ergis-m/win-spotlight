import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { loadAndApplySettings } from "./lib/theme";
import "./styles/settings.css";
import { SettingsScreen } from "./screens/settings";

loadAndApplySettings();

createRoot(document.getElementById("settings-app")!).render(
  <StrictMode>
    <SettingsScreen />
  </StrictMode>,
);
