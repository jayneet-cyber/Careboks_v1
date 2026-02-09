/**
 * @fileoverview Contacts section for print document
 * 
 * Displays healthcare team contact information
 * Teal themed section with emergency contact highlight per Figma design
 */

import ReactMarkdown from 'react-markdown';

interface PrintContactsProps {
  /** Contacts content (markdown) */
  content: string;
  /** Language for localized header */
  language: string;
}

const HEADERS: Record<string, string> = {
  estonian: "MINU KONTAKTID",
  russian: "МОИ КОНТАКТЫ",
  english: "MY CONTACTS"
};

/**
 * Renders the contacts section with special styling
 */
export const PrintContacts = ({ content, language }: PrintContactsProps) => {
  const normalizedLang = language?.toLowerCase() || 'english';
  const header = HEADERS[normalizedLang] || HEADERS.english;
  
  return (
    <div className="print-section print-section--contacts">
      <h2 className="print-section-header">
        📞 {header}
      </h2>
      <div className="print-body">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
};
