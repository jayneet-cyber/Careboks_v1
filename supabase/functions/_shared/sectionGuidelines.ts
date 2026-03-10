export interface SectionGuidelineDefinition {
  index: number;
  fullGuidelineLines: string[];
  regenerateFocus: string;
}

export const SECTION_GUIDELINE_DEFINITIONS: SectionGuidelineDefinition[] = [
  {
    index: 0,
    fullGuidelineLines: [
      "State the diagnosis in plain language",
      "Provide a simple explanation of what it means",
      "Include relevant test results in understandable terms",
      "Avoid overwhelming with too many medical details",
    ],
    regenerateFocus: "Explain the diagnosis in plain language with relevant test results",
  },
  {
    index: 1,
    fullGuidelineLines: [
      "Practical, actionable daily instructions",
      "Diet, fluid intake, physical activity",
      "Daily monitoring tasks (weight, symptoms)",
      "What to do and what to avoid",
      "Be specific with measurements (liters, grams, minutes)",
    ],
    regenerateFocus: "Provide practical daily instructions for diet, activity, and monitoring",
  },
  {
    index: 2,
    fullGuidelineLines: [
      "Timeline broken into phases (first 2 weeks, 1-3 months, 3-6 months)",
      "What physical changes to expect",
      "Improvements and adjustments",
      "Follow-up schedule",
    ],
    regenerateFocus: "Break down the timeline into phases with expected improvements",
  },
  {
    index: 3,
    fullGuidelineLines: [
      "Long-term lifestyle impact",
      "What patient CAN do (work, travel, hobbies)",
      "What patient MUST do (medications, check-ups)",
      "Realistic but hopeful perspective",
    ],
    regenerateFocus: "Describe long-term lifestyle impact with realistic but hopeful perspective",
  },
  {
    index: 4,
    fullGuidelineLines: [
      "List each medication with:",
      "* Name and dosage",
      "* When to take it",
      "* What it does (in simple terms)",
      "* What happens if not taken",
      "Emphasize: Never stop without consulting doctor",
      "If information is incomplete, note: \"Ask your doctor or nurse for more details\"",
    ],
    regenerateFocus: "List each medication with name, dosage, timing, purpose, and importance",
  },
  {
    index: 5,
    fullGuidelineLines: [
      "Clear list of symptoms requiring immediate action",
      "When to call emergency (112)",
      "When to contact doctor's office",
      "Be specific and concrete",
      "ALWAYS include this section even if clinical note lacks details",
    ],
    regenerateFocus: "List emergency symptoms requiring immediate action",
  },
  {
    index: 6,
    fullGuidelineLines: [
      "Cardiologist/primary physician with phone and email",
      "Nurse hotline or support line",
      "Pharmacy contact",
      "Emergency number (112) with specific situations requiring immediate help",
      "Next appointment date if known",
      "If specific contacts are missing, include: \"Your care team will provide contact information\"",
    ],
    regenerateFocus: "Provide cardiologist/physician contact, nurse hotline, pharmacy, and emergency numbers",
  },
];

export const getRegenerateSectionGuideline = (sectionIndex: number): string => {
  const match = SECTION_GUIDELINE_DEFINITIONS.find((item) => item.index === sectionIndex);
  return match?.regenerateFocus || "Generate appropriate content for this section";
};
