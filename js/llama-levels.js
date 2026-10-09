/**
 * Find a Llama level ladder. Each level fixes the grid size and how the
 * color regions are shaped: compact blobs are easier to read than twisty ones.
 */

/** Solved boards needed at a level before moving up. */
export const LLAMA_LEVEL_UP_TARGET = 3;

/** Wrong llama guesses allowed before the round ends. */
export const LLAMA_LIVES = 3;

const SHAPE_NAMES = { compact: 'simple colors', twisty: 'twisty colors' };

/** `single`: one color is a lone square, giving a sure first llama. */
function level(size, shape, single = false) {
  const label = `${size} × ${size}, ${SHAPE_NAMES[shape]}${single ? ', one-square head start' : ''}`;
  return { label, size, shape, single };
}

export const LLAMA_LEVELS = Object.freeze([
  level(4, 'compact', true),
  level(4, 'twisty', true),
  level(5, 'compact', true),
  level(5, 'twisty', true),
  level(6, 'compact'),
  level(6, 'twisty'),
  level(7, 'compact'),
  level(8, 'compact'),
]);
