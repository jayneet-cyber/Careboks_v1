/**
 * @fileoverview Main printable document layout component
 * 
 * Assembles all print sections into a two-page A4 layout
 * with two-column grid matching the exact Figma design.
 * Used for both print preview and public patient view.
 */

import { PrintHeader } from './PrintHeader';
import { PrintSection } from './PrintSection';
import { PrintMedications } from './PrintMedications';
import { PrintWarnings } from './PrintWarnings';
import { PrintContacts } from './PrintContacts';
import { PrintFooter } from './PrintFooter';
import carebloksLogo from '@/assets/careboks-logo.png';
import '@/styles/print.css';

export interface DocumentSection {
  title: string;
  content: string;
}

interface PrintableDocumentProps {
  /** Array of 7 document sections */
  sections: DocumentSection[];
  /** Patient's preferred language */
  language: string;
  /** Approving clinician name */
  clinicianName: string;
  /** Optional hospital name */
  hospitalName?: string;
  /** Document date */
  date: string;
  /** Optional public URL for QR code */
  documentUrl?: string;
  /** Whether to show the QR code */
  showQrCode?: boolean;
}

/**
 * Renders the complete printable patient document
 * 
 * Layout matches Figma design with two-column grid:
 * - Page 1: Header, [Left: What I Have + 6 Months] | [Right: How to Live], [Full: Life Impact]
 * - Page 2: Mini Header, [Left: Medications] | [Right: Warnings + Contacts], Footer with QR
 */
export const PrintableDocument = ({
  sections,
  language,
  clinicianName,
  hospitalName,
  date,
  documentUrl,
  showQrCode = true
}: PrintableDocumentProps) => {
  // Section mapping based on structuredDocumentParser order:
  // 0: What do I have
  // 1: How should I live
  // 2: Timeline (6 months)
  // 3: Life impact
  // 4: Medications
  // 5: Warnings
  // 6: Contacts
  
  const sectionTitles = getSectionTitles(language);
  
  return (
    <div className="print-container">
      <div className="print-document">
        <PrintHeader 
          language={language} 
          date={date}
          hospitalName={hospitalName}
        />
        
        {/* All 7 sections in one continuous grid */}
        <div className="print-content-grid">
          <PrintSection
            title={sectionTitles[0]}
            content={sections[0]?.content || ''}
            variant="teal"
            icon={<span>❤️</span>}
          />
          <PrintSection
            title={sectionTitles[1]}
            content={sections[1]?.content || ''}
            variant="neutral"
            icon={<span>🏃</span>}
          />
          <PrintSection
            title={sectionTitles[2]}
            content={sections[2]?.content || ''}
            variant="teal"
            icon={<span>📅</span>}
          />
          <PrintSection
            title={sectionTitles[3]}
            content={sections[3]?.content || ''}
            variant="teal"
            icon={<span>✨</span>}
          />
          <PrintMedications 
            content={sections[4]?.content || ''} 
            language={language}
          />
          <PrintWarnings 
            content={sections[5]?.content || ''} 
            language={language}
          />
          <PrintContacts 
            content={sections[6]?.content || ''} 
            language={language}
          />
        </div>
        
        {/* Footer with signature and QR code */}
        <PrintFooter
          clinicianName={clinicianName}
          date={date}
          documentUrl={showQrCode ? documentUrl : undefined}
          language={language}
        />
      </div>
    </div>
  );
};

/**
 * Returns localized section titles based on language
 */
function getSectionTitles(language: string): string[] {
  const normalizedLang = language?.toLowerCase() || 'english';
  
  const titles: Record<string, string[]> = {
    estonian: [
      "MIS MUL ON",
      "KUIDAS PEAKSIN EDASI ELAMA",
      "KUIDAS JÄRGMISED 6 KUUD VÄLJA NÄEVAD",
      "MIDA SEE TÄHENDAB MINU ELULE",
      "MINU RAVIMID",
      "HOIATAVAD MÄRGID",
      "MINU KONTAKTID"
    ],
    russian: [
      "ЧТО У МЕНЯ ЕСТЬ",
      "КАК МНЕ ЖИТЬ ДАЛЬШЕ",
      "КАК БУДУТ ВЫГЛЯДЕТЬ СЛЕДУЮЩИЕ 6 МЕСЯЦЕВ",
      "ЧТО ЭТО ЗНАЧИТ ДЛЯ МОЕЙ ЖИЗНИ",
      "МОИ ЛЕКАРСТВА",
      "ПРЕДУПРЕЖДАЮЩИЕ ПРИЗНАКИ",
      "МОИ КОНТАКТЫ"
    ],
    english: [
      "WHAT DO I HAVE",
      "HOW SHOULD I LIVE NEXT",
      "HOW THE NEXT 6 MONTHS WILL LOOK",
      "WHAT DOES IT MEAN FOR MY LIFE",
      "MY MEDICATIONS",
      "WARNING SIGNS",
      "MY CONTACTS"
    ]
  };
  
  return titles[normalizedLang] || titles.english;
}
