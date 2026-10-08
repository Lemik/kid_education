import { clampLevel, getLevel } from './levels.js';
import { LATIN_LEVELS } from './latin-levels.js';

const TYPES = new Set(['pic', 'num', 'word']);
const SIZES = new Set([3, 4, 5, 6]);
const DIFFS = new Set(['easy', 'medium', 'hard']);
const TIMES = new Set(['y', 'n']);

export const DEFAULT_SETTINGS = Object.freeze({
  type: 'pic',
  size: 4,
  diff: 'easy',
  time: 'y',
});

export function isLevelMode(settings) {
  return settings?.mode === 'level';
}

function timePref(time) {
  return TIMES.has(time) ? time : DEFAULT_SETTINGS.time;
}

export function buildLevelSettings(level, time = DEFAULT_SETTINGS.time) {
  const n = clampLevel(level, LATIN_LEVELS);
  const spec = getLevel(n, LATIN_LEVELS);
  return {
    mode: 'level',
    level: n,
    label: spec.label,
    type: spec.type,
    size: spec.size,
    diff: spec.diff,
    time: timePref(time),
  };
}

export function buildCustomSettings({ type, size, diff, time }) {
  return {
    mode: 'custom',
    type: TYPES.has(type) ? type : DEFAULT_SETTINGS.type,
    size: SIZES.has(size) ? size : DEFAULT_SETTINGS.size,
    diff: DIFFS.has(diff) ? diff : DEFAULT_SETTINGS.diff,
    time: timePref(time),
  };
}

/**
 * Parse settings from the URL. Custom mode when `type`, `size`, or `diff` is
 * present; otherwise level mode at `level` (or `savedLevel`).
 */
export function parseSettingsFromUrl(search = window.location.search, savedLevel = 1) {
  const params = new URLSearchParams(search);
  const time = params.get('time');
  const custom = params.has('type') || params.has('size') || params.has('diff');

  if (params.has('level') || !custom) {
    const level = params.has('level') ? params.get('level') : savedLevel;
    return buildLevelSettings(level, time);
  }

  return buildCustomSettings({
    type: params.get('type'),
    size: Number(params.get('size')),
    diff: params.get('diff'),
    time,
  });
}

/**
 * Serialize settings to a query string (without leading ?).
 */
export function settingsToQuery(settings) {
  const params = new URLSearchParams();
  if (isLevelMode(settings)) {
    params.set('level', String(settings.level));
  } else {
    params.set('type', settings.type);
    params.set('size', String(settings.size));
    params.set('diff', settings.diff);
  }
  params.set('time', settings.time);
  return params.toString();
}

/**
 * Build a full URL with the given settings as query params.
 */
export function settingsToUrl(settings, base = window.location.href) {
  const url = new URL(base);
  url.search = settingsToQuery(settings);
  return url.toString();
}

/**
 * Read settings from the settings modal form.
 * Returns { settings, error } — error is a string if validation fails.
 */
export function readSettingsFromForm(form) {
  const data = new FormData(form);
  const mode = String(data.get('mode') ?? '');
  const time = String(data.get('time') ?? '');

  if (!TIMES.has(time)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  if (mode === 'level') {
    return { settings: buildLevelSettings(data.get('level'), time), error: null };
  }

  const type = String(data.get('type') ?? '');
  const size = Number(data.get('size'));
  const diff = String(data.get('diff') ?? '');

  if (!TYPES.has(type) || !SIZES.has(size) || !DIFFS.has(diff)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  return { settings: buildCustomSettings({ type, size, diff, time }), error: null };
}

/**
 * Populate the settings modal form. Custom fields show the current puzzle's
 * type/size/difficulty; `savedLevel` preselects the level dropdown in custom mode.
 */
export function applySettingsToForm(form, settings, savedLevel = 1) {
  const modeInput = form.querySelector(`input[name="mode"][value="${settings.mode}"]`);
  if (modeInput) modeInput.checked = true;

  form.level.value = String(clampLevel(settings.level ?? savedLevel, LATIN_LEVELS));

  const typeInput = form.querySelector(`input[name="type"][value="${settings.type}"]`);
  if (typeInput) typeInput.checked = true;

  form.size.value = String(settings.size);

  const diffInput = form.querySelector(`input[name="diff"][value="${settings.diff}"]`);
  if (diffInput) diffInput.checked = true;

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;
}

/** Short name of what is being placed: picture, number, or word. */
export function thingName(settings) {
  if (settings.type === 'num') return 'number';
  if (settings.type === 'word') return 'word';
  return 'picture';
}

/** Help text for the current settings. */
export function promptText(settings) {
  const thing = thingName(settings);
  return `Fill the grid so each ${thing} appears exactly once in every row and every column. `
    + `Tap a ${thing} below the grid, then tap an empty square to place it. `
    + `Tap a ${thing} you placed to remove it. Press Check for a hint.`;
}
