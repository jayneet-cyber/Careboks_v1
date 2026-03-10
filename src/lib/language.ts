export type UiLanguage = "eng" | "est" | "rus";

export type PatientLanguage = "english" | "estonian" | "russian";

export const UI_LANGUAGE_STORAGE_KEY = "careboks.uiLanguage";

export const DEFAULT_UI_LANGUAGE: UiLanguage = "eng";

const UI_LANGUAGE_SET = new Set<UiLanguage>(["eng", "est", "rus"]);

export const isUiLanguage = (value: unknown): value is UiLanguage => {
  return typeof value === "string" && UI_LANGUAGE_SET.has(value as UiLanguage);
};

export const normalizeUiLanguage = (value: unknown): UiLanguage => {
  if (isUiLanguage(value)) {
    return value;
  }

  return DEFAULT_UI_LANGUAGE;
};

export const patientLanguageFromUi = (language: UiLanguage): PatientLanguage => {
  if (language === "est") return "estonian";
  if (language === "rus") return "russian";
  return "english";
};

export const uiLanguageFromPatient = (language: unknown): UiLanguage => {
  if (language === "estonian") return "est";
  if (language === "russian") return "rus";
  return "eng";
};
