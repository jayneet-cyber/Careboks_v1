import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  SAFETY_RULES,
  SYSTEM_PROMPT,
  getLanguageSpecificGuidelines,
  getPersonalizationInstructions,
  getSectionGuidelines
} from "./prompts.js";
import { formatValidationErrors, type PatientDocument, validateDocument } from "./validation.js";
import { callWatsonx } from "./watsonx.js";

const MAX_TECHNICAL_NOTE_LENGTH = 50000;
const MAX_RETRIES = 1;

const generateSchema = z.object({
  technicalNote: z.string().min(1),
  patientData: z.record(z.string(), z.unknown()).or(z.any())
});

const regenerateSchema = z.object({
  sectionIndex: z.number().int().min(0).max(6),
  sectionTitle: z.string().min(1),
  currentContent: z.string().optional(),
  analysis: z.unknown().optional(),
  patientData: z.record(z.string(), z.unknown()).or(z.any()),
  technicalNote: z.string().min(1)
});

const extractSchema = z.object({
  fileData: z.string().min(1),
  fileType: z.string().optional()
});

const safeJsonParse = (value: string) => {
  const trimmed = value.trim();
  let cleaned = trimmed;
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(cleaned.trim());
};

const aiRoutes: FastifyPluginAsync = async (app) => {
  const normalizeJourneyType = (value: unknown): "elective" | "emergency" | "chronic" | "first-time" | undefined => {
    if (value === "elective" || value === "emergency" || value === "chronic" || value === "first-time") {
      return value;
    }
    return undefined;
  };

  app.post("/extract-text-from-document", { preHandler: app.authenticate }, async (request, reply) => {
    const bodyResult = extractSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ error: bodyResult.error.message });
    }

    try {
      const data = await callWatsonx({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "You are an OCR text extraction tool. Transcribe text exactly as shown."
              },
              {
                type: "image_url",
                image_url: { url: bodyResult.data.fileData }
              }
            ]
          }
        ],
        modelId: "meta-llama/llama-3-2-11b-vision-instruct",
        temperature: 0.3,
        maxTokens: 4000
      });

      const extractedText = (data as any)?.choices?.[0]?.message?.content;
      if (!extractedText) {
        return reply.code(400).send({ error: "No text could be extracted from the document" });
      }

      return reply.send({ extractedText });
    } catch (error: any) {
      return reply.code(500).send({ error: error.message ?? "Unknown error" });
    }
  });

  app.post("/generate-patient-document-v2", { preHandler: app.authenticate }, async (request, reply) => {
    const bodyResult = generateSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ error: bodyResult.error.message });
    }

    const { technicalNote, patientData } = bodyResult.data;
    if (technicalNote.length > MAX_TECHNICAL_NOTE_LENGTH) {
      return reply.code(400).send({
        error: `Technical note is too long (${technicalNote.length}). Maximum is ${MAX_TECHNICAL_NOTE_LENGTH}.`
      });
    }

    const patientProfile = {
      age: Number(patientData.age) || 65,
      sex: (patientData.sex as "male" | "female" | "other") || "other",
      healthLiteracy: (patientData.healthLiteracy as "low" | "medium" | "high") || "medium",
      language: (patientData.language as "estonian" | "russian" | "english") || "english",
      journeyType: normalizeJourneyType(patientData.journeyType),
      mentalState: patientData.mentalState as string | undefined,
      comorbidities: (patientData.comorbidities as string[] | undefined)?.join(", "),
      smokingStatus: patientData.smokingStatus as string | undefined,
      riskAppetite: (patientData.riskAppetite as "minimal" | "moderate" | "detailed") || "moderate"
    };

    const basePrompt = `${SYSTEM_PROMPT}

Generate a patient-friendly medical communication document.
Return ONLY valid JSON with keys:
{
  "section_1_what_i_have": "...",
  "section_2_how_to_live": "...",
  "section_3_timeline": "...",
  "section_4_life_impact": "...",
  "section_5_medications": "...",
  "section_6_warnings": "...",
  "section_7_contacts": "..."
}

TECHNICAL CLINICAL NOTE:
${technicalNote}

PATIENT PROFILE:
- Age: ${patientProfile.age}
- Sex: ${patientProfile.sex}
- Health Literacy: ${patientProfile.healthLiteracy}
- Language: ${patientProfile.language}
- Journey Type: ${patientProfile.journeyType || "Not specified"}
- Mental State: ${patientProfile.mentalState || "Not specified"}
- Comorbidities: ${patientProfile.comorbidities || "None"}
- Smoking Status: ${patientProfile.smokingStatus || "Not specified"}
- Information Preference: ${patientProfile.riskAppetite}

${getPersonalizationInstructions(patientProfile)}
${getSectionGuidelines(patientProfile.language)}
${getLanguageSpecificGuidelines(patientProfile.language)}
${SAFETY_RULES}`;

    let attempts = 0;
    let lastError = "";

    while (attempts <= MAX_RETRIES) {
      attempts += 1;

      const retryPrefix = attempts > 1 && lastError
        ? `PREVIOUS ATTEMPT FAILED WITH: ${lastError}\nRetry with strict JSON compliance.\n\n`
        : "";

      try {
        const data = await callWatsonx({
          messages: [{ role: "user", content: `${retryPrefix}${basePrompt}` }],
          modelId: "ibm/granite-4-h-small",
          temperature: 0.4,
          maxTokens: 6000
        });

        const content = (data as any)?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("No content received from AI");
        }

        const document = safeJsonParse(content) as PatientDocument;
        const validation = validateDocument(document, patientProfile.language);
        if (!validation.passed) {
          lastError = formatValidationErrors(validation);
          if (attempts > MAX_RETRIES) {
            return reply.code(500).send({
              error: "AI generation incomplete after retries. Please regenerate.",
              validationErrors: validation.errors,
              validationWarnings: validation.warnings
            });
          }
          continue;
        }

        return reply.send({
          document,
          model: "ibm/granite-4-h-small",
          validation: {
            passed: true,
            warnings: validation.warnings
          }
        });
      } catch (error: any) {
        lastError = error.message ?? "Unknown generation error";
        if (attempts > MAX_RETRIES) {
          return reply.code(500).send({ error: lastError });
        }
      }
    }

    return reply.code(500).send({ error: "Unexpected generation flow exit" });
  });

  app.post("/regenerate-section", { preHandler: app.authenticate }, async (request, reply) => {
    const bodyResult = regenerateSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.code(400).send({ error: bodyResult.error.message });
    }

    const { sectionIndex, sectionTitle, analysis, patientData, technicalNote } = bodyResult.data;

    const sectionGuidelines = {
      0: "Explain the diagnosis in plain language with relevant test results",
      1: "Provide practical daily instructions for diet, activity, and monitoring",
      2: "Break down the timeline into phases with expected improvements",
      3: "Describe long-term lifestyle impact with realistic but hopeful perspective",
      4: "List each medication with name, dosage, timing, purpose, and importance",
      5: "List emergency symptoms requiring immediate action",
      6: "Provide contact information and emergency numbers"
    };

    const profile = {
      age: Number(patientData.age) || 50,
      sex: (patientData.sex as "male" | "female" | "other") || "other",
      healthLiteracy: (patientData.healthLiteracy as "low" | "medium" | "high") || "medium",
      language: (patientData.language as "estonian" | "russian" | "english") || "english",
      journeyType: normalizeJourneyType(patientData.journeyType),
      comorbidities: (patientData.comorbidities as string[] | undefined)?.join(", "),
      smokingStatus: patientData.smokingStatus as string | undefined,
      riskAppetite: (patientData.riskAppetite as "minimal" | "moderate" | "detailed") || "moderate"
    };

    const analysisObject = (analysis ?? {}) as Record<string, unknown>;
    const analysisText = `
EXTRACTED MEDICAL INFORMATION:
- Primary Diagnosis: ${analysisObject.primaryDiagnosis || "Not specified"}
- Secondary Diagnoses: ${Array.isArray(analysisObject.secondaryDiagnoses) ? analysisObject.secondaryDiagnoses.join(", ") : "None"}
- Medications: ${Array.isArray(analysisObject.medications) ? analysisObject.medications.join(", ") : "None listed"}
- Procedures: ${Array.isArray(analysisObject.procedures) ? analysisObject.procedures.join(", ") : "None"}
- Test Results: ${Array.isArray(analysisObject.testResults) ? analysisObject.testResults.join(", ") : "None"}
- Follow-up Plans: ${Array.isArray(analysisObject.followUpPlans) ? analysisObject.followUpPlans.join(", ") : "None"}`;

    const prompt = `${SYSTEM_PROMPT}

TECHNICAL NOTE:
${technicalNote}

${analysisText}

PATIENT PROFILE:
- Age: ${profile.age}
- Sex: ${profile.sex}
- Language: ${profile.language}
- Health Literacy: ${profile.healthLiteracy}
- Journey Type: ${profile.journeyType || "not specified"}
- Risk Appetite: ${profile.riskAppetite}

${getPersonalizationInstructions(profile)}
${SAFETY_RULES}

SECTION FOCUS: "${sectionTitle}"
GUIDELINES: ${sectionGuidelines[sectionIndex as keyof typeof sectionGuidelines]}

Return ONLY section paragraph text.`;

    try {
      const data = await callWatsonx({
        messages: [{ role: "user", content: prompt }],
        modelId: "ibm/granite-4-h-small",
        temperature: 0.4,
        maxTokens: 1000
      });

      const regeneratedContent = (data as any)?.choices?.[0]?.message?.content?.trim();
      if (!regeneratedContent) {
        return reply.code(500).send({ error: "No content received from AI" });
      }

      return reply.send({ regeneratedContent });
    } catch (error: any) {
      return reply.code(500).send({ error: error.message ?? "Unknown error" });
    }
  });
};

export default aiRoutes;
