import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { loadAndApplySettings } from "./lib/theme";
import "./styles/settings.css";
import { SettingsScreen } from "./screens/settings";

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
      <SettingsScreen />
    </QueryClientProvider>
  </StrictMode>,
);
