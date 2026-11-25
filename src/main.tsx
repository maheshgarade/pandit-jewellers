import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { StyledEngineProvider } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import App from "./App";
import { ShopLockGate } from "./components/ShopLockGate";

import ContextsProvider from "./context/ContextsProvider.tsx";
import { LanguageProvider } from "./context/LanguageContext.tsx";
import { StoreProvider } from "./lib/store.tsx";

const queryClient = new QueryClient();

// Keyboard: the app shrinks above it (MainActivity); then bring the field being typed in into view,
// clear of the sticky header and the bottom tabs.
const revealFocused = () => {
  const el = document.activeElement;
  if (el instanceof HTMLElement && el.matches("input, textarea, select, [contenteditable]")) {
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }
};
document.addEventListener("focusin", () => setTimeout(revealFocused, 300));
window.addEventListener("resize", () => setTimeout(revealFocused, 50));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StyledEngineProvider injectFirst>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LanguageProvider>
            <Toaster />
            <Sonner />
            <ContextsProvider>
              <StoreProvider>
                <BrowserRouter>
                  <ShopLockGate>
                    <App />
                  </ShopLockGate>
                </BrowserRouter>
              </StoreProvider>
            </ContextsProvider>
          </LanguageProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </StyledEngineProvider>
  </StrictMode>
);
