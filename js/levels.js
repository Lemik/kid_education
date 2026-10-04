/**
 * Mathematics level ladder. Each level is a small step up from the previous
 * one so a child who gets stuck can stay on a single concept for a while.
 *
 * Spec fields (all optional except label/ops):
 * - ops: allowed operations ('+', '-', '*', '/')
 * - aMin/aMax, bMin/bMax: inclusive operand ranges for + and −
 *   (and for × / ÷ when `tables` is not set; for ÷ the range applies to the dividend)
 * - resultMax: reject + and × questions whose result is larger
 * - tables: fixed factors for × (one factor) and ÷ (the divisor)
 * - factorMax: largest other factor / quotient used with `tables` (default 10)
 * - missing: slots that may be hidden ('a', 'b', 'result', 'op'); default result only
 */

export const LEVEL_UP_TARGET = 10;

const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

function addWithin(max, extra = {}) {
  return { ops: ['+'], aMin: 1, aMax: max - 1, bMin: 1, bMax: max - 1, resultMax: max, ...extra };
}

function subWithin(max, extra = {}) {
  return { ops: ['-'], aMin: 2, aMax: max, bMin: 1, bMax: max - 1, ...extra };
}

function mixedWithin(max, extra = {}) {
  return { ops: ['+', '-'], aMin: 1, aMax: max, bMin: 1, bMax: max - 1, resultMax: max, ...extra };
}

function times(tables, extra = {}) {
  return { ops: ['*'], tables, ...extra };
}

function divide(tables, extra = {}) {
  return { ops: ['/'], tables, ...extra };
}

export const LEVELS = Object.freeze([
  { label: 'Addition within 5', ...addWithin(5) },
  { label: 'Addition within 10', ...addWithin(10) },
  { label: 'Subtraction within 5', ...subWithin(5) },
  { label: 'Subtraction within 10', ...subWithin(10) },
  { label: 'Add and subtract within 10', ...mixedWithin(10) },
  { label: 'Addition within 20', ...addWithin(20) },
  { label: 'Subtraction within 20', ...subWithin(20) },
  { label: 'Add and subtract within 20', ...mixedWithin(20) },

  { label: 'Missing number: addition within 10', ...addWithin(10, { missing: ['a', 'b'] }) },
  { label: 'Missing number: add and subtract within 20', ...mixedWithin(20, { missing: ['a', 'b'] }) },

  { label: '2-digit + 1-digit', ops: ['+'], aMin: 10, aMax: 89, bMin: 1, bMax: 9, resultMax: 99 },
  { label: '2-digit − 1-digit', ops: ['-'], aMin: 11, aMax: 99, bMin: 1, bMax: 9 },
  { label: 'Add two 2-digit numbers within 100', ops: ['+'], aMin: 10, aMax: 89, bMin: 10, bMax: 89, resultMax: 100 },
  { label: 'Subtract 2-digit numbers', ops: ['-'], aMin: 20, aMax: 99, bMin: 10, bMax: 89 },
  { label: 'Add and subtract within 100', ...mixedWithin(100, { aMin: 10 }) },
  { label: 'Missing number within 100', ...mixedWithin(100, { aMin: 10, missing: ['a', 'b'] }) },

  { label: 'Times table ×2', ...times([2]) },
  { label: 'Times table ×5', ...times([5]) },
  { label: 'Times table ×10', ...times([10]) },
  { label: 'Times tables ×2, ×5, ×10', ...times([2, 5, 10]) },
  { label: 'Times table ×3', ...times([3]) },
  { label: 'Times table ×4', ...times([4]) },
  { label: 'Times tables ×2–×5, ×10', ...times([2, 3, 4, 5, 10]) },
  { label: 'Times table ×6', ...times([6]) },
  { label: 'Times table ×7', ...times([7]) },
  { label: 'Times table ×8', ...times([8]) },
  { label: 'Times table ×9', ...times([9]) },
  { label: 'All times tables to 10', ...times(range(1, 10)) },
  { label: 'All times tables to 12', ...times(range(1, 12), { factorMax: 12 }) },

  { label: 'Divide by 2, 5, 10', ...divide([2, 5, 10]) },
  { label: 'Divide by 3, 4', ...divide([3, 4]) },
  { label: 'Divide by 2 to 10', ...divide(range(2, 10)) },
  { label: 'Multiply and divide', ops: ['*', '/'], tables: range(2, 10) },
  { label: 'Missing factor', ...times(range(2, 10), { missing: ['a', 'b'] }) },

  { label: '3-digit add and subtract', ops: ['+', '-'], aMin: 100, aMax: 999, bMin: 100, bMax: 899, resultMax: 999 },
  { label: '2-digit × 1-digit', ops: ['*'], aMin: 10, aMax: 99, bMin: 2, bMax: 9 },
  { label: '2-digit ÷ 1-digit', ops: ['/'], aMin: 10, aMax: 99, bMin: 2, bMax: 9 },
  {
    label: 'All four operations within 100',
    ops: ['+', '-', '*', '/'],
    aMin: 1,
    aMax: 99,
    bMin: 1,
    bMax: 99,
    resultMax: 100,
    tables: range(2, 10),
  },
  {
    label: 'Missing numbers and signs, all operations',
    ops: ['+', '-', '*', '/'],
    aMin: 1,
    aMax: 99,
    bMin: 1,
    bMax: 99,
    resultMax: 100,
    tables: range(2, 10),
    missing: ['a', 'b', 'result', 'op'],
  },
  { label: '3–4 digit add and subtract', ops: ['+', '-'], aMin: 100, aMax: 9999, bMin: 100, bMax: 9999, resultMax: 9999 },
]);

export function clampLevel(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(LEVELS.length, Math.max(1, n));
}

/** 1-based lookup. */
export function getLevel(level) {
  return LEVELS[clampLevel(level) - 1];
}
