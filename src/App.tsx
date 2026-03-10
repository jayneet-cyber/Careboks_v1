import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import {
  getAuthenticatorAssuranceLevel,
  hasVerifiedTotpFactor,
  listTotpFactors,
} from "@/lib/mfa";
import { useAppLanguage } from "@/lib/i18n";
import { normalizeUiLanguage } from "@/lib/language";

const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Index = lazy(() => import("./pages/Index"));
const Account = lazy(() => import("./pages/Account"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrintPreview = lazy(() => import("./pages/PrintPreview"));
const PatientDocument = lazy(() => import("./pages/PatientDocument"));
const MfaGate = lazy(() => import("./pages/MfaGate"));

const queryClient = new QueryClient();

const App = () => {
  const { setLanguage } = useAppLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [mfaRequirement, setMfaRequirement] = useState<"unknown" | "required" | "not-required">("unknown");
  const mfaEvaluationRef = useRef(0);

  const evaluateMfaRequirement = async (currentSession: Session | null) => {
    const evaluationId = ++mfaEvaluationRef.current;
    const isLatestEvaluation = () => mfaEvaluationRef.current === evaluationId;

    if (!currentSession) {
      if (isLatestEvaluation()) {
        setMfaRequirement("not-required");
      }
      return;
    }

    if (isLatestEvaluation()) {
      setMfaRequirement("unknown");
    }

    try {
      const { factors, error: factorError } = await listTotpFactors();
      if (factorError) {
        if (isLatestEvaluation()) {
          setMfaRequirement("required");
        }
        return;
      }

      const hasFactor = hasVerifiedTotpFactor(factors);
      if (!hasFactor) {
        if (isLatestEvaluation()) {
          setMfaRequirement("required");
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("mfa_enforced_every_login")
        .eq("id", currentSession.user.id)
        .single();

      if (!profile?.mfa_enforced_every_login) {
        if (isLatestEvaluation()) {
          setMfaRequirement("not-required");
        }
        return;
      }

      const { data: aalData, error: aalError } = await getAuthenticatorAssuranceLevel();
      if (aalError) {
        if (isLatestEvaluation()) {
          setMfaRequirement("required");
        }
        return;
      }

      if (isLatestEvaluation()) {
        setMfaRequirement(aalData.currentLevel !== "aal2" ? "required" : "not-required");
      }
    } catch (error) {
      console.error("Failed to evaluate MFA requirement:", error);
      if (isLatestEvaluation()) {
        setMfaRequirement("required");
      }
    }
  };

  useEffect(() => {
    const loadUiLanguageFromProfile = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("language")
        .eq("id", userId)
        .maybeSingle();

      if (data?.language) {
        setLanguage(normalizeUiLanguage(data.language));
      }
    };

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user?.id) {
          loadUiLanguageFromProfile(session.user.id);
        } else {
          setLanguage("eng");
        }
        await evaluateMfaRequirement(session);
      } catch (error) {
        console.error("Failed to initialize auth session:", error);
        setSession(null);
        setMfaRequirement("not-required");
        setLanguage("eng");
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        loadUiLanguageFromProfile(session.user.id);
      } else {
        setLanguage("eng");
      }
      evaluateMfaRequirement(session).catch((error) => {
        console.error("Auth state MFA evaluation failed:", error);
        setMfaRequirement("required");
      });
    });

    return () => subscription.unsubscribe();
  }, [setLanguage]);

  const handleLogout = async () => {
    setSession(null);
    setMfaRequirement("not-required");
    setLanguage("eng");

    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Sign out timed out")), 4000)
        ),
      ]);
    } catch (error) {
      console.error("Sign out failed, forcing local logout:", error);
    }
  };

  const protectedRoutePlaceholder = <div className="min-h-screen bg-background" />;

  const renderProtectedElement = (element: JSX.Element) => {
    if (!session) {
      return <Navigate to="/auth" replace />;
    }

    if (mfaRequirement === "unknown") {
      return protectedRoutePlaceholder;
    }

    if (mfaRequirement === "required") {
      return <Navigate to="/mfa" replace />;
    }

    return element;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={protectedRoutePlaceholder}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/mfa"
                element={
                  session ? (
                    mfaRequirement === "unknown" ? (
                      protectedRoutePlaceholder
                    ) : mfaRequirement === "required" ? (
                      <MfaGate onComplete={() => setMfaRequirement("not-required")} />
                    ) : (
                      <Navigate to="/app" replace />
                    )
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                }
              />
              <Route
                path="/app"
                element={renderProtectedElement(<Index onLogout={handleLogout} />)}
              />
              <Route
                path="/app/print-preview/:caseId"
                element={renderProtectedElement(<PrintPreview />)}
              />
              <Route
                path="/account"
                element={renderProtectedElement(<Account onLogout={handleLogout} />)}
              />
              <Route path="/document/:accessToken" element={<PatientDocument />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
