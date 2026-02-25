/**
 * @fileoverview Individual print section component
 * 
 * Renders a single section with appropriate styling variant
 * based on the Figma design (teal, pink, red, neutral, contacts).
 */

import ReactMarkdown from 'react-markdown';
import { formatPlainTextAsMarkdown } from '@/utils/markdownFormatting';

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
  const displayContent = formatPlainTextAsMarkdown(content);

  return (
    <div className={`print-section print-section--${variant} ${className}`}>
      <h2 className="print-section-header flex items-center gap-2">
        {icon}
        {title}
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
