/**
 * @fileoverview Warning signs section for print document
 * 
 * Displays urgent symptoms requiring medical attention
 * Red themed section with high visibility per Figma design
 */

import ReactMarkdown from 'react-markdown';
import { formatPlainTextAsMarkdown } from '@/utils/markdownFormatting';

interface PrintWarningsProps {
  /** Warning content (markdown) */
  content: string;
  /** Language for localized header */
  language: string;
}

const HEADERS: Record<string, string> = {
  estonian: "HOIATAVAD MÄRGID",
  russian: "ПРЕДУПРЕЖДАЮЩИЕ ПРИЗНАКИ",
  english: "WARNING SIGNS"
};

/**
 * Renders the warning signs section with urgent styling
 */
export const PrintWarnings = ({ content, language }: PrintWarningsProps) => {
  const normalizedLang = language?.toLowerCase() || 'english';
  const header = HEADERS[normalizedLang] || HEADERS.english;
  const displayContent = formatPlainTextAsMarkdown(content);
  
  return (
    <div className="print-section print-section--red">
      <h2 className="print-section-header">
        ⚠️ {header}
      </h2>
      <div className="print-body">
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
