/**
 * @fileoverview Print document header component
 * 
 * Displays Careboks branding and document metadata
 */

import carebloksLogo from '@/assets/careboks-logo.png';

interface PrintHeaderProps {
  /** Patient's language for localized title */
  language: string;
  /** Document publication/approval date */
  date: string;
  /** Optional hospital name */
  hospitalName?: string;
}

const TITLES: Record<string, { main: string; sub: string }> = {
  estonian: {
    main: "Teie järgmised sammud pärast haiglast lahkumist",
    sub: "Isikustatud hooldusinfo teie paranemiseks"
  },
  russian: {
    main: "Ваши следующие шаги после выписки",
    sub: "Персонализированная информация для вашего выздоровления"
  },
  english: {
    main: "Your next steps after discharge",
    sub: "Personalized care information for your recovery"
  }
};

/**
 * Renders the document header with branding
 */
export const PrintHeader = ({ language, date, hospitalName }: PrintHeaderProps) => {
  const normalizedLang = language?.toLowerCase() || 'english';
  const titles = TITLES[normalizedLang] || TITLES.english;
  
  return (
    <div className="print-header">
      <div>
        <h1 className="print-title">{titles.main}</h1>
        <p className="print-subtitle mt-2">{titles.sub}</p>
        {hospitalName && (
          <p className="print-subtitle mt-1">{hospitalName}</p>
        )}
      </div>
      <div className="flex flex-col items-end">
        <img 
          src={carebloksLogo} 
          alt="Careboks" 
          className="print-header-logo"
        />
      </div>
    </div>
  );
};
