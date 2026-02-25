/**
 * @fileoverview Medications section for print document
 * 
 * Displays medication list with "if not taken" consequences
 * Pink themed section per Figma design
 * Full-height variant for two-column layout
 */

import ReactMarkdown from 'react-markdown';
import { formatPlainTextAsMarkdown } from '@/utils/markdownFormatting';

interface PrintMedicationsProps {
  /** Medication content (markdown) */
  content: string;
  /** Language for localized header */
  language: string;
}

const HEADERS: Record<string, string> = {
  estonian: "MINU RAVIMID",
  russian: "МОИ ЛЕКАРСТВА",
  english: "MY MEDICATIONS"
};

/**
 * Renders the medications section with special styling
 */
export const PrintMedications = ({ content, language }: PrintMedicationsProps) => {
  const normalizedLang = language?.toLowerCase() || 'english';
  const header = HEADERS[normalizedLang] || HEADERS.english;
  const displayContent = formatPlainTextAsMarkdown(content);
  
  return (
    <div className="print-section print-section--pink">
      <h2 className="print-section-header">
        💊 {header}
      </h2>
      <div className="print-body print-body--compact">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="whitespace-pre-line">{children}</p>,
          }}
        >
          {displayContent}
        </ReactMarkdown>
      </div>
    </div>
  );
};
