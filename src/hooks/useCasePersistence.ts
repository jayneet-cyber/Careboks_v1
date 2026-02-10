import { requestBackendAuthed } from "@/integrations/auth/backendApi";

export type CaseStatus = "draft" | "processing" | "pending_approval" | "approved" | "completed";

export interface CaseData {
  id?: string;
  technicalNote?: string;
  uploadedFileNames?: string[];
  status?: CaseStatus;
}

export interface PatientProfileData {
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

interface OperationResult<T> {
  data: T | null;
  error: Error | null;
}

export const useCasePersistence = () => {
  const createCase = async (
    technicalNote: string,
    uploadedFileNames: string[]
  ): Promise<OperationResult<any>> => {
    try {
      const data = await requestBackendAuthed<any>("/cases", {
        method: "POST",
        body: {
          technicalNote,
          uploadedFileNames
        }
      });

      return { data, error: null };
    } catch (error: any) {
      console.error("Error creating case:", error);
      return { data: null, error };
    }
  };

  const updateCase = async (
    caseId: string,
    updates: Partial<CaseData>
  ): Promise<OperationResult<any>> => {
    try {
      const data = await requestBackendAuthed<any>(`/cases/${caseId}`, {
        method: "PATCH",
        body: {
          technicalNote: updates.technicalNote,
          uploadedFileNames: updates.uploadedFileNames,
          status: updates.status
        }
      });

      return { data, error: null };
    } catch (error: any) {
      console.error("Error updating case:", error);
      return { data: null, error };
    }
  };

  const savePatientProfile = async (
    caseId: string,
    profileData: PatientProfileData
  ): Promise<OperationResult<any>> => {
    try {
      const data = await requestBackendAuthed<any>(`/cases/${caseId}/profile`, {
        method: "POST",
        body: profileData
      });

      return { data, error: null };
    } catch (error: any) {
      console.error("Error saving patient profile:", error);
      return { data: null, error };
    }
  };

  const saveAIAnalysis = async (
    caseId: string,
    analysisData: any,
    aiDraftText: string,
    modelUsed: string = "gemini-2.5-pro"
  ): Promise<OperationResult<any>> => {
    try {
      const data = await requestBackendAuthed<any>(`/cases/${caseId}/analysis`, {
        method: "POST",
        body: {
          analysisData,
          aiDraftText,
          modelUsed
        }
      });

      return { data, error: null };
    } catch (error: any) {
      console.error("Error saving AI analysis:", error);
      return { data: null, error };
    }
  };

  const saveApproval = async (
    caseId: string,
    approvedText: string,
    notes?: string
  ): Promise<OperationResult<any>> => {
    try {
      const data = await requestBackendAuthed<any>(`/cases/${caseId}/approval`, {
        method: "POST",
        body: {
          approvedText,
          notes
        }
      });

      return { data, error: null };
    } catch (error: any) {
      console.error("Error saving approval:", error);
      return { data: null, error };
    }
  };

  const loadCase = async (caseId: string): Promise<OperationResult<any>> => {
    try {
      const data = await requestBackendAuthed<any>(`/cases/${caseId}`);
      return { data, error: null };
    } catch (error: any) {
      console.error("Error loading case:", error);
      return { data: null, error };
    }
  };

  const getCaseHistory = async (limit: number = 10): Promise<OperationResult<any[]>> => {
    try {
      const data = await requestBackendAuthed<any[]>(`/cases?limit=${limit}`);
      return { data, error: null };
    } catch (error: any) {
      console.error("Error fetching case history:", error);
      return { data: null, error };
    }
  };

  return {
    createCase,
    updateCase,
    savePatientProfile,
    saveAIAnalysis,
    saveApproval,
    loadCase,
    getCaseHistory
  };
};
