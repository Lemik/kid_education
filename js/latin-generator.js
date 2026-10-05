const EMOJI_POOL = [
  '🐱', '🐶', '🦊', '🐸', '🦁', '🐼', '🐧', '🦉',
  '🐙', '🦋', '🐢', '🦄', '🐝', '🐳', '🐰', '🐞',
  '🍎', '🍌', '🍓', '🍉', '🍕', '🍪', '🥕', '🍇',
  '⚽', '🚗', '🚀', '🎈', '🌟', '🌈', '🌻', '🎁',
];

const WORD_POOL = [
  'cat', 'dog', 'fox', 'frog', 'bear', 'duck', 'fish', 'bird',
  'bee', 'owl', 'sun', 'moon', 'star', 'tree', 'cake', 'ball',
  'car', 'boat', 'kite', 'book', 'hat', 'cup', 'red', 'blue',
  'green', 'pink', 'milk', 'egg',
];

/** Fraction of cells that start filled in, per difficulty. */
const GIVEN_FRACTION = {
  easy: 0.65,
  medium: 0.45,
  hard: 0.3,
};

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Build a random n×n Latin square of symbol indices 0..n-1.
 * Starts from the cyclic square and shuffles rows, columns, and symbols.
 */
function randomLatinSquare(n) {
  const rowOrder = shuffle(Array.from({ length: n }, (_, i) => i));
  const colOrder = shuffle(Array.from({ length: n }, (_, i) => i));
  const symbolMap = shuffle(Array.from({ length: n }, (_, i) => i));

  const square = [];
  for (let r = 0; r < n; r += 1) {
    const row = [];
    for (let c = 0; c < n; c += 1) {
      row.push(symbolMap[(rowOrder[r] + colOrder[c]) % n]);
    }
    square.push(row);
  }
  return square;
}

/**
 * Generate a puzzle: a partially filled Latin square plus its symbols.
 * Returns { size, symbols, cells } where cells is a flat array (row-major)
 * of { value: symbolIndex | null, given: boolean }.
 */
export function generatePuzzle(settings) {
  const n = settings.size;
  const total = n * n;
  const solution = randomLatinSquare(n);

  let symbols;
  if (settings.type === 'num') {
    symbols = Array.from({ length: n }, (_, i) => String(i + 1));
  } else if (settings.type === 'word') {
    symbols = shuffle([...WORD_POOL]).slice(0, n);
  } else {
    symbols = shuffle([...EMOJI_POOL]).slice(0, n);
  }

  const minEmpty = Math.max(2, n - 1);
  const givenCount = Math.min(
    total - minEmpty,
    Math.max(n, Math.round(total * GIVEN_FRACTION[settings.diff])),
  );

  const order = shuffle(Array.from({ length: total }, (_, i) => i));
  const givenSet = new Set(order.slice(0, givenCount));

  const cells = [];
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      const index = r * n + c;
      const given = givenSet.has(index);
      cells.push({ value: given ? solution[r][c] : null, given });
    }
  }

  return { size: n, symbols, cells };
}

/**
 * Find cells that break the Latin square rule: a filled cell whose value
 * appears more than once in its row or column. Returns a Set of indices.
 */
export function findConflicts(puzzle) {
  const { size: n, cells } = puzzle;
  const conflicts = new Set();

  const markDuplicates = (indices) => {
    const seen = new Map();
    for (const index of indices) {
      const value = cells[index].value;
      if (value == null) continue;
      if (seen.has(value)) {
        conflicts.add(index);
        conflicts.add(seen.get(value));
      } else {
        seen.set(value, index);
      }
    }
  };

  for (let r = 0; r < n; r += 1) {
    markDuplicates(Array.from({ length: n }, (_, c) => r * n + c));
  }
  for (let c = 0; c < n; c += 1) {
    markDuplicates(Array.from({ length: n }, (_, r) => r * n + c));
  }

  return conflicts;
}

/** True when every cell is filled. */
export function isComplete(puzzle) {
  return puzzle.cells.every((cell) => cell.value != null);
}
