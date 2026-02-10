/**
 * @fileoverview Hook for managing published patient documents
 *
 * Provides functions to publish documents, fetch by token,
 * and manage document lifecycle.
 */

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { requestBackendAuthed, requestBackendPublic } from "@/integrations/auth/backendApi";

export interface PublishedDocument {
  id: string;
  case_id: string;
  access_token: string;
  sections_data: any;
  patient_language: string;
  clinician_name: string;
  hospital_name?: string;
  published_at: string;
}

/**
 * Hook for publishing and fetching patient documents
 */
export function usePublishedDocument() {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();

  /**
   * Publishes a document and returns the access token
   */
  const publishDocument = async (
    caseId: string,
    sections: { title: string; content: string }[],
    clinicianName: string,
    language: string,
    hospitalName?: string
  ): Promise<string | null> => {
    setIsPublishing(true);

    try {
      const data = await requestBackendAuthed<PublishedDocument>("/documents", {
        method: "POST",
        body: {
          caseId,
          sectionsData: sections,
          patientLanguage: language,
          clinicianName,
          hospitalName
        }
      });

      return data.access_token;
    } catch (error: any) {
      console.error("Error publishing document:", error);
      toast({
        title: "Publishing failed",
        description: error.message || "Could not publish document",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsPublishing(false);
    }
  };

  /**
   * Fetches a published document by access token (public access)
   */
  const fetchByToken = async (token: string): Promise<PublishedDocument | null> => {
    setIsFetching(true);

    try {
      const data = await requestBackendPublic<PublishedDocument>(`/public/documents/${token}`);
      return data;
    } catch (error: any) {
      console.error("Error fetching document:", error);
      return null;
    } finally {
      setIsFetching(false);
    }
  };

  /**
   * Gets published document for a case (authenticated)
   */
  const getDocumentForCase = async (caseId: string): Promise<PublishedDocument | null> => {
    try {
      const data = await requestBackendAuthed<PublishedDocument>(`/documents/case/${caseId}`);
      return data;
    } catch {
      return null;
    }
  };

  /**
   * Deactivates a published document
   */
  const deactivateDocument = async (documentId: string): Promise<boolean> => {
    try {
      await requestBackendAuthed<PublishedDocument>(`/documents/${documentId}/deactivate`, {
        method: "PATCH"
      });
      toast({
        title: "Document deactivated",
        description: "The shared link is no longer accessible"
      });
      return true;
    } catch (error: any) {
      console.error("Error deactivating document:", error);
      toast({
        title: "Deactivation failed",
        description: error.message || "Could not deactivate document",
        variant: "destructive"
      });
      return false;
    }
  };

  /**
   * Builds the public document URL
   */
  const getDocumentUrl = (accessToken: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/document/${accessToken}`;
  };

  return {
    publishDocument,
    fetchByToken,
    getDocumentForCase,
    deactivateDocument,
    getDocumentUrl,
    isPublishing,
    isFetching
  };
}
