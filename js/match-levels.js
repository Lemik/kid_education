/**
 * Find a Match level ladder. Each level fixes the board (cards, kinds, mix);
 * the timer and time limit stay as settings.
 */
export const MATCH_LEVELS = Object.freeze([
  {
    label: '6 picture cards',
    preset: { cards: 6, pictures: true, numbers: false, words: false, mix: 'n' },
  },
  {
    label: '12 picture cards',
    preset: { cards: 12, pictures: true, numbers: false, words: false, mix: 'n' },
  },
  {
    label: 'Pictures and numbers (16 cards)',
    preset: { cards: 16, pictures: true, numbers: true, words: false, mix: 'n' },
  },
  {
    label: 'Dots match numbers (16 cards)',
    preset: { cards: 16, pictures: true, numbers: true, words: false, mix: 'y' },
  },
  {
    label: 'Pictures and numbers match words (20 cards)',
    preset: { cards: 20, pictures: true, numbers: true, words: true, mix: 'y' },
  },
]);

export const MATCH_LEVEL_UP_TARGET = 3;
