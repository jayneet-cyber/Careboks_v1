/**
 * @fileoverview Hook for managing published patient documents
 * 
 * Provides functions to publish documents, fetch by token,
 * and manage document lifecycle.
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
 * Generates a cryptographically random URL-safe token
 */
function generateAccessToken(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, v => chars[v % chars.length]).join('');
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const accessToken = generateAccessToken();
      
      const { error } = await supabase
        .from('published_documents')
        .insert({
          case_id: caseId,
          created_by: user.id,
          access_token: accessToken,
          sections_data: sections,
          patient_language: language,
          clinician_name: clinicianName,
          hospital_name: hospitalName
        });
      
      if (error) throw error;
      
      return accessToken;
      
    } catch (error: any) {
      console.error('Error publishing document:', error);
      toast({
        title: 'Publishing failed',
        description: error.message || 'Could not publish document',
        variant: 'destructive'
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
      const { data, error } = await supabase
        .rpc('get_published_document_by_token', { token });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return null;
      }
      
      return data[0] as PublishedDocument;
      
    } catch (error: any) {
      console.error('Error fetching document:', error);
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
      const { data, error } = await supabase
        .from('published_documents')
        .select('*')
        .eq('case_id', caseId)
        .eq('is_active', true)
        .order('published_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      return data as PublishedDocument | null;
      
    } catch (error: any) {
      console.error('Error getting document for case:', error);
      return null;
    }
  };

  /**
   * Deactivates a published document
   */
  const deactivateDocument = async (documentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('published_documents')
        .update({ is_active: false })
        .eq('id', documentId);
      
      if (error) throw error;
      
      toast({
        title: 'Document deactivated',
        description: 'The shared link is no longer accessible'
      });
      
      return true;
    } catch (error: any) {
      console.error('Error deactivating document:', error);
      toast({
        title: 'Deactivation failed',
        description: error.message || 'Could not deactivate document',
        variant: 'destructive'
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
