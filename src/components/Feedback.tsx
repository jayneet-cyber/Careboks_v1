import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ParsedSection } from "@/utils/draftParser";

interface FeedbackProps {
  caseId: string;
  sections?: ParsedSection[];
  onBack: () => void;
  onRestart: () => void;
}

const FEEDBACK_OPTIONS = [
  "What do I have",
  "How should I live next",
  "How the next 6 months of my life look like",
  "What does it mean for my life",
  "My medications",
  "Warning signs",
  "General Notes"
];

export const Feedback = ({
  caseId,
  sections,
  onBack,
  onRestart
}: FeedbackProps) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [additionalComments, setAdditionalComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skipWarningShown, setSkipWarningShown] = useState(false);
  const { toast } = useToast();

  // Reset skip warning when user adds content
  useEffect(() => {
    if (selectedOptions.length > 0 || additionalComments.trim()) {
      setSkipWarningShown(false);
    }
  }, [selectedOptions, additionalComments]);

  const handleCheckboxChange = (option: string, checked: boolean) => {
    if (checked) {
      setSelectedOptions(prev => [...prev, option]);
    } else {
      setSelectedOptions(prev => prev.filter(o => o !== option));
    }
  };

  /**
   * Combined handler: Submit feedback (if any) and start new patient
   */
  const handleSubmitAndNewPatient = async () => {
    const formIsEmpty = selectedOptions.length === 0 && !additionalComments.trim();
    
    // Empty form: show skip warning, require confirmation
    if (formIsEmpty) {
      if (!skipWarningShown) {
        toast({
          title: "Skip feedback?",
          description: "Click again to start a new patient without feedback.",
        });
        setSkipWarningShown(true);
        return;
      }
      // Second click - proceed without submit
      onRestart();
      return;
    }
    
    // Form has content: submit then restart
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('case_feedback').insert({
        case_id: caseId,
        submitted_by: user.id,
        selected_options: selectedOptions,
        additional_comments: additionalComments.trim() || null
      });

      if (error) throw error;

      toast({
        title: "Feedback submitted",
        description: "Thank you! Starting new patient...",
        duration: 3000
      });
      
      setIsSubmitting(false); // Reset state before timeout
      
      // Brief delay to show toast, then restart
      setTimeout(() => onRestart(), 1000);
      
    } catch (err) {
      console.error("Feedback submission error:", err);
      toast({
        title: "Submission failed",
        description: "Could not save feedback. Please try again.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };


  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Feedback</CardTitle>
          <CardDescription>
            Based on your experience, which feature do you consider most useful for patients?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Checkbox Options */}
          <div className="space-y-3">
            {FEEDBACK_OPTIONS.map(option => (
              <div key={option} className="flex items-center space-x-3">
                <Checkbox
                  id={option}
                  checked={selectedOptions.includes(option)}
                  onCheckedChange={checked => handleCheckboxChange(option, checked as boolean)}
                />
                <Label
                  htmlFor={option}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>

          {/* Free Text Field */}
          <div className="space-y-2">
            <Label htmlFor="comments">Additional Comments/Suggestions</Label>
            <Textarea
              id="comments"
              value={additionalComments}
              onChange={(e) => setAdditionalComments(e.target.value)}
              placeholder="Share any additional feedback about the generated document..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons - Streamlined Two-Button Layout */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={onBack} variant="ghost" className="w-full sm:flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Document
            </Button>
            <Button 
              onClick={handleSubmitAndNewPatient} 
              className="w-full sm:flex-[2]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-1" />
              )}
              Submit & New Patient
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
