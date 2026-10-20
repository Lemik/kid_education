/**
 * Money level ladder. Each level fixes the question types, coins, and size
 * of the amounts; show results, time, and answer mode stay as settings.
 */
export const MONEY_LEVELS = Object.freeze([
  {
    label: 'Count dimes and quarters',
    preset: { type: ['count'], coins: ['dime', 'quarter'], maxCoins: 2, maxTotal: 50 },
  },
  {
    label: 'Count nickels, dimes, and quarters',
    preset: { type: ['count'], coins: ['nickel', 'dime', 'quarter'], maxCoins: 3, maxTotal: 100 },
  },
  {
    label: 'Which amount is bigger?',
    preset: { type: ['compare'], coins: ['nickel', 'dime', 'quarter'], maxCoins: 3, maxTotal: 100 },
  },
  {
    label: 'Coin equations',
    preset: { type: ['equation'], coins: ['nickel', 'dime', 'quarter'], maxCoins: 3, maxTotal: 100 },
  },
  {
    label: 'Loonies and toonies up to $2',
    preset: {
      type: ['count', 'equation'],
      coins: ['dime', 'quarter', 'loonie', 'toonie'],
      maxCoins: 2,
      maxTotal: 200,
    },
  },
  {
    label: 'All coins up to $5',
    preset: {
      type: ['count', 'compare', 'equation'],
      coins: ['nickel', 'dime', 'quarter', 'loonie', 'toonie'],
      maxCoins: 4,
      maxTotal: 500,
    },
  },
]);
