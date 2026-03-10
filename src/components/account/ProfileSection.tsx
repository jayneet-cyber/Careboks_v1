import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Languages } from "lucide-react";
import { useAppLanguage } from "@/lib/i18n";
import { UiLanguage, normalizeUiLanguage } from "@/lib/language";

const ProfileSection = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { setLanguage, t } = useAppLanguage();
  
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "",
    language: "est"
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If no profile exists, create one
      if (!data) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || "",
            first_name: "",
            last_name: "",
            role: ""
          });

        if (insertError) throw insertError;

        setProfile({
          first_name: "",
          last_name: "",
          email: user.email || "",
          role: "",
          language: "est"
        });
      } else {
        setProfile({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || user.email || "",
          role: data.role || "",
          language: normalizeUiLanguage(data.language || "est")
        });
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast({
        title: t("Error"),
        description: t("Failed to load profile"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          role: profile.role,
          language: profile.language
        })
        .eq('id', user.id);

      if (error) throw error;

      setLanguage(normalizeUiLanguage(profile.language));

      toast({
        title: t("Success"),
        description: t("Profile updated successfully")
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: t("Error"),
        description: t("Failed to save profile"),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Profile Information")}</CardTitle>
        <CardDescription>
          {t("Update your personal information")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">{t("First Name")}</Label>
            <Input
              id="first_name"
              value={profile.first_name}
              onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
              placeholder={t("Enter your first name")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">{t("Last Name")}</Label>
            <Input
              id="last_name"
              value={profile.last_name}
              onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
              placeholder={t("Enter your last name")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("Email")}</Label>
          <Input
            id="email"
            type="email"
            value={profile.email}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            {t("Email cannot be changed")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">{t("Role")}</Label>
          <Select value={profile.role} onValueChange={(value) => setProfile({ ...profile, role: value })}>
            <SelectTrigger>
              <SelectValue placeholder={t("Select your role")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="doctor">{t("Doctor")}</SelectItem>
              <SelectItem value="nurse">{t("Nurse")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">{t("Preferred Language")}</Label>
          <Select value={profile.language} onValueChange={(value) => setProfile({ ...profile, language: normalizeUiLanguage(value) as UiLanguage })}>
            <SelectTrigger>
              <SelectValue placeholder={t("Select your language")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="est">
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  <span>{t("Estonian (EST)")}</span>
                </div>
              </SelectItem>
              <SelectItem value="rus">
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  <span>{t("Russian (RUS)")}</span>
                </div>
              </SelectItem>
              <SelectItem value="eng">
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  <span>{t("English (ENG)")}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("Saving...")}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t("Save Changes")}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileSection;
