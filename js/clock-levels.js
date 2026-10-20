/**
 * Clock level ladder. Each level only fixes how precise the time is;
 * clock face, 12/24-hour format, and answer mode stay as settings.
 */
export const CLOCK_LEVELS = Object.freeze([
  { label: "On the hour (3 o'clock)", preset: { diff: 'oclock' } },
  { label: 'Half past', preset: { diff: 'half' } },
  { label: 'Quarter past and quarter to', preset: { diff: 'quarter' } },
  { label: 'Every 5 minutes', preset: { diff: 'five' } },
  { label: 'Any minute', preset: { diff: 'any' } },
]);
