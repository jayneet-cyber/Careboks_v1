/**
 * @fileoverview Individual print section component
 * 
 * Renders a single section with appropriate styling variant
 * based on the Figma design (teal, pink, red, neutral, contacts).
 */

import ReactMarkdown from 'react-markdown';

export type SectionVariant = 'teal' | 'pink' | 'red' | 'neutral' | 'contacts';

interface PrintSectionProps {
  /** Section title */
  title: string;
  /** Section content (markdown) */
  content: string;
  /** Visual style variant */
  variant: SectionVariant;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Renders a styled section for the print document
 */
export const PrintSection = ({ 
  title, 
  content, 
  variant, 
  icon,
  className = '' 
}: PrintSectionProps) => {
  return (
    <div className={`print-section print-section--${variant} ${className}`}>
      <h2 className="print-section-header flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <div className="print-body">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
};
