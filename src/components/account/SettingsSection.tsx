/**
 * @fileoverview Account Settings Section
 * 
 * Provides access to application settings and account management.
 * Currently includes:
 * - Security settings (placeholder for future password management)
 * - Notification preferences (placeholder)
 * - Appearance settings (placeholder)
 * - Sign out functionality
 * 
 * @module components/account/SettingsSection
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LogOut, Shield, Bell, Palette } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { hasVerifiedTotpFactor, listTotpFactors } from "@/lib/mfa";
import { useAppLanguage } from "@/lib/i18n";

/**
 * Props for the SettingsSection component
 */
interface SettingsSectionProps {
  /** Callback function to handle user logout */
  onLogout: () => void;
}

/**
 * Account settings component
 * 
 * Renders settings categories and sign-out functionality
 * with confirmation dialog for destructive actions.
 * 
 * @example
 * ```tsx
 * <SettingsSection onLogout={() => signOut()} />
 * ```
 */
const SettingsSection = ({ onLogout }: SettingsSectionProps) => {
  const { toast } = useToast();
  const { t } = useAppLanguage();

  const [loadingSecurity, setLoadingSecurity] = useState(true);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [hasConfiguredMfa, setHasConfiguredMfa] = useState(false);
  const [enforceEveryLogin, setEnforceEveryLogin] = useState(false);

  const loadSecurityState = useCallback(async () => {
    setLoadingSecurity(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoadingSecurity(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("mfa_enforced_every_login, mfa_enrolled_at")
      .eq("id", user.id)
      .single();

    if (profileError) {
      toast({
        title: t("Could not load security settings"),
        description: profileError.message,
        variant: "destructive",
      });
      setLoadingSecurity(false);
      return;
    }

    const { factors, error: factorsError } = await listTotpFactors();
    if (factorsError) {
      toast({
        title: t("Could not load MFA status"),
        description: factorsError.message,
        variant: "destructive",
      });
      setLoadingSecurity(false);
      return;
    }

    const hasVerifiedFactor = hasVerifiedTotpFactor(factors);
    setHasConfiguredMfa(hasVerifiedFactor);
    setEnforceEveryLogin(Boolean(profile.mfa_enforced_every_login));

    if (hasVerifiedFactor && !profile.mfa_enrolled_at) {
      await supabase
        .from("profiles")
        .update({ mfa_enrolled_at: new Date().toISOString() })
        .eq("id", user.id);
    }

    setLoadingSecurity(false);
  }, [t, toast]);

  useEffect(() => {
    loadSecurityState();
  }, [loadSecurityState]);

  const handleToggleEnforcement = async (checked: boolean) => {
    if (!hasConfiguredMfa) {
      toast({
        title: t("MFA setup required"),
        description: t("Set up MFA before enabling per-login enforcement."),
        variant: "destructive",
      });
      return;
    }

    setSavingSecurity(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSavingSecurity(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ mfa_enforced_every_login: checked })
      .eq("id", user.id);

    if (error) {
      toast({
        title: t("Update failed"),
        description: error.message,
        variant: "destructive",
      });
      setSavingSecurity(false);
      return;
    }

    setEnforceEveryLogin(checked);
    toast({
      title: t("Security settings updated"),
      description: checked ? t("MFA will be required on every login.") : t("Regular login is enabled."),
    });
    setSavingSecurity(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("Account Settings")}</CardTitle>
          <CardDescription>
            {t("Manage your account preferences and security")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* Security Settings */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t("Security")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("Manage multi-factor authentication for your account")}
                    </p>
                  </div>
                </div>
                <Badge variant={hasConfiguredMfa ? "default" : "secondary"}>
                  {hasConfiguredMfa ? t("MFA configured") : t("Setup required")}
                </Badge>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{t("Require MFA for every login")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("If disabled, MFA remains configured but is not required each login.")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={enforceEveryLogin}
                    disabled={loadingSecurity || savingSecurity || !hasConfiguredMfa}
                    onCheckedChange={(checked) => handleToggleEnforcement(checked === true)}
                    id="mfa-enforce-checkbox"
                  />
                  <Label htmlFor="mfa-enforce-checkbox" className="text-sm">
                    {t("Enforce")}
                  </Label>
                </div>
              </div>

              {loadingSecurity && (
                <p className="text-sm text-muted-foreground">{t("Loading security settings...")}</p>
              )}
            </div>

            <Separator />

            {/* Notification Settings */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Bell className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium">{t("Notifications")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("Email and push notification preferences")}
                  </p>
                </div>
              </div>
              <Button variant="outline" disabled>
                {t("Coming Soon")}
              </Button>
            </div>

            <Separator />

            {/* Appearance Settings */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Palette className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="font-medium">{t("Appearance")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("Theme and display preferences")}
                  </p>
                </div>
              </div>
              <Button variant="outline" disabled>
                {t("Coming Soon")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone - Sign Out */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Danger Zone")}</CardTitle>
          <CardDescription>
            {t("Irreversible and destructive actions")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <LogOut className="h-4 w-4" />
                {t("Sign Out")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("Are you sure?")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("You will be signed out of your account and redirected to the login page.")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={onLogout}>
                  {t("Sign Out")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsSection;
