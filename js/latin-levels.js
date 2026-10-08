/**
 * Latin Square level ladder. Each level fixes the symbol type, grid size,
 * and difficulty; the ladder grows the grid and rotates pictures, numbers, and words.
 */

/** Solved puzzles needed at a level before moving up. */
export const LATIN_LEVEL_UP_TARGET = 3;

const TYPE_NAMES = { pic: 'pictures', num: 'numbers', word: 'words' };

function level(size, type, diff) {
  return { label: `${size} × ${size} ${TYPE_NAMES[type]}, ${diff}`, type, size, diff };
}

export const LATIN_LEVELS = Object.freeze([
  level(3, 'pic', 'easy'),
  level(3, 'num', 'easy'),
  level(3, 'pic', 'medium'),
  level(3, 'word', 'medium'),
  level(3, 'num', 'hard'),
  level(4, 'pic', 'easy'),
  level(4, 'num', 'medium'),
  level(4, 'word', 'medium'),
  level(4, 'pic', 'hard'),
  level(5, 'pic', 'easy'),
  level(5, 'num', 'medium'),
  level(5, 'word', 'medium'),
  level(6, 'pic', 'medium'),
  level(6, 'num', 'medium'),
  level(6, 'word', 'hard'),
]);
