import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import PrintPreview from "./pages/PrintPreview";
import PatientDocument from "./pages/PatientDocument";
import MfaGate from "./pages/MfaGate";
import {
  getAuthenticatorAssuranceLevel,
  hasVerifiedTotpFactor,
  listTotpFactors,
} from "@/lib/mfa";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [requiresMfaGate, setRequiresMfaGate] = useState(false);

  const evaluateMfaRequirement = async (currentSession: Session | null) => {
    if (!currentSession) {
      setRequiresMfaGate(false);
      setMfaLoading(false);
      return;
    }

    setMfaLoading(true);

    const { factors, error: factorError } = await listTotpFactors();
    if (factorError) {
      setRequiresMfaGate(true);
      setMfaLoading(false);
      return;
    }

    const hasFactor = hasVerifiedTotpFactor(factors);
    if (!hasFactor) {
      setRequiresMfaGate(true);
      setMfaLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("mfa_enforced_every_login")
      .eq("id", currentSession.user.id)
      .single();

    if (!profile?.mfa_enforced_every_login) {
      setRequiresMfaGate(false);
      setMfaLoading(false);
      return;
    }

    const { data: aalData, error: aalError } = await getAuthenticatorAssuranceLevel();
    if (aalError) {
      setRequiresMfaGate(true);
      setMfaLoading(false);
      return;
    }

    setRequiresMfaGate(aalData.currentLevel !== "aal2");
    setMfaLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      evaluateMfaRequirement(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      evaluateMfaRequirement(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading || (session && mfaLoading)) {
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
            <Route
              path="/auth"
              element={session ? <Navigate to={requiresMfaGate ? "/mfa" : "/app"} replace /> : <Auth />}
            />
            <Route
              path="/mfa"
              element={
                session ? (
                  <MfaGate onComplete={() => setRequiresMfaGate(false)} />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            <Route
              path="/app"
              element={
                session ? (
                  requiresMfaGate ? <Navigate to="/mfa" replace /> : <Index onLogout={handleLogout} />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            <Route
              path="/app/print-preview/:caseId"
              element={
                session ? (
                  requiresMfaGate ? <Navigate to="/mfa" replace /> : <PrintPreview />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            <Route
              path="/account"
              element={
                session ? (
                  requiresMfaGate ? <Navigate to="/mfa" replace /> : <Account onLogout={handleLogout} />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            <Route path="/document/:accessToken" element={<PatientDocument />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
