import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getStoredSession,
  logoutBackendSession,
  onAuthChanged,
  restoreBackendSession
} from "@/integrations/auth/customAuth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import PrintPreview from "./pages/PrintPreview";
import PatientDocument from "./pages/PatientDocument";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrateCustomSession = async () => {
      const activeSession = await restoreBackendSession();
      setIsAuthenticated(Boolean(activeSession));
      setLoading(false);
    };

    void hydrateCustomSession();

    const unsubscribe = onAuthChanged(() => {
      const activeSession = getStoredSession();
      setIsAuthenticated(Boolean(activeSession?.accessToken));
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await logoutBackendSession();
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={isAuthenticated ? <Navigate to="/app" /> : <Auth />} />
            <Route path="/app" element={isAuthenticated ? <Index onLogout={handleLogout} /> : <Navigate to="/auth" />} />
            <Route path="/app/print-preview/:caseId" element={isAuthenticated ? <PrintPreview /> : <Navigate to="/auth" />} />
            <Route path="/account" element={isAuthenticated ? <Account onLogout={handleLogout} /> : <Navigate to="/auth" />} />
            <Route path="/document/:accessToken" element={<PatientDocument />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
