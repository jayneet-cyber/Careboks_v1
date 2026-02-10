export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface PatientDocument {
  section_1_what_i_have: string;
  section_2_how_to_live: string;
  section_3_timeline: string;
  section_4_life_impact: string;
  section_5_medications: string;
  section_6_warnings: string;
  section_7_contacts: string;
}

const MIN_SECTION_LENGTH = 50;

export const validateDocument = (doc: PatientDocument, language: string): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredSections: Array<keyof PatientDocument> = [
    "section_1_what_i_have",
    "section_2_how_to_live",
    "section_3_timeline",
    "section_4_life_impact",
    "section_5_medications",
    "section_6_warnings",
    "section_7_contacts"
  ];

  for (const section of requiredSections) {
    const content = doc[section];
    if (!content || content.trim().length === 0) {
      errors.push(`Missing section: ${section}`);
    } else if (content.trim().length < MIN_SECTION_LENGTH) {
      errors.push(`Section too short: ${section} (${content.trim().length} chars, minimum ${MIN_SECTION_LENGTH})`);
    }
  }

  const medicationsSection = doc.section_5_medications?.toLowerCase() || "";
  const hasMedications =
    /medication|medicine|drug|tablet|pill|mg|dose/.test(medicationsSection) ||
    /no medication|not prescribed|your doctor will provide/.test(medicationsSection);
  if (!hasMedications && medicationsSection.length > 0) {
    warnings.push("Medications section may be incomplete");
  }

  const warningsSection = doc.section_6_warnings?.toLowerCase() || "";
  const hasEmergencyInfo = /112|emergency|ambulance|immediate/.test(warningsSection);
  if (!hasEmergencyInfo) {
    errors.push("Warning signs section must include emergency number 112");
  }

  const contactsSection = doc.section_7_contacts?.toLowerCase() || "";
  const hasContactInfo =
    /phone|email|contact|appointment|clinic|hospital|doctor/.test(contactsSection) ||
    /your care team will provide/.test(contactsSection);
  if (!hasContactInfo) {
    warnings.push("Contacts section may be incomplete");
  }

  const allContent = Object.values(doc).join(" ").toLowerCase();
  const uncertaintyPhrases = [
    "i don't know",
    "i'm not sure",
    "unclear from notes",
    "consult doctor for diagnosis",
    "cannot determine",
    "information not available"
  ];
  for (const phrase of uncertaintyPhrases) {
    if (allContent.includes(phrase)) {
      errors.push(`Improper uncertainty language detected: "${phrase}"`);
    }
  }

  for (const [key, value] of Object.entries(doc)) {
    const content = value.toLowerCase().trim();
    if (content === "n/a" || content === "not applicable" || content === "none") {
      errors.push(`Section ${key} contains invalid placeholder content`);
    }
  }

  const suspiciousDosages = [
    /\d{4,}\s*mg/i,
    /\d+\s*g(?!\s*\w)/i
  ];
  for (const pattern of suspiciousDosages) {
    if (pattern.test(medicationsSection)) {
      warnings.push("Potentially suspicious medication dosage detected");
    }
  }

  if (language !== "english") {
    const hasNonASCII = /[^\x00-\x7F]/.test(allContent);
    if (!hasNonASCII) {
      errors.push(`Language set to ${language} but output appears to be in English`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings
  };
};

export const formatValidationErrors = (result: ValidationResult): string => {
  let message = "";

  if (result.errors.length > 0) {
    message += "VALIDATION ERRORS:\n";
    result.errors.forEach((error, index) => {
      message += `${index + 1}. ${error}\n`;
    });
  }

  if (result.warnings.length > 0) {
    message += "\nVALIDATION WARNINGS:\n";
    result.warnings.forEach((warning, index) => {
      message += `${index + 1}. ${warning}\n`;
    });
  }

  return message;
};
