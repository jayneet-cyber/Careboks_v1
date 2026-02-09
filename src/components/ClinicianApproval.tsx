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
  /** Section title */
  title: string;
  /** Icon component */
  icon: React.ReactNode;
  /** Tailwind color class */
  themeColor: string;
}

/** Section display configurations */
const SECTION_CONFIGS: SectionConfig[] = [
  { title: "What do I have", icon: <Heart />, themeColor: "text-blue-600" },
  { title: "How should I live next", icon: <Activity />, themeColor: "text-green-600" },
  { title: "How the next 6 months of my life will look like", icon: <Calendar />, themeColor: "text-purple-600" },
  { title: "What does it mean for my life", icon: <Sparkles />, themeColor: "text-yellow-600" },
  { title: "My medications", icon: <Pill />, themeColor: "text-orange-600" },
  { title: "Warning signs", icon: <AlertTriangle />, themeColor: "text-red-600" },
  { title: "My contacts", icon: <Phone />, themeColor: "text-teal-600" },
];

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
  const { saveApproval, updateCase, saveAIAnalysis } = useCasePersistence();
  const navigate = useNavigate();

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
      const { data: documentData, error: documentError } = await supabase.functions.invoke(
        'generate-patient-document-v2',
        { body: { technicalNote, patientData } }
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
        title: "Document Generated",
        description: "Patient-friendly document is ready for review.",
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
        title: "Generation Failed",
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
  const handleSectionEdit = (index: number, newContent: string) => {
    const updated = [...sections];
    updated[index].content = newContent;
    setSections(updated);
  };

  /**
   * Regenerates a single section using AI
   */
  const handleRegenerateSection = async (index: number) => {
    setRegeneratingIndex(index);
    
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-section', {
        body: {
          sectionIndex: index,
          sectionTitle: SECTION_CONFIGS[index].title,
          currentContent: sections[index]?.content || "",
          analysis: analysis,
          patientData: patientData,
          technicalNote: technicalNote,
        }
      });
      
      if (error) throw error;
      
      // Update section with regenerated content
      const updated = [...sections];
      updated[index] = {
        ...updated[index],
        content: data.regeneratedContent
      };
      setSections(updated);
      
      toast({
        title: "Section regenerated",
        description: `"${SECTION_CONFIGS[index].title}" has been updated with AI-generated content`,
      });
    } catch (error) {
      console.error("Regeneration error:", error);
      toast({
        title: "Regeneration failed",
        description: "Could not regenerate section. Please try editing manually.",
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
        title: "Clinician name required",
        description: "Please enter your name before approving",
        variant: "destructive",
      });
      return;
    }

    try {
      const finalText = reconstructDraft(sections);
      
      // Save approval to database
      await saveApproval(caseId, finalText, clinicianName);
      await updateCase(caseId, { status: "approved" });

      // Publish the document and get shareable URL
      const language = patientData?.language || 'english';
      const token = await publishDocument(
        caseId,
        sections,
        clinicianName,
        language,
        undefined // hospitalName
      );

      // Call onApprove to update parent state
      onApprove(finalText, clinicianName, sections);

      // Navigate to PrintPreview (output step) with published URL
      navigate(`/app/print-preview/${caseId}`, {
        state: {
          sections,
          clinicianName,
          language,
          hospitalName: undefined,
          publishedUrl: token ? getDocumentUrl(token) : undefined
        }
      });
    } catch (error) {
      console.error("Error approving document:", error);
      toast({
        title: "Approval failed",
        description: "Could not save approval. Please try again.",
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
              Generating Patient Document
            </CardTitle>
            <CardDescription>
              AI is creating a personalized, patient-friendly explanation based on your technical note...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">This may take a moment...</p>
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
            <CardTitle className="text-destructive">Generation Failed</CardTitle>
            <CardDescription>{generationError}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button onClick={onBack} variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Profile
              </Button>
              <Button onClick={handleStartGeneration}>
                Try Again
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
            <CardTitle>No Content Available</CardTitle>
            <CardDescription>Unable to load document sections.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onBack} variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Go Back
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
            Review & Edit Patient Communication
          </CardTitle>
          <CardDescription>
            Review each section below, make any necessary edits, and approve the final document
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Section Grid (first 6 sections) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTION_CONFIGS.slice(0, 6).map((config, index) => (
          <SectionBox
            key={index}
            icon={config.icon}
            title={config.title}
            content={sections[index]?.content || ""}
            onEdit={(newContent) => handleSectionEdit(index, newContent)}
            onRegenerate={() => handleRegenerateSection(index)}
            isRegenerating={regeneratingIndex === index}
            themeColor={config.themeColor}
          />
        ))}
      </div>

      {/* Contacts Section (full width) */}
      <SectionBox
        icon={SECTION_CONFIGS[6].icon}
        title={SECTION_CONFIGS[6].title}
        content={sections[6]?.content || ""}
        onEdit={(newContent) => handleSectionEdit(6, newContent)}
        onRegenerate={() => handleRegenerateSection(6)}
        isRegenerating={regeneratingIndex === 6}
        themeColor={SECTION_CONFIGS[6].themeColor}
      />

      {/* Clinical Safety Reminders */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-lg text-amber-900">Clinical Safety Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            <li>Verify all medication names, doses, and instructions are accurate</li>
            <li>Ensure emergency contact information is complete and correct</li>
            <li>Confirm warning signs are clear and specific to the patient's condition</li>
            <li>Check that lifestyle advice is appropriate for the patient's specific situation</li>
            <li>Ensure language is appropriate for the patient's health literacy level</li>
          </ul>
        </CardContent>
      </Card>

      {/* Approving Clinician */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Approving Clinician</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="clinician-name">Approving Clinician Name *</Label>
            <Input
              id="clinician-name"
              value={clinicianName}
              onChange={(e) => setClinicianName(e.target.value)}
              placeholder="Dr. Jane Smith"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={onBack} variant="outline" className="w-full sm:flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Patient Profile
            </Button>
            <Button onClick={handleApprove} className="w-full sm:flex-1" disabled={isPublishing}>
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-1" />
                  Print & Publish for Patient
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
