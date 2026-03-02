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
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { hasVerifiedTotpFactor, listTotpFactors } from "@/lib/mfa";

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
  const navigate = useNavigate();
  const { toast } = useToast();

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
        title: "Could not load security settings",
        description: profileError.message,
        variant: "destructive",
      });
      setLoadingSecurity(false);
      return;
    }

    const { factors, error: factorsError } = await listTotpFactors();
    if (factorsError) {
      toast({
        title: "Could not load MFA status",
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
  }, [toast]);

  useEffect(() => {
    loadSecurityState();
  }, [loadSecurityState]);

  const handleToggleEnforcement = async (checked: boolean) => {
    if (!hasConfiguredMfa) {
      toast({
        title: "MFA setup required",
        description: "Set up MFA before enabling per-login enforcement.",
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
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
      setSavingSecurity(false);
      return;
    }

    setEnforceEveryLogin(checked);
    toast({
      title: "Security settings updated",
      description: checked ? "MFA will be required on every login." : "Regular login is enabled.",
    });
    setSavingSecurity(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Manage your account preferences and security
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
                    <p className="font-medium">Security</p>
                    <p className="text-sm text-muted-foreground">
                      Manage multi-factor authentication for your account
                    </p>
                  </div>
                </div>
                <Badge variant={hasConfiguredMfa ? "default" : "secondary"}>
                  {hasConfiguredMfa ? "MFA configured" : "Setup required"}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Require MFA for every login</p>
                  <p className="text-sm text-muted-foreground">
                    If disabled, MFA remains configured but is not required each login.
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
                    Enforce
                  </Label>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => navigate("/mfa")}
                  disabled={loadingSecurity}
                >
                  {hasConfiguredMfa ? "Verify MFA now" : "Set up MFA"}
                </Button>
              </div>

              {loadingSecurity && (
                <p className="text-sm text-muted-foreground">Loading security settings...</p>
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
                  <p className="font-medium">Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Email and push notification preferences
                  </p>
                </div>
              </div>
              <Button variant="outline" disabled>
                Coming Soon
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
                  <p className="font-medium">Appearance</p>
                  <p className="text-sm text-muted-foreground">
                    Theme and display preferences
                  </p>
                </div>
              </div>
              <Button variant="outline" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone - Sign Out */}
      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be signed out of your account and redirected to the login page.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onLogout}>
                  Sign Out
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
