/**
 * @fileoverview Patient Profile Component
 * 
 * Second step of the patient communication workflow. Collects patient-specific
 * attributes that will be used to personalize the AI-generated communication:
 * - Demographics (age, sex)
 * - Language preference
 * - Health literacy level
 * - Patient journey type
 * - Risk communication preferences
 * - Comorbidities
 * - Accessibility needs
 * 
 * @module components/PatientProfile
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { User, ArrowLeft } from "lucide-react";
import { useCasePersistence } from "@/hooks/useCasePersistence";
import { useToast } from "@/hooks/use-toast";
import { useAppLanguage } from "@/lib/i18n";
import {
  SECTION_IDS,
  SECTION_TITLE_KEYS,
  normalizeSelectedSectionIds,
  type SectionId
} from "@/lib/documentSections";

/**
 * Patient data structure containing all personalization attributes
 */
export interface PatientData {
  /** Age bracket (e.g., "20-30", "60+") */
  age: string;
  /** Biological sex for medical relevance */
  sex: string;
  /** Preferred language for communication (estonian, russian, english) */
  language: string;
  /** Health literacy level affecting complexity of explanations */
  healthLiteracy: string;
  /** Type of patient journey affecting tone and detail */
  journeyType: string;
  /** Preference for detail level in risk communication */
  riskAppetite: string;
  /** Whether patient has vision/hearing impairments */
  hasAccessibilityNeeds: boolean;
  /** Whether to include information for caregivers */
  includeRelatives: boolean;
  /** List of relevant comorbidities */
  comorbidities: string[];
  /** Enabled output sections for clinician review/publish */
  selectedSectionIds: SectionId[];
}

/**
 * Props for the PatientProfile component
 */
interface PatientProfileProps {
  /** ID of the current case being processed */
  caseId: string;
  /** Callback fired when user proceeds with patient data */
  onNext: (data: PatientData) => void;
  /** Callback to return to previous step */
  onBack: () => void;
  /** Pre-filled patient data (optional, for editing) */
  initialData?: PatientData;
}

/** Default empty patient data structure */
const DEFAULT_PATIENT_DATA: PatientData = {
  age: "",
  sex: "",
  language: "",
  healthLiteracy: "",
  journeyType: "",
  riskAppetite: "",
  hasAccessibilityNeeds: false,
  includeRelatives: false,
  comorbidities: [],
  selectedSectionIds: [...SECTION_IDS]
};

/**
 * Patient Profile Component
 * 
 * Collects patient attributes to personalize the AI-generated medical communication.
 * Validates required fields before allowing progression to next step.
 * 
 * @example
 * ```tsx
 * <PatientProfile
 *   caseId="123-abc"
 *   onNext={(data) => handlePatientData(data)}
 *   onBack={() => goToTechnicalNote()}
 * />
 * ```
 */
const PatientProfile = ({
  caseId,
  onNext,
  onBack,
  initialData
}: PatientProfileProps) => {
  const { savePatientProfile, updateCase } = useCasePersistence();
  const { toast } = useToast();
  const { t } = useAppLanguage();
  
  const [data, setData] = useState<PatientData>(() => {
    const incoming = initialData || DEFAULT_PATIENT_DATA;
    return {
      ...DEFAULT_PATIENT_DATA,
      ...incoming,
      selectedSectionIds: normalizeSelectedSectionIds(incoming.selectedSectionIds)
    };
  });

  const handleSectionSelectionChange = (sectionId: SectionId, checked: boolean) => {
    setData(prev => {
      if (checked) {
        if (prev.selectedSectionIds.includes(sectionId)) {
          return prev;
        }

        return {
          ...prev,
          selectedSectionIds: [...prev.selectedSectionIds, sectionId]
        };
      }

      return {
        ...prev,
        selectedSectionIds: prev.selectedSectionIds.filter(id => id !== sectionId)
      };
    });
  };

  /**
   * Updates a single field in the patient data
   */
  const updateField = <K extends keyof PatientData>(field: K, value: PatientData[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Validates and saves patient profile, then proceeds to next step
   */
  const handleNext = async () => {
    if (!isValid) return;

    // Save patient profile to database
    const { error: profileError } = await savePatientProfile(caseId, data);
    if (profileError) {
      toast({
        title: t("Error"),
        description: t("Failed to save patient profile"),
        variant: "destructive"
      });
      return;
    }

    // Update case status to processing
    const { error: updateError } = await updateCase(caseId, { status: 'processing' });
    if (updateError) {
      toast({
        title: t("Error"),
        description: t("Failed to update case status"),
        variant: "destructive"
      });
      return;
    }

    toast({
      title: t("Success"),
      description: t("Patient profile saved")
    });
    
    onNext(data);
  };

  /** Validates that all required fields are filled */
  const isValid = Boolean(
    data.age &&
    data.sex &&
    data.language &&
    data.healthLiteracy &&
    data.journeyType
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>{t("Patient Profile")}</CardTitle>
          </div>
          <CardDescription>
            {t("Configure patient attributes to personalize the communication output.")}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Demographics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Age Selection */}
            <div className="space-y-2">
              <Label htmlFor="age">{t("Age")}</Label>
              <Select value={data.age} onValueChange={value => updateField('age', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select age bracket")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20-30">{t("20-30 years old")}</SelectItem>
                  <SelectItem value="30-45">{t("30-45 years old")}</SelectItem>
                  <SelectItem value="45-60">{t("45-60 years old")}</SelectItem>
                  <SelectItem value="60+">{t("60+ years old")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sex Selection */}
            <div className="space-y-2">
              <Label htmlFor="sex">{t("Sex")}</Label>
              <Select value={data.sex} onValueChange={value => updateField('sex', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select sex")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t("Male")}</SelectItem>
                  <SelectItem value="female">{t("Female")}</SelectItem>
                  <SelectItem value="other">{t("Other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <Label htmlFor="language">{t("Preferred Language")}</Label>
              <Select value={data.language} onValueChange={value => updateField('language', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select language")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="estonian">{t("Estonian")}</SelectItem>
                  <SelectItem value="russian">{t("Russian")}</SelectItem>
                  <SelectItem value="english">{t("English")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Health Literacy Selection */}
            <div className="space-y-2">
              <Label htmlFor="literacy">{t("Health Literacy Level")}</Label>
              <Select value={data.healthLiteracy} onValueChange={value => updateField('healthLiteracy', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select literacy level")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("Low (Simple terms, large text)")}</SelectItem>
                  <SelectItem value="medium">{t("Medium (Balanced approach)")}</SelectItem>
                  <SelectItem value="high">{t("High (Detailed explanations)")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Journey Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="journey">{t("Patient Journey Type")}</Label>
              <Select value={data.journeyType} onValueChange={value => updateField('journeyType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select journey type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elective">{t("Elective Care")}</SelectItem>
                  <SelectItem value="emergency">{t("Emergency")}</SelectItem>
                  <SelectItem value="chronic">{t("Chronic Management")}</SelectItem>
                  <SelectItem value="first-time">{t("First-time Diagnosis")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Risk Appetite Selection */}
            <div className="space-y-2">
              <Label htmlFor="risk">{t("Risk Communication Preference")}</Label>
              <Select value={data.riskAppetite} onValueChange={value => updateField('riskAppetite', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select preference")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">{t("Minimal details")}</SelectItem>
                  <SelectItem value="balanced">{t("Balanced information")}</SelectItem>
                  <SelectItem value="detailed">{t("Detailed explanation")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section Selection */}
          <div className="space-y-4">
            <Label>{t("Sections to include")}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SECTION_IDS.map(sectionId => (
                <div key={sectionId} className="flex items-center space-x-2">
                  <Checkbox
                    id={`section-${sectionId}`}
                    checked={data.selectedSectionIds.includes(sectionId)}
                    onCheckedChange={checked => handleSectionSelectionChange(sectionId, !!checked)}
                  />
                  <Label htmlFor={`section-${sectionId}`}>{t(SECTION_TITLE_KEYS[sectionId])}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between pt-6 border-t border-border">
            <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("Clinical Documents")}
            </Button>
            <Button onClick={handleNext} disabled={!isValid} className="w-full sm:w-auto">
              {t("Generate AI Draft")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientProfile;
