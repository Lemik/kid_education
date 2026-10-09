import { clampLevel, getLevel } from './levels.js';
import { LLAMA_LEVELS } from './llama-levels.js';

const SIZES = new Set([4, 5, 6, 7, 8]);
const SHAPES = new Set(['compact', 'twisty']);
const TIMES = new Set(['y', 'n']);

export const DEFAULT_SETTINGS = Object.freeze({
  size: 5,
  shape: 'compact',
  time: 'y',
});

export function isLevelMode(settings) {
  return settings?.mode === 'level';
}

function timePref(time) {
  return TIMES.has(time) ? time : DEFAULT_SETTINGS.time;
}

export function buildLevelSettings(level, time = DEFAULT_SETTINGS.time) {
  const n = clampLevel(level, LLAMA_LEVELS);
  const spec = getLevel(n, LLAMA_LEVELS);
  return {
    mode: 'level',
    level: n,
    label: spec.label,
    size: spec.size,
    shape: spec.shape,
    single: spec.single,
    time: timePref(time),
  };
}

export function buildCustomSettings({ size, shape, time }) {
  return {
    mode: 'custom',
    size: SIZES.has(size) ? size : DEFAULT_SETTINGS.size,
    shape: SHAPES.has(shape) ? shape : DEFAULT_SETTINGS.shape,
    time: timePref(time),
  };
}

/**
 * Parse settings from the URL. Custom mode when `size` or `shape` is present;
 * otherwise level mode at `level` (or `savedLevel`).
 */
export function parseSettingsFromUrl(search = window.location.search, savedLevel = 1) {
  const params = new URLSearchParams(search);
  const time = params.get('time');
  const custom = params.has('size') || params.has('shape');

  if (params.has('level') || !custom) {
    const level = params.has('level') ? params.get('level') : savedLevel;
    return buildLevelSettings(level, time);
  }

  return buildCustomSettings({
    size: Number(params.get('size')),
    shape: params.get('shape'),
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
    params.set('size', String(settings.size));
    params.set('shape', settings.shape);
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

  const size = Number(data.get('size'));
  const shape = String(data.get('shape') ?? '');

  if (!SIZES.has(size) || !SHAPES.has(shape)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  return { settings: buildCustomSettings({ size, shape, time }), error: null };
}

/**
 * Populate the settings modal form. Custom fields show the current board's
 * size and shape; `savedLevel` preselects the level dropdown in custom mode.
 */
export function applySettingsToForm(form, settings, savedLevel = 1) {
  const modeInput = form.querySelector(`input[name="mode"][value="${settings.mode}"]`);
  if (modeInput) modeInput.checked = true;

  form.level.value = String(clampLevel(settings.level ?? savedLevel, LLAMA_LEVELS));
  form.size.value = String(settings.size);

  const shapeInput = form.querySelector(`input[name="shape"][value="${settings.shape}"]`);
  if (shapeInput) shapeInput.checked = true;

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;
}

/** Help text for the current settings. */
export function promptText(settings) {
  const n = settings.size;
  return `${n} llamas are hiding: exactly one in every row, every column, and every color. `
    + 'Llamas never touch, not even corner to corner. '
    + 'Tap a square once to mark it with X (tap again to clear it). '
    + 'Double-tap a square to look for a llama. Three wrong guesses and the round is over.';
}
