/**
 * Subset level ladder. Each level fixes the board size and actions;
 * time stays as a setting.
 */
export const SUBSET_LEVELS = Object.freeze([
  { label: 'Addition, small board', preset: { levels: 1, op: ['+'] } },
  { label: 'Addition, big board', preset: { levels: 2, op: ['+'] } },
  { label: 'Add and subtract, big board', preset: { levels: 2, op: ['+', '-'] } },
  { label: 'Multiplication, small board', preset: { levels: 1, op: ['*'] } },
  { label: 'Multiply and divide, big board', preset: { levels: 2, op: ['*', '/'] } },
]);
