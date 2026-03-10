import { PatientLanguage } from "@/lib/language";

type PatientVariables = Record<string, string | number>;

const estonian: Record<string, string> = {
  "Loading your document...": "Teie dokument laadib...",
  "Document Not Found": "Dokumenti ei leitud",
  "This document may have expired, been deactivated, or the link is incorrect.": "See dokument võib olla aegunud, deaktiveeritud või link on vigane.",
  "Please contact your healthcare provider for assistance.": "Abi saamiseks võtke ühendust oma tervishoiuteenuse osutajaga.",
  "Your Care Document": "Teie ravidokument",
  "Prepared by {name}": "Koostas {name}",
  Print: "Prindi",
  "Please provide feedback": "Palun andke tagasisidet",
  "Select at least one option or add a comment.": "Valige vähemalt üks valik või lisage kommentaar.",
  "Thank you for your feedback!": "Aitäh tagasiside eest!",
  "Your response helps us improve.": "Teie vastus aitab meil paremaks saada.",
  "Could not submit feedback": "Tagasisidet ei saanud saata",
  "Please try again later.": "Palun proovige hiljem uuesti.",
  "Your response helps us improve patient care.": "Teie vastus aitab meil parandada patsiendihooldust.",
  "How was this document?": "Kuidas see dokument oli?",
  "Your feedback helps us improve the information we provide to patients.": "Teie tagasiside aitab meil parandada patsientidele antavat teavet.",
  "Additional comments (optional)": "Lisakommentaarid (valikuline)",
  "Share any additional feedback about this document...": "Jagage selle dokumendi kohta lisatagasisidet...",
  "Submitting...": "Saatmine...",
  "Submit Feedback": "Saada tagasiside",
  "The document was easy to understand": "Dokumenti oli lihtne mõista",
  "I understand my condition better now": "Mõistan nüüd oma seisundit paremini",
  "The medication information was helpful": "Ravimiteave oli kasulik",
  "I know what warning signs to watch for": "Tean, milliseid hoiatusmärke jälgida",
  "I understand what lifestyle changes I need to make": "Mõistan, milliseid elustiilimuudatusi pean tegema",
  "I would like more details about my treatment": "Soovin rohkem üksikasju oma ravi kohta",
};

const russian: Record<string, string> = {
  "Loading your document...": "Ваш документ загружается...",
  "Document Not Found": "Документ не найден",
  "This document may have expired, been deactivated, or the link is incorrect.": "Документ мог истечь, быть деактивирован или ссылка неверна.",
  "Please contact your healthcare provider for assistance.": "Пожалуйста, обратитесь к вашему лечащему врачу за помощью.",
  "Your Care Document": "Ваш документ по уходу",
  "Prepared by {name}": "Подготовил(а): {name}",
  Print: "Печать",
  "Please provide feedback": "Пожалуйста, оставьте отзыв",
  "Select at least one option or add a comment.": "Выберите хотя бы один вариант или добавьте комментарий.",
  "Thank you for your feedback!": "Спасибо за ваш отзыв!",
  "Your response helps us improve.": "Ваш ответ помогает нам становиться лучше.",
  "Could not submit feedback": "Не удалось отправить отзыв",
  "Please try again later.": "Пожалуйста, попробуйте позже.",
  "Your response helps us improve patient care.": "Ваш ответ помогает нам улучшать качество помощи пациентам.",
  "How was this document?": "Как вам этот документ?",
  "Your feedback helps us improve the information we provide to patients.": "Ваш отзыв помогает нам улучшать информацию, которую мы предоставляем пациентам.",
  "Additional comments (optional)": "Дополнительные комментарии (необязательно)",
  "Share any additional feedback about this document...": "Поделитесь дополнительными отзывами об этом документе...",
  "Submitting...": "Отправка...",
  "Submit Feedback": "Отправить отзыв",
  "The document was easy to understand": "Документ было легко понять",
  "I understand my condition better now": "Теперь я лучше понимаю своё состояние",
  "The medication information was helpful": "Информация о лекарствах была полезной",
  "I know what warning signs to watch for": "Я знаю, на какие тревожные признаки обращать внимание",
  "I understand what lifestyle changes I need to make": "Я понимаю, какие изменения образа жизни мне нужно внести",
  "I would like more details about my treatment": "Мне хотелось бы больше подробностей о моём лечении",
};

const patientTranslations: Record<PatientLanguage, Record<string, string>> = {
  english: {},
  estonian,
  russian,
};

const interpolatePatient = (text: string, variables?: PatientVariables): string => {
  if (!variables) return text;

  return text.replace(/\{(.*?)\}/g, (_, key: string) => {
    const value = variables[key.trim()];
    return value === undefined ? `{${key}}` : String(value);
  });
};

export const translatePatient = (
  language: string | undefined,
  key: string,
  variables?: PatientVariables
): string => {
  const normalized = (language ?? "english").toLowerCase() as PatientLanguage;
  const dictionary = patientTranslations[normalized] ?? patientTranslations.english;
  return interpolatePatient(dictionary[key] ?? key, variables);
};
