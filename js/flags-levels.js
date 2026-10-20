/**
 * Flags level ladder. Each level fixes the question type and which countries
 * are asked about; time stays a setting.
 */
export const FLAGS_LEVELS = Object.freeze([
  { label: 'Popular flags: name the country', preset: { mode: 'flag', region: 'popular' } },
  { label: 'Popular flags: both ways', preset: { mode: 'mixed', region: 'popular' } },
  { label: 'Flags of Europe', preset: { mode: 'mixed', region: 'europe' } },
  { label: 'Flags of the Americas', preset: { mode: 'mixed', region: 'americas' } },
  { label: 'Flags of the whole world', preset: { mode: 'mixed', region: 'world' } },
]);
