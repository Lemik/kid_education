/**
 * Words level ladder. Each level only fixes word length, how many letters
 * are hidden, and whether the first letter stays shown; results, time, and
 * answer mode stay as settings.
 */
export const WORDS_LEVELS = Object.freeze([
  { label: '3-letter words, 1 missing letter', preset: { len: '3', hide: '1', first: 'y' } },
  { label: '4-letter words, 1 missing letter', preset: { len: '4', hide: '1', first: 'y' } },
  { label: '4-letter words, 2 missing letters', preset: { len: '4', hide: '2', first: 'y' } },
  { label: '5-letter words, 2 missing letters', preset: { len: '5', hide: '2', first: 'y' } },
  { label: '6-letter words, 3 missing letters', preset: { len: '6', hide: '3', first: 'y' } },
  {
    label: '6-letter words, 3 missing (first letter too)',
    preset: { len: '6', hide: '3', first: 'n' },
  },
]);
