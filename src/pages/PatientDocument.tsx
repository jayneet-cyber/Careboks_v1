/**
 * @fileoverview Public Patient Document Page
 * 
 * Public route accessible via access token for patients
 * to view their care document without authentication.
 * This is the destination page - no QR code displayed here.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { PrintableDocument } from '@/components/print/PrintableDocument';
import { PatientFeedbackForm } from '@/components/PatientFeedbackForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePublishedDocument, PublishedDocument } from '@/hooks/usePublishedDocument';
import { Printer, Loader2, FileX } from 'lucide-react';

/**
 * Public patient document view page
 */
export default function PatientDocument() {
  const { accessToken } = useParams<{ accessToken: string }>();
  const [patientDoc, setPatientDoc] = useState<PublishedDocument | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(true);
  
  const { fetchByToken, isFetching } = usePublishedDocument();

  useEffect(() => {
    if (accessToken) {
      fetchByToken(accessToken).then(doc => {
        if (doc) {
          setPatientDoc(doc);
        } else {
          setNotFound(true);
        }
      });
    }
  }, [accessToken]);

  /**
   * Setup before/after print event listeners to force print-safe styling
   */
  useEffect(() => {
    const handleBeforePrint = () => {
      document.documentElement.classList.add('is-printing');
    };
    
    const handleAfterPrint = () => {
      document.documentElement.classList.remove('is-printing');
    };
    
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      // Cleanup in case component unmounts while printing
      document.documentElement.classList.remove('is-printing');
    };
  }, []);

  /**
   * Handles browser print dialog with print-safe class timing
   */
  const handlePrint = useCallback(() => {
    // Add class before print to ensure browser captures white background
    document.documentElement.classList.add('is-printing');
    
    // Small delay to let browser apply the class before capturing layout
    setTimeout(() => {
      window.print();
    }, 50);
  }, []);

  // Loading state
  if (isFetching) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your document...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <FileX className="h-6 w-6" />
              Document Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This document may have expired, been deactivated, or the link is incorrect.
            </p>
            <p className="text-muted-foreground mt-2">
              Please contact your healthcare provider for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patientDoc) {
    return null;
  }

  // Parse sections from stored JSON
  const sections = patientDoc.sections_data as { title: string; content: string }[];
  const date = new Date(patientDoc.published_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="print-page min-h-screen bg-muted">
      {/* Action Bar - Hidden on print */}
      <div className="no-print sticky top-0 z-10 bg-background border-b p-4">
        <div className="max-w-[210mm] mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-lg">Your Care Document</h1>
            <p className="text-sm text-muted-foreground">
              Prepared by {patientDoc.clinician_name}
            </p>
          </div>
          
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Printable Document - No QR code since this IS the destination page */}
      <PrintableDocument
        sections={sections}
        language={patientDoc.patient_language}
        clinicianName={patientDoc.clinician_name}
        hospitalName={patientDoc.hospital_name}
        date={date}
        showQrCode={false}
      />

      {/* Patient Feedback Form - Hidden on print, hidden after submission */}
      {feedbackVisible && (
        <div className="no-print max-w-[210mm] mx-auto px-4 pb-12">
          <PatientFeedbackForm 
            caseId={patientDoc.case_id}
            publishedDocumentId={patientDoc.id}
            onSubmitComplete={() => setFeedbackVisible(false)}
          />
        </div>
      )}
    </div>
  );
}
