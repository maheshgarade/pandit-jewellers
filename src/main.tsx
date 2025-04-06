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

import ContextsProvider from "./context/ContextsProvider.tsx";
import { LanguageProvider } from "./context/LanguageContext.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StyledEngineProvider injectFirst>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LanguageProvider>
            <Toaster />
            <Sonner />
            <ContextsProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </ContextsProvider>
          </LanguageProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </StyledEngineProvider>
  </StrictMode>
);
