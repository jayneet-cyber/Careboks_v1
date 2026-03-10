import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  enrollTotpFactor,
  getAuthenticatorAssuranceLevel,
  getPrimaryVerifiedTotpFactor,
  hasVerifiedTotpFactor,
  listTotpFactors,
  verifyTotpCode,
} from "@/lib/mfa";
import { QRCodeSVG } from "qrcode.react";
import { useAppLanguage } from "@/lib/i18n";

type MfaMode = "setup" | "verify";

interface MfaGateProps {
  onComplete: () => void;
}

interface ProfileSecurity {
  mfa_enforced_every_login: boolean;
  mfa_enrolled_at: string | null;
}

interface EnrollmentState {
  factorId: string;
  secret?: string;
  uri?: string;
  qrCode?: string;
}

const MfaGate = ({ onComplete }: MfaGateProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useAppLanguage();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<MfaMode>("setup");
  const [code, setCode] = useState("");
  const [enrollment, setEnrollment] = useState<EnrollmentState | null>(null);
  const [profileSecurity, setProfileSecurity] = useState<ProfileSecurity | null>(null);
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  };

  const safeSignOutAndRedirect = async () => {
    try {
      await withTimeout(supabase.auth.signOut(), 4000, "Sign out");
    } catch (error) {
      console.error("Sign out fallback triggered:", error);
    } finally {
      onComplete();
      navigate("/auth", { replace: true });
      setTimeout(() => {
        if (window.location.pathname !== "/auth") {
          window.location.replace("/auth");
        }
      }, 50);
    }
  };

  const syncEnrollmentTimestamp = async (userId: string, hasTimestamp: boolean) => {
    if (hasTimestamp) {
      return;
    }

    await supabase
      .from("profiles")
      .update({ mfa_enrolled_at: new Date().toISOString() })
      .eq("id", userId);
  };

  const evaluateState = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await withTimeout(supabase.auth.getUser(), 8000, "Auth user lookup");

      if (!user) {
        await safeSignOutAndRedirect();
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("mfa_enforced_every_login, mfa_enrolled_at")
        .eq("id", user.id)
        .single();

      if (profileError) {
        toast({
          title: t("Security check failed"),
          description: profileError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setProfileSecurity(profile);

      const { factors, error: factorsError } = await withTimeout(listTotpFactors(), 8000, "MFA factors lookup");
      if (factorsError) {
        toast({
          title: t("Could not load MFA factors"),
          description: factorsError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const hasFactor = hasVerifiedTotpFactor(factors);

      if (!hasFactor) {
        setMode("setup");
        setVerifiedFactorId(null);
        setLoading(false);
        return;
      }

      const primaryFactor = getPrimaryVerifiedTotpFactor(factors);
      setVerifiedFactorId(primaryFactor?.id ?? null);
      await syncEnrollmentTimestamp(user.id, Boolean(profile.mfa_enrolled_at));

      if (!profile.mfa_enforced_every_login) {
        onComplete();
        navigate("/app", { replace: true });
        return;
      }

      const { data: aalData, error: aalError } = await withTimeout(
        getAuthenticatorAssuranceLevel(),
        8000,
        "MFA assurance level check"
      );
      if (aalError) {
        toast({
          title: t("Could not verify security level"),
          description: aalError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (aalData.currentLevel === "aal2") {
        onComplete();
        navigate("/app", { replace: true });
        return;
      }

      setMode("verify");
      setLoading(false);
    } catch (error) {
      console.error("MFA gate evaluation failed:", error);
      toast({
        title: t("Security check failed"),
        description: t("Please sign in again."),
        variant: "destructive",
      });
      setLoading(false);
      await safeSignOutAndRedirect();
    }
  }, [navigate, onComplete, t, toast]);

  useEffect(() => {
    evaluateState();
  }, [evaluateState]);

  const handleStartEnrollment = async () => {
    setSubmitting(true);
    const { data, error } = await enrollTotpFactor();

    if (error) {
      toast({
        title: t("Could not start MFA setup"),
        description: error.message,
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    setEnrollment({
      factorId: data.id,
      secret: data.totp.secret,
      uri: data.totp.uri,
      qrCode: data.totp.qr_code,
    });
    setSubmitting(false);
  };

  const handleVerifyCode = async () => {
    const normalizedCode = code.trim();
    if (normalizedCode.length !== 6) {
      toast({
        title: t("Invalid code"),
        description: t("Enter the 6-digit code from your authenticator app."),
        variant: "destructive",
      });
      return;
    }

    const factorId = mode === "setup" ? enrollment?.factorId : verifiedFactorId;
    if (!factorId) {
      toast({
        title: t("MFA factor missing"),
        description: t("Start MFA setup first or refresh the page."),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await verifyTotpCode(factorId, normalizedCode);

    if (error) {
      toast({
        title: t("Verification failed"),
        description: error.message,
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && !profileSecurity?.mfa_enrolled_at) {
      await supabase
        .from("profiles")
        .update({ mfa_enrolled_at: new Date().toISOString() })
        .eq("id", user.id);
    }

    toast({
      title: mode === "setup" ? t("MFA configured") : t("MFA verified"),
      description: mode === "setup" ? t("Your account is now secured with MFA.") : t("Access granted."),
    });

    setSubmitting(false);
    onComplete();
    navigate("/app", { replace: true });
  };

  const handleSignOut = async () => {
    await safeSignOutAndRedirect();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-muted-foreground">{t("Checking MFA requirements...")}</div>
      </div>
    );
  }

  const isSetupMode = mode === "setup";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{isSetupMode ? t("Set up MFA") : t("Verify MFA")}</CardTitle>
            <Badge variant={isSetupMode ? "secondary" : "default"}>
              {isSetupMode ? t("Required") : t("Login verification")}
            </Badge>
          </div>
          <CardDescription>
            {isSetupMode
              ? t("MFA setup is required before you can access your dashboard.")
              : t("MFA is required for this login. Enter your authenticator code to continue.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSetupMode && !enrollment && (
            <Alert>
              <AlertTitle>{t("Authenticator app required")}</AlertTitle>
              <AlertDescription>
                {t("Use Google Authenticator, 1Password, Microsoft Authenticator, or any TOTP app.")}
              </AlertDescription>
            </Alert>
          )}

          {isSetupMode && enrollment && (
            <div className="space-y-4 rounded-lg border p-4">
              {enrollment.uri ? (
                <div className="flex justify-center">
                  <QRCodeSVG value={enrollment.uri} size={180} />
                </div>
              ) : enrollment.qrCode ? (
                <div className="overflow-auto" dangerouslySetInnerHTML={{ __html: enrollment.qrCode }} />
              ) : null}

              {enrollment.secret && (
                <div className="text-sm">
                  <p className="text-muted-foreground">{t("Manual setup key")}</p>
                  <p className="font-mono break-all">{enrollment.secret}</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder={t("Enter 6-digit code")}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              disabled={submitting || (isSetupMode && !enrollment)}
            />
          </div>

          <div className="flex flex-col gap-2">
            {isSetupMode && !enrollment && (
              <Button onClick={handleStartEnrollment} disabled={submitting}>
                {submitting ? t("Generating QR code...") : t("Start MFA setup")}
              </Button>
            )}

            <Button
              onClick={handleVerifyCode}
              disabled={submitting || (isSetupMode && !enrollment)}
            >
              {submitting ? t("Verifying...") : t("Verify and continue")}
            </Button>

            <Button variant="ghost" onClick={handleSignOut} disabled={submitting}>
              {t("Sign out")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MfaGate;
