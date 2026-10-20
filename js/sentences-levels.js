/**
 * Sentences level ladder. Each level only fixes the length of the missing
 * word; results, time, and answer mode stay as settings.
 */
export const SENTENCES_LEVELS = Object.freeze([
  { label: '3-letter missing words', preset: { len: '3' } },
  { label: '4-letter missing words', preset: { len: '4' } },
  { label: '5-letter missing words', preset: { len: '5' } },
  { label: '4–6 letter missing words', preset: { len: '4-6' } },
  { label: '6-letter missing words', preset: { len: '6' } },
]);
