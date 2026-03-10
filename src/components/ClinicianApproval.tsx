/**
 * @fileoverview Clinician Approval Component
 * 
 * Third step of the patient communication workflow. Handles:
 * - AI document generation (if not already generated)
 * - Section-by-section review and editing
 * - AI regeneration of individual sections
 * - Print preview functionality
 * - Final clinician approval with signature
 * 
 * @module components/ClinicianApproval
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCasePersistence } from "@/hooks/useCasePersistence";
import { supabase } from "@/integrations/supabase/client";
import { Printer, ChevronLeft, FileCheck, Heart, Activity, Calendar, Sparkles, Pill, Phone, AlertTriangle, Loader2, Share2 } from "lucide-react";
import { usePublishedDocument } from "@/hooks/usePublishedDocument";
import { SectionBox } from "@/components/SectionBox";
import { parseDraftIntoSections, reconstructDraft, ParsedSection } from "@/utils/draftParser";
import { parseStructuredDocument, structuredDocumentToText } from "@/utils/structuredDocumentParser";
import { useAppLanguage } from "@/lib/i18n";
import {
  SECTION_IDS,
  SECTION_TITLE_KEYS,
  normalizeSelectedSectionIds,
  filterSectionsBySelection,
  withSectionIds,
  type SectionId
} from "@/lib/documentSections";

/**
 * Props for the ClinicianApproval component
 */
interface ClinicianApprovalProps {
  /** ID of the current case */
  caseId: string;
  /** Pre-generated draft text (optional, for v1 pipeline) */
  draft: string;
  /** Pre-parsed sections (optional, for v2 pipeline) */
  sections?: ParsedSection[];
  /** Analysis metadata from AI */
  analysis?: any;
  /** Patient profile data for personalization */
  patientData: any;
  /** Original technical note */
  technicalNote: string;
  /** Callback when document is approved */
  onApprove: (finalText: string, clinicianName: string, sections: ParsedSection[]) => void;
  /** Callback to return to previous step */
  onBack: () => void;
}

/**
 * Section configuration for display
 */
interface SectionConfig {
  /** Stable section id */
  id: SectionId;
  /** Original section index for AI regenerate endpoint */
  originalIndex: number;
  /** Section title */
  title: string;
  /** Icon component */
  icon: React.ReactNode;
  /** Tailwind color class */
  themeColor: string;
}

/** Section display configurations */
const SECTION_CONFIGS: SectionConfig[] = [
  { id: SECTION_IDS[0], originalIndex: 0, title: SECTION_TITLE_KEYS.what_i_have, icon: <Heart />, themeColor: "text-blue-600" },
  { id: SECTION_IDS[1], originalIndex: 1, title: SECTION_TITLE_KEYS.how_to_live, icon: <Activity />, themeColor: "text-green-600" },
  { id: SECTION_IDS[2], originalIndex: 2, title: SECTION_TITLE_KEYS.timeline, icon: <Calendar />, themeColor: "text-purple-600" },
  { id: SECTION_IDS[3], originalIndex: 3, title: SECTION_TITLE_KEYS.life_impact, icon: <Sparkles />, themeColor: "text-yellow-600" },
  { id: SECTION_IDS[4], originalIndex: 4, title: SECTION_TITLE_KEYS.medications, icon: <Pill />, themeColor: "text-orange-600" },
  { id: SECTION_IDS[5], originalIndex: 5, title: SECTION_TITLE_KEYS.warnings, icon: <AlertTriangle />, themeColor: "text-red-600" },
  { id: SECTION_IDS[6], originalIndex: 6, title: SECTION_TITLE_KEYS.contacts, icon: <Phone />, themeColor: "text-teal-600" },
];

const SECTION_CONFIG_BY_ID = SECTION_CONFIGS.reduce<Record<SectionId, SectionConfig>>((acc, config) => {
  acc[config.id] = config;
  return acc;
}, {} as Record<SectionId, SectionConfig>);

/**
 * Clinician Approval Component
 * 
 * Allows clinicians to review, edit, and approve AI-generated
 * patient communication documents before delivery.
 * 
 * @example
 * ```tsx
 * <ClinicianApproval
 *   caseId="123-abc"
 *   draft=""
 *   patientData={patientProfile}
 *   technicalNote={clinicalNote}
 *   onApprove={handleApproval}
 *   onBack={() => goToPatientProfile()}
 * />
 * ```
 */
export const ClinicianApproval = ({
  caseId,
  draft,
  sections: preParsedSections,
  analysis,
  patientData,
  technicalNote,
  onApprove,
  onBack,
}: ClinicianApprovalProps) => {
  // State
  const [sections, setSections] = useState<ParsedSection[]>([]);
  const [clinicianName, setClinicianName] = useState("");
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  
  const { toast } = useToast();
  const { t } = useAppLanguage();
  const { saveApproval, updateCase, saveAIAnalysis } = useCasePersistence();
  const navigate = useNavigate();
  const selectedSectionIds = normalizeSelectedSectionIds(patientData?.selectedSectionIds);
  const selectedSectionSet = new Set(selectedSectionIds);

  const getSectionById = (allSections: ParsedSection[], sectionId: SectionId): ParsedSection | undefined => {
    const withIds = withSectionIds(allSections);
    return withIds.find(section => section.id === sectionId);
  };

  const visibleSections = filterSectionsBySelection(sections, selectedSectionIds);
  const visibleConfigs = SECTION_CONFIGS.filter(config => selectedSectionSet.has(config.id));

  /**
   * Initialize sections from props or trigger generation
   */
  useEffect(() => {
    const shouldGenerate = !draft && (!preParsedSections || preParsedSections.length === 0);
    
    if (shouldGenerate) {
      handleStartGeneration();
    } else if (preParsedSections && preParsedSections.length > 0) {
      setSections(preParsedSections);
    } else {
      const parsed = parseDraftIntoSections(draft);
      setSections(parsed);
    }
  }, []);

  /**
   * Generates patient document using v2 AI pipeline
   */
  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setGenerationError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Session expired. Please log in again.');
      }

      const { data: documentData, error: documentError } = await supabase.functions.invoke(
        'generate-patient-document-v2',
        {
          body: { technicalNote, patientData },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (documentError) throw documentError;
      if (!documentData?.document) throw new Error("No document data received");

      // Parse structured JSON into sections
      const parsedSections = parseStructuredDocument(documentData.document, patientData.language);
      setSections(parsedSections);

      // Generate text for database storage
      const draftText = structuredDocumentToText(parsedSections);

      // Save to database
      await saveAIAnalysis(
        caseId,
        { method: 'v2-single-stage', validation: documentData.validation },
        draftText,
        documentData.model || 'google/gemini-2.5-flash'
      );

      await updateCase(caseId, { status: 'processing' });

      toast({
        title: t("Document Generated"),
        description: t("Patient-friendly document is ready for review."),
      });

    } catch (err: any) {
      console.error("Error during AI generation:", err);
      
      let errorMessage = "An error occurred during generation";
      if (err.message?.includes("Rate limit")) {
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else if (err.message?.includes("Payment required")) {
        errorMessage = "Payment required. Please add credits to your workspace.";
      } else if (err.message?.includes("AI generation incomplete")) {
        errorMessage = "AI validation failed. Please try regenerating.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setGenerationError(errorMessage);
      toast({
        title: t("Generation Failed"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Updates a section's content after editing
   */
  const handleSectionEdit = (sectionId: SectionId, newContent: string) => {
    const updated = [...sections];
    const targetIndex = updated.findIndex((section, index) => {
      const id = section.id ?? SECTION_IDS[index];
      return id === sectionId;
    });

    if (targetIndex === -1) {
      return;
    }

    updated[targetIndex].content = newContent;
    setSections(updated);
  };

  /**
   * Regenerates a single section using AI
   */
  const handleRegenerateSection = async (sectionId: SectionId) => {
    const sectionConfig = SECTION_CONFIG_BY_ID[sectionId];
    const originalIndex = sectionConfig.originalIndex;
    setRegeneratingIndex(originalIndex);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Session expired. Please log in again.');
      }

      const { data, error } = await supabase.functions.invoke('regenerate-section', {
        body: {
          sectionIndex: originalIndex,
          sectionTitle: sectionConfig.title,
          currentContent: getSectionById(sections, sectionId)?.content || "",
          analysis: analysis,
          patientData: patientData,
          technicalNote: technicalNote,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      
      // Update section with regenerated content
      const updated = [...sections];
      const targetIndex = updated.findIndex((section, index) => {
        const id = section.id ?? SECTION_IDS[index];
        return id === sectionId;
      });

      if (targetIndex === -1) {
        throw new Error("Section not found");
      }

      updated[targetIndex] = {
        ...updated[targetIndex],
        content: data.regeneratedContent
      };
      setSections(updated);
      
      toast({
        title: t("Section regenerated"),
        description: t('"{title}" has been updated with AI-generated content', { title: sectionConfig.title }),
      });
    } catch (error) {
      console.error("Regeneration error:", error);
      toast({
        title: t("Regeneration failed"),
        description: t("Could not regenerate section. Please try editing manually."),
        variant: "destructive",
      });
    } finally {
      setRegeneratingIndex(null);
    }
  };

  // Hook for publishing
  const { publishDocument, getDocumentUrl, isPublishing } = usePublishedDocument();

  /**
   * Approves document, publishes it, saves to database, and navigates to PrintPreview
   */
  const handleApprove = async () => {
    if (!clinicianName.trim()) {
      toast({
        title: t("Clinician name required"),
        description: t("Please enter your name before approving"),
        variant: "destructive",
      });
      return;
    }

    try {
      const finalText = reconstructDraft(visibleSections);
      
      // Save approval to database
      await saveApproval(caseId, finalText, clinicianName);
      await updateCase(caseId, { status: "approved" });

      // Publish the document and get shareable URL
      const language = patientData?.language || 'english';
      const token = await publishDocument(
        caseId,
        visibleSections,
        clinicianName,
        language,
        selectedSectionIds,
        undefined // hospitalName
      );

      // Call onApprove to update parent state
      onApprove(finalText, clinicianName, visibleSections);

      // Navigate to PrintPreview (output step) with published URL
      navigate(`/app/print-preview/${caseId}`, {
        state: {
          sections: visibleSections,
          selectedSectionIds,
          clinicianName,
          language,
          hospitalName: undefined,
          publishedUrl: token ? getDocumentUrl(token) : undefined
        }
      });
    } catch (error) {
      console.error("Error approving document:", error);
      toast({
        title: t("Approval failed"),
        description: t("Could not save approval. Please try again."),
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (isGenerating) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              {t("Generating Patient Document")}
            </CardTitle>
            <CardDescription>
              {t("AI is creating a personalized, patient-friendly explanation based on your technical note...")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">{t("This may take a moment...")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (generationError) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Card className="shadow-card border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">{t("Generation Failed")}</CardTitle>
            <CardDescription>{generationError}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button onClick={onBack} variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" />
                {t("Back to Profile")}
              </Button>
              <Button onClick={handleStartGeneration}>
                {t("Try Again")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state
  if (sections.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>{t("No Content Available")}</CardTitle>
            <CardDescription>{t("Unable to load document sections.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onBack} variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              {t("Go Back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main approval UI
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-primary" />
            {t("Review & Edit Patient Communication")}
          </CardTitle>
          <CardDescription>
            {t("Review each section below, make any necessary edits, and approve the final document")}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Section Grid (first 6 sections) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleConfigs.filter(config => config.id !== 'contacts').map((config) => (
          <SectionBox
            key={config.id}
            icon={config.icon}
            title={t(config.title)}
            content={getSectionById(sections, config.id)?.content || ""}
            onEdit={(newContent) => handleSectionEdit(config.id, newContent)}
            onRegenerate={() => handleRegenerateSection(config.id)}
            isRegenerating={regeneratingIndex === config.originalIndex}
            themeColor={config.themeColor}
          />
        ))}
      </div>

      {/* Contacts Section (full width) */}
      {selectedSectionSet.has('contacts') && (
          <SectionBox
            icon={SECTION_CONFIG_BY_ID.contacts.icon}
            title={t(SECTION_CONFIG_BY_ID.contacts.title)}
            content={getSectionById(sections, 'contacts')?.content || ""}
            onEdit={(newContent) => handleSectionEdit('contacts', newContent)}
            onRegenerate={() => handleRegenerateSection('contacts')}
            isRegenerating={regeneratingIndex === SECTION_CONFIG_BY_ID.contacts.originalIndex}
            themeColor={SECTION_CONFIG_BY_ID.contacts.themeColor}
          />
      )}

      {/* Clinical Safety Reminders */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-lg text-amber-900">{t("Clinical Safety Reminders")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            <li>{t("Verify all medication names, doses, and instructions are accurate")}</li>
            <li>{t("Ensure emergency contact information is complete and correct")}</li>
            <li>{t("Confirm warning signs are clear and specific to the patient's condition")}</li>
            <li>{t("Check that lifestyle advice is appropriate for the patient's specific situation")}</li>
            <li>{t("Ensure language is appropriate for the patient's health literacy level")}</li>
          </ul>
        </CardContent>
      </Card>

      {/* Approving Clinician */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("Approving Clinician")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="clinician-name">{t("Approving Clinician Name *")}</Label>
            <Input
              id="clinician-name"
              value={clinicianName}
              onChange={(e) => setClinicianName(e.target.value)}
              placeholder={t("Enter clinician name")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("Actions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={onBack} variant="outline" className="w-full sm:flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t("Patient Profile")}
            </Button>
            <Button onClick={handleApprove} className="w-full sm:flex-1" disabled={isPublishing}>
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  {t("Publishing...")}
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-1" />
                  {t("Print & Publish for Patient")}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
