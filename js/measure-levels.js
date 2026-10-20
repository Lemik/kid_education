/**
 * Measurements level ladder. Each level fixes the units and question style;
 * show results, time, and answer mode stay as settings.
 * `pairs` must belong to `sys` (see pairsForSystem in measure-settings.js).
 */
export const MEASURE_LEVELS = Object.freeze([
  {
    label: 'Metric length: mm, cm, m',
    preset: { sys: 'metric', pairs: ['mm-cm', 'cm-m'], qtype: 'both', dir: 'large-to-small', qty: 'easy' },
  },
  {
    label: 'All metric units, both ways',
    preset: {
      sys: 'metric',
      pairs: ['mm-cm', 'cm-m', 'm-km', 'g-kg', 'mL-L'],
      qtype: 'all',
      dir: 'mixed',
      qty: 'easy',
    },
  },
  {
    label: 'Time: minutes, hours, days, weeks',
    preset: { sys: 'time', pairs: ['min-hr', 'hr-day', 'day-week'], qtype: 'both', dir: 'large-to-small', qty: 'easy' },
  },
  {
    label: 'All time units, both ways',
    preset: {
      sys: 'time',
      pairs: ['min-hr', 'hr-day', 'day-week', 'day-month', 'day-year', 'month-year', 'week-year'],
      qtype: 'all',
      dir: 'mixed',
      qty: 'mixed',
    },
  },
  {
    label: 'All units: metric, US, and time',
    preset: {
      sys: 'both',
      pairs: [
        'mm-cm', 'cm-m', 'm-km', 'g-kg', 'mL-L',
        'in-ft', 'ft-yd', 'oz-lb',
        'min-hr', 'hr-day', 'day-week', 'day-month', 'day-year', 'month-year', 'week-year',
      ],
      qtype: 'all',
      dir: 'mixed',
      qty: 'mixed',
    },
  },
]);
