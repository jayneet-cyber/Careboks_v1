/**
 * @fileoverview Print Preview Page
 * 
 * Clinician-only page for reviewing the styled document,
 * printing, and publishing for patient access.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PrintableDocument } from '@/components/print/PrintableDocument';
import { usePublishedDocument } from '@/hooks/usePublishedDocument';
import { ChevronLeft, Printer, Copy, Check, MessageSquare } from 'lucide-react';

interface LocationState {
  sections: { title: string; content: string }[];
  clinicianName: string;
  language: string;
  hospitalName?: string;
  publishedUrl?: string;
}

/**
 * Print Preview page for clinicians
 */
export default function PrintPreview() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get data passed from approval page
  const state = location.state as LocationState | null;
  
  // Initialize from state if publishedUrl was passed (already published during approval)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(state?.publishedUrl || null);
  const [copied, setCopied] = useState(false);
  
  const { 
    getDocumentForCase,
    getDocumentUrl
  } = usePublishedDocument();

  // Check for existing published document (fallback if not passed in state)
  useEffect(() => {
    if (caseId && !publishedUrl) {
      getDocumentForCase(caseId).then(doc => {
        if (doc) {
          setPublishedUrl(getDocumentUrl(doc.access_token));
        }
      });
    }
  }, [caseId]);

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

  // Redirect if no state passed
  if (!state) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>No Document Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please go through the approval flow to access print preview.
            </p>
            <Button onClick={() => navigate('/app')}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { sections, clinicianName, language, hospitalName } = state;
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  /**
   * Copies URL to clipboard
   */
  const handleCopyUrl = async () => {
    if (!publishedUrl) return;
    
    try {
      await navigator.clipboard.writeText(publishedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail - the button state provides feedback
    }
  };

/**
   * Navigate back to approval step - preserves section edits
   */
  const handleBack = () => {
    navigate('/app', { 
      state: { 
        returnToCaseId: caseId, 
        navigateToStep: 'approval',
        sections: sections  // Pass sections back to preserve edits
      } 
    });
  };

  /**
   * Navigate to feedback step - preserves section edits for potential back navigation
   */
  const handleContinueToFeedback = () => {
    navigate('/app', { 
      state: { 
        returnToCaseId: caseId, 
        navigateToStep: 'feedback',
        sections: sections  // Pass sections for potential back navigation from feedback
      } 
    });
  };

  return (
    <div className="print-page min-h-screen bg-[hsl(215,20%,95%)]">
      {/* Action Bar - Hidden on print */}
      <div className="no-print sticky top-0 z-10 bg-background border-b p-4">
        <div className="max-w-[210mm] mx-auto px-4 md:px-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button 
              variant="outline" 
              onClick={handleBack}
              className="w-full sm:w-auto"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <Button onClick={handlePrint} variant="outline" className="w-full sm:w-auto">
                <Printer className="mr-2 h-4 w-4" />
                Print for Patient
              </Button>
              
              {publishedUrl && (
                <Button 
                  variant="outline"
                  onClick={handleCopyUrl}
                  className="w-full sm:w-auto"
                >
                  {copied ? (
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              )}

              <Button onClick={handleContinueToFeedback} className="w-full sm:w-auto">
                <MessageSquare className="mr-2 h-4 w-4" />
                Continue to Feedback
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Published confirmation - Hidden on print (QR only in printed document footer) */}
      {publishedUrl && (
        <div className="no-print max-w-[210mm] mx-auto p-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <h3 className="font-medium text-green-900">Document Published</h3>
              <p className="text-sm text-green-700">
                The QR code on the printed document will allow patients to access their care document online.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Printable Document */}
      <PrintableDocument
        sections={sections}
        language={language}
        clinicianName={clinicianName}
        hospitalName={hospitalName}
        date={date}
        documentUrl={publishedUrl || undefined}
        showQrCode={!!publishedUrl}
      />
    </div>
  );
}
