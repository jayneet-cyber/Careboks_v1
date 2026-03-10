export const SECTION_IDS = [
  'what_i_have',
  'how_to_live',
  'timeline',
  'life_impact',
  'medications',
  'warnings',
  'contacts'
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_TITLE_KEYS: Record<SectionId, string> = {
  what_i_have: 'What do I have',
  how_to_live: 'How should I live next',
  timeline: 'How the next 6 months of my life will look like',
  life_impact: 'What does it mean for my life',
  medications: 'My medications',
  warnings: 'Warning signs',
  contacts: 'My contacts'
};

export interface OutputSection {
  id?: string;
  title: string;
  content: string;
}

const SECTION_ID_SET = new Set<string>(SECTION_IDS);

export const isSectionId = (value: string): value is SectionId => SECTION_ID_SET.has(value);

export const normalizeSelectedSectionIds = (selectedSectionIds?: string[] | null): SectionId[] => {
  if (!selectedSectionIds || selectedSectionIds.length === 0) {
    return [...SECTION_IDS];
  }

  const normalized = selectedSectionIds.filter(isSectionId);
  return normalized.length > 0 ? normalized : [...SECTION_IDS];
};

export const withSectionIds = <T extends OutputSection>(sections: T[]): (T & { id: SectionId })[] => {
  return sections
    .map((section, index) => {
      const id = section.id && isSectionId(section.id) ? section.id : SECTION_IDS[index];
      if (!id) {
        return null;
      }

      return {
        ...section,
        id
      };
    })
    .filter((section): section is T & { id: SectionId } => Boolean(section));
};

export const filterSectionsBySelection = <T extends OutputSection>(
  sections: T[],
  selectedSectionIds?: string[] | null
): (T & { id: SectionId })[] => {
  const selectedIds = normalizeSelectedSectionIds(selectedSectionIds);
  const selectedSet = new Set(selectedIds);

  return withSectionIds(sections).filter(section => selectedSet.has(section.id));
};
