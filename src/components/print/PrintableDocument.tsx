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
import '@/styles/print.css';
import { SECTION_IDS, type SectionId } from '@/lib/documentSections';

export interface DocumentSection {
  id?: string;
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
  const sectionMap = mapSectionsById(sections);
  const sectionTitles = getSectionTitles(language);
  const orderedIds = SECTION_IDS.filter(sectionId => sectionMap[sectionId]);
  
  return (
    <div className="print-container">
      <div className="print-document">
        <PrintHeader 
          language={language} 
          date={date}
          hospitalName={hospitalName}
        />
        
        {/* Selected sections in one continuous grid */}
        <div className="print-content-grid">
          {orderedIds.map(sectionId => {
            const content = sectionMap[sectionId]?.content || '';

            if (sectionId === 'medications') {
              return (
                <PrintMedications
                  key={sectionId}
                  content={content}
                  language={language}
                />
              );
            }

            if (sectionId === 'warnings') {
              return (
                <PrintWarnings
                  key={sectionId}
                  content={content}
                  language={language}
                />
              );
            }

            if (sectionId === 'contacts') {
              return (
                <PrintContacts
                  key={sectionId}
                  content={content}
                  language={language}
                />
              );
            }

            return (
              <PrintSection
                key={sectionId}
                title={sectionTitles[sectionId]}
                content={content}
                variant={sectionId === 'how_to_live' ? 'neutral' : 'teal'}
                icon={<span>{SECTION_ICONS[sectionId]}</span>}
              />
            );
          })}
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
function getSectionTitles(language: string): Record<SectionId, string> {
  const normalizedLang = language?.toLowerCase() || 'english';
  
  const titles: Record<string, Record<SectionId, string>> = {
    estonian: {
      what_i_have: "MIS MUL ON",
      how_to_live: "KUIDAS PEAKSIN EDASI ELAMA",
      timeline: "KUIDAS JÄRGMISED 6 KUUD VÄLJA NÄEVAD",
      life_impact: "MIDA SEE TÄHENDAB MINU ELULE",
      medications: "MINU RAVIMID",
      warnings: "HOIATAVAD MÄRGID",
      contacts: "MINU KONTAKTID"
    },
    russian: {
      what_i_have: "ЧТО У МЕНЯ ЕСТЬ",
      how_to_live: "КАК МНЕ ЖИТЬ ДАЛЬШЕ",
      timeline: "КАК БУДУТ ВЫГЛЯДЕТЬ СЛЕДУЮЩИЕ 6 МЕСЯЦЕВ",
      life_impact: "ЧТО ЭТО ЗНАЧИТ ДЛЯ МОЕЙ ЖИЗНИ",
      medications: "МОИ ЛЕКАРСТВА",
      warnings: "ПРЕДУПРЕЖДАЮЩИЕ ПРИЗНАКИ",
      contacts: "МОИ КОНТАКТЫ"
    },
    english: {
      what_i_have: "WHAT DO I HAVE",
      how_to_live: "HOW SHOULD I LIVE NEXT",
      timeline: "HOW THE NEXT 6 MONTHS WILL LOOK",
      life_impact: "WHAT DOES IT MEAN FOR MY LIFE",
      medications: "MY MEDICATIONS",
      warnings: "WARNING SIGNS",
      contacts: "MY CONTACTS"
    }
  };
  
  return titles[normalizedLang] || titles.english;
}

const SECTION_ICONS: Record<SectionId, string> = {
  what_i_have: '❤️',
  how_to_live: '🏃',
  timeline: '📅',
  life_impact: '✨',
  medications: '💊',
  warnings: '⚠️',
  contacts: '📞'
};

function mapSectionsById(sections: DocumentSection[]): Partial<Record<SectionId, DocumentSection>> {
  const hasExplicitIds = sections.some(section => typeof section.id === 'string' && SECTION_IDS.includes(section.id as SectionId));
  const sectionMap: Partial<Record<SectionId, DocumentSection>> = {};

  if (hasExplicitIds) {
    for (const section of sections) {
      if (section.id && SECTION_IDS.includes(section.id as SectionId)) {
        sectionMap[section.id as SectionId] = section;
      }
    }

    return sectionMap;
  }

  SECTION_IDS.forEach((sectionId, index) => {
    if (sections[index]) {
      sectionMap[sectionId] = {
        ...sections[index],
        id: sectionId
      };
    }
  });

  return sectionMap;
}
