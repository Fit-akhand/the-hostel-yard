import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";
import { ErrorBoundary } from "./ErrorBoundary";
import { queryClient } from "./queryClient";
import { ToastViewport } from "../components/feedback/ToastViewport";
import { useAuthStore } from "../store/authStore";
import { setUnauthorizedHandler } from "../services/apiClient";

export function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    bootstrap();
    setUnauthorizedHandler(() => {
      if (useAuthStore.getState().user) logout();
    });
  }, [bootstrap, logout]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
        <ToastViewport />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
