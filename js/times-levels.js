/**
 * Times Tables level ladder. Same spec shape as js/levels.js:
 * `tables` are the practiced tables, `factorMax` the largest other factor.
 */

const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

function times(tables, extra = {}) {
  return { ops: ['*'], tables, ...extra };
}

export const TIMES_LEVELS = Object.freeze([
  { label: '×2', ...times([2]) },
  { label: '×10', ...times([10]) },
  { label: '×5', ...times([5]) },
  { label: '×2, ×5, ×10', ...times([2, 5, 10]) },
  { label: '×3', ...times([3]) },
  { label: '×4', ...times([4]) },
  { label: '×2 to ×5 and ×10', ...times([2, 3, 4, 5, 10]) },
  { label: '×6', ...times([6]) },
  { label: '×7', ...times([7]) },
  { label: '×8', ...times([8]) },
  { label: '×9', ...times([9]) },
  { label: 'All tables to 10', ...times(range(1, 10)) },
  { label: '×11', ...times([11], { factorMax: 12 }) },
  { label: '×12', ...times([12], { factorMax: 12 }) },
  { label: 'All tables to 12', ...times(range(1, 12), { factorMax: 12 }) },
  { label: 'Missing factor to 10', ...times(range(2, 10), { missing: ['a', 'b'] }) },
  { label: 'Missing factor to 12', ...times(range(2, 12), { factorMax: 12, missing: ['a', 'b'] }) },
]);
