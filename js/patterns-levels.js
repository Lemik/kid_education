/**
 * Patterns level ladder. Each level fixes the rules, steps, and start range;
 * show results, time, and answer mode stay as settings.
 */
export const PATTERNS_LEVELS = Object.freeze([
  { label: 'Count up by 2 and 5', preset: { rule: ['+'], step: [2, 5], start: '1-10' } },
  { label: 'Count up by 2, 3, 5, 10', preset: { rule: ['+'], step: [2, 3, 5, 10], start: '1-20' } },
  { label: 'Count down by 2, 3, 5', preset: { rule: ['-'], step: [2, 3, 5], start: '5-30' } },
  {
    label: 'Count up and down by 2, 3, 5, 10',
    preset: { rule: ['+', '-'], step: [2, 3, 5, 10], start: '1-50' },
  },
  { label: 'Doubling and tripling (×2, ×3)', preset: { rule: ['*'], step: [2, 3], start: '1-10' } },
  {
    label: 'Mixed patterns: +, −, ×',
    preset: { rule: ['+', '-', '*'], step: [2, 3, 5, 10], start: '1-50' },
  },
]);
