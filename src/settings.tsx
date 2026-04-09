import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SettingsApp } from "./components/SettingsApp";
import { loadAndApplySettings } from "./lib/theme";
import "./styles/settings.css";

loadAndApplySettings();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
  },
});

createRoot(document.getElementById("settings-app")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SettingsApp />
    </QueryClientProvider>
  </StrictMode>,
);
