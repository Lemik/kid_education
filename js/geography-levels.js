/**
 * Geography level ladder. Each level fixes the topic and which provinces and
 * territories are asked about; show results, time, and answer mode stay as settings.
 */
export const GEOGRAPHY_LEVELS = Object.freeze([
  { label: 'Famous cities in 6 big provinces', preset: { topic: 'city', subset: 'easy6', items: null } },
  { label: 'Famous cities across Canada', preset: { topic: 'city', subset: 'all', items: null } },
  { label: 'Capital cities', preset: { topic: 'capital', subset: 'all', items: null } },
  { label: 'Postal abbreviations', preset: { topic: 'abbrev', subset: 'all', items: null } },
  { label: 'Mixed questions about Canada', preset: { topic: 'mixed', subset: 'all', items: null } },
]);
