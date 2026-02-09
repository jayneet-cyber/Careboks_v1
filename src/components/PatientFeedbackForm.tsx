/**
 * @fileoverview Patient Feedback Form Component
 * 
 * A feedback form displayed to patients after viewing their care document
 * via QR code. This allows patients to provide anonymous feedback without
 * requiring authentication.
 * 
 * Features:
 * - One-time submission per document (persisted in localStorage)
 * - Auto-dismissing confirmation (3 seconds)
 * 
 * @module components/PatientFeedbackForm
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = 'patientFeedbackSubmitted';

/**
 * Props for the PatientFeedbackForm component
 */
interface PatientFeedbackFormProps {
  /** The case ID associated with this document */
  caseId: string;
  /** The published document ID */
  publishedDocumentId: string;
  /** Callback when feedback is successfully submitted and confirmation dismissed */
  onSubmitComplete?: () => void;
}

/**
 * Patient-friendly feedback options
 */
const PATIENT_FEEDBACK_OPTIONS = [
  "The document was easy to understand",
  "I understand my condition better now",
  "The medication information was helpful",
  "I know what warning signs to watch for",
  "I understand what lifestyle changes I need to make",
  "I would like more details about my treatment"
];

/**
 * Patient Feedback Form Component
 * 
 * Renders a feedback form for patients viewing their document via QR code.
 * The form is anonymous and doesn't require authentication.
 * Only allows one submission per document (tracked via localStorage).
 * 
 * @example
 * ```tsx
 * <PatientFeedbackForm
 *   caseId="abc-123"
 *   publishedDocumentId="doc-456"
 *   onSubmitComplete={() => console.log('Done!')}
 * />
 * ```
 */
export const PatientFeedbackForm = ({
  caseId,
  publishedDocumentId,
  onSubmitComplete
}: PatientFeedbackFormProps) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [additionalComments, setAdditionalComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const { toast } = useToast();

  // Check localStorage on mount for previous submission
  useEffect(() => {
    try {
      const submittedDocs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (submittedDocs.includes(publishedDocumentId)) {
        setAlreadySubmitted(true);
      }
    } catch {
      // If localStorage fails, allow submission
    }
  }, [publishedDocumentId]);

  // Auto-dismiss confirmation after 3 seconds
  useEffect(() => {
    if (hasSubmitted) {
      const timer = setTimeout(() => {
        setShowConfirmation(false);
        onSubmitComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasSubmitted, onSubmitComplete]);

  /**
   * Handles checkbox selection changes
   */
  const handleCheckboxChange = (option: string, checked: boolean) => {
    if (checked) {
      setSelectedOptions(prev => [...prev, option]);
    } else {
      setSelectedOptions(prev => prev.filter(o => o !== option));
    }
  };

  /**
   * Submits feedback to the database
   */
  const handleSubmit = async () => {
    if (selectedOptions.length === 0 && !additionalComments.trim()) {
      toast({
        title: "Please provide feedback",
        description: "Select at least one option or add a comment.",
        variant: "warning"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('patient_feedback').insert({
        case_id: caseId,
        published_document_id: publishedDocumentId,
        feedback_source: 'qr_view',
        selected_options: selectedOptions,
        additional_comments: additionalComments.trim() || null
      });

      if (error) throw error;

      // Save to localStorage to prevent re-submission
      try {
        const submittedDocs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        submittedDocs.push(publishedDocumentId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(submittedDocs));
      } catch {
        // Continue even if localStorage fails
      }

      toast({
        title: "Thank you for your feedback!",
        description: "Your response helps us improve."
      });
      setHasSubmitted(true);
    } catch (err) {
      console.error("Patient feedback submission error:", err);
      toast({
        title: "Could not submit feedback",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render if already submitted previously
  if (alreadySubmitted) {
    return null;
  }

  // Show thank you message for 3 seconds after submission
  if (hasSubmitted) {
    if (!showConfirmation) {
      return null;
    }
    return (
      <Card className="mt-8 border-primary/20 bg-primary/5">
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="font-semibold text-lg">
            Thank you for your feedback!
          </h3>
          <p className="text-muted-foreground mt-2">
            Your response helps us improve patient care.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>How was this document?</CardTitle>
        <CardDescription>
          Your feedback helps us improve the information we provide to patients.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Checkbox Options */}
        <div className="space-y-3">
          {PATIENT_FEEDBACK_OPTIONS.map(option => (
            <div key={option} className="flex items-center space-x-3">
              <Checkbox
                id={`patient-${option}`}
                checked={selectedOptions.includes(option)}
                onCheckedChange={checked => handleCheckboxChange(option, checked as boolean)}
              />
              <Label
                htmlFor={`patient-${option}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {option}
              </Label>
            </div>
          ))}
        </div>

        {/* Free Text Field */}
        <div className="space-y-2">
          <Label htmlFor="patient-comments">Additional comments (optional)</Label>
          <Textarea
            id="patient-comments"
            value={additionalComments}
            onChange={(e) => setAdditionalComments(e.target.value)}
            placeholder="Share any additional feedback about this document..."
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit} 
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Feedback"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
