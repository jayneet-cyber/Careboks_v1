import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import MedicalHeader from "@/components/MedicalHeader";
import TechnicalNoteInput from "@/components/TechnicalNoteInput";
import PatientProfile from "@/components/PatientProfile";
import { ClinicianApproval } from "@/components/ClinicianApproval";
import { Feedback } from "@/components/Feedback";
import { ParsedSection } from "@/utils/draftParser";
import { useCasePersistence } from "@/hooks/useCasePersistence";

type Step = 'input' | 'profile' | 'approval' | 'output' | 'feedback';

interface PatientData {
  age: string;
  sex: string;
  language: string;
  healthLiteracy: string;
  journeyType: string;
  riskAppetite: string;
  hasAccessibilityNeeds: boolean;
  includeRelatives: boolean;
  comorbidities: string[];
}

interface LocationState {
  returnToCaseId?: string;
  navigateToStep?: Step;
  sections?: ParsedSection[];
}

interface IndexProps {
  onLogout: () => void;
}

const Index = ({ onLogout }: IndexProps) => {
  const location = useLocation();
  const { loadCase } = useCasePersistence();
  
  const [currentStep, setCurrentStep] = useState<Step>('input');
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const [technicalNote, setTechnicalNote] = useState("");
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [aiDraft, setAiDraft] = useState("");
  const [aiSections, setAiSections] = useState<ParsedSection[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [finalText, setFinalText] = useState("");
  const [approvedSections, setApprovedSections] = useState<ParsedSection[]>([]);

  // Updated steps order: Input → Profile → Approval → Output → Feedback
  const steps: Step[] = ['input', 'profile', 'approval', 'output', 'feedback'];
  const currentStepIndex = steps.indexOf(currentStep);
  const totalSteps = steps.length;

  // Handle returning from print preview or navigating to specific step
  useEffect(() => {
    const state = location.state as LocationState | null;
    if (state?.returnToCaseId && state.returnToCaseId !== currentCaseId) {
      
      // CRITICAL: If sections are passed in state, restore them immediately
      // This preserves all edits when navigating back from PrintPreview/Feedback
      if (state.sections && state.sections.length > 0) {
        setApprovedSections(state.sections);
        setAiSections(state.sections);
      }
      
      // Load the case and restore other state
      loadCase(state.returnToCaseId).then(({ data, error }) => {
        if (data && !error) {
          setCurrentCaseId(data.id);
          setTechnicalNote(data.technical_note || "");
          
          // Restore patient profile if exists
          if (data.patient_profiles?.[0]) {
            const profile = data.patient_profiles[0];
            setPatientData({
              age: profile.age_bracket || "",
              sex: profile.sex || "",
              language: profile.language || "english",
              healthLiteracy: profile.health_literacy || "",
              journeyType: profile.journey_type || "",
              riskAppetite: profile.risk_appetite || "",
              hasAccessibilityNeeds: profile.has_accessibility_needs || false,
              includeRelatives: profile.include_relatives || false,
              comorbidities: profile.comorbidities || []
            });
          }
          
          // Restore AI analysis if exists (only if sections not passed in state)
          if (data.ai_analyses?.[0] && (!state.sections || state.sections.length === 0)) {
            setAiDraft(data.ai_analyses[0].ai_draft_text || "");
            setAnalysis(data.ai_analyses[0].analysis_data);
          }
          
          // Navigate to the requested step or default to approval
          const targetStep = state.navigateToStep || 'approval';
          setCurrentStep(targetStep);
        }
      });
      
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleTechnicalNoteSubmit = (note: string, caseId: string) => {
    setTechnicalNote(note);
    setCurrentCaseId(caseId);
    setCurrentStep('profile');
  };

  const handlePatientProfileSubmit = (data: PatientData) => {
    setPatientData(data);
    setCurrentStep('approval');
  };

  const handleAIProcessingComplete = (draft: string, analysisData?: any, sectionsData?: ParsedSection[]) => {
    setAiDraft(draft);
    setAnalysis(analysisData);
    setAiSections(sectionsData || []);
    setCurrentStep('approval');
  };

  // Approval now navigates to output (PrintPreview) - handled via navigate in ClinicianApproval
  const handleClinicianApproval = (approvedText: string, clinicianName: string, sections: ParsedSection[]) => {
    setFinalText(approvedText);
    setApprovedSections(sections);
    // Note: Navigation to PrintPreview is handled in ClinicianApproval via navigate()
  };

  // Back from feedback goes to approval (so user can edit and go to print again)
  const handleFeedbackBack = () => {
    setCurrentStep('approval');
  };

  const handleRestart = () => {
    setCurrentStep('input');
    setCurrentCaseId(null);
    setTechnicalNote("");
    setPatientData(null);
    setAiDraft("");
    setAiSections([]);
    setAnalysis(null);
    setFinalText("");
    setApprovedSections([]);
  };

  const handleBack = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleBackToProfile = () => {
    // Clear AI-generated content so it regenerates with updated profile
    setAiDraft("");
    setAiSections([]);
    setApprovedSections([]);
    setAnalysis(null);
    setCurrentStep('profile');
  };

  const handleLogoClick = () => {
    if (currentStepIndex >= 1) {
      setCurrentStep('input');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MedicalHeader 
        currentStep={currentStepIndex + 1} 
        totalSteps={totalSteps} 
        onLogout={onLogout}
        onLogoClick={handleLogoClick}
        caseId={currentCaseId}
      />
      
      <main className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        {currentStep === 'input' && (
          <TechnicalNoteInput 
            onNext={handleTechnicalNoteSubmit} 
            initialNote={technicalNote}
            caseId={currentCaseId}
          />
        )}
        
        {currentStep === 'profile' && currentCaseId && (
          <PatientProfile 
            caseId={currentCaseId}
            onNext={handlePatientProfileSubmit} 
            onBack={handleBack}
            initialData={patientData || undefined}
          />
        )}
        
        {currentStep === 'approval' && currentCaseId && patientData && (
          <ClinicianApproval 
            caseId={currentCaseId}
            draft={aiDraft}
            sections={approvedSections.length > 0 ? approvedSections : aiSections}
            analysis={analysis}
            patientData={patientData}
            technicalNote={technicalNote}
            onApprove={handleClinicianApproval}
            onBack={handleBackToProfile}
          />
        )}

        {currentStep === 'feedback' && currentCaseId && (
          <Feedback 
            caseId={currentCaseId}
            sections={approvedSections.length > 0 ? approvedSections : aiSections}
            onBack={handleFeedbackBack}
            onRestart={handleRestart}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
