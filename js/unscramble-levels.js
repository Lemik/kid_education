/**
 * Unscramble level ladder. Each level only fixes word length and whether
 * the first letter is given; results and time stay as settings.
 */
export const UNSCRAMBLE_LEVELS = Object.freeze([
  { label: '3-letter words, first letter shown', preset: { len: '3', first: 'y' } },
  { label: '4-letter words, first letter shown', preset: { len: '4', first: 'y' } },
  { label: '5-letter words, first letter shown', preset: { len: '5', first: 'y' } },
  { label: '6-letter words, first letter shown', preset: { len: '6', first: 'y' } },
  { label: '4–6 letter words, no letters shown', preset: { len: '4-6', first: 'n' } },
]);
