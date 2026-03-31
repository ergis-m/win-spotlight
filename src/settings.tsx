import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SettingsApp } from "./components/SettingsApp";
import "./styles/settings.css";

createRoot(document.getElementById("settings-app")!).render(
  <StrictMode>
    <SettingsApp />
  </StrictMode>
);
