import { CLOCK_LEVELS } from './clock-levels.js';
import { presetLevelSettings } from './level-progress.js';
import { withProfileSelections } from './profile.js';

const FACES = new Set(['analog', 'digital', 'both']);
const DIFFS = new Set(['oclock', 'half', 'quarter', 'five', 'any']);
const FORMATS = new Set(['12', '24']);
const SIGNS = new Set(['positive', 'both']);
const TIMES = new Set(['y', 'n']);
const INPUTS = new Set(['answer', 'multichoice']);

export const DEFAULT_SETTINGS = withProfileSelections({
  mode: 'custom',
  face: 'analog',
  diff: 'oclock',
  format: '12',
  sign: 'both',
  time: 'y',
  input: 'multichoice',
});

export function isLevelMode(settings) {
  return settings?.mode === 'level';
}

/** Choices that apply in both modes. */
function displayPrefs(raw) {
  return {
    face: FACES.has(raw.face) ? raw.face : DEFAULT_SETTINGS.face,
    format: FORMATS.has(raw.format) ? raw.format : DEFAULT_SETTINGS.format,
    sign: SIGNS.has(raw.sign) ? raw.sign : DEFAULT_SETTINGS.sign,
    time: TIMES.has(raw.time) ? raw.time : DEFAULT_SETTINGS.time,
    input: INPUTS.has(raw.input) ? raw.input : DEFAULT_SETTINGS.input,
  };
}

export function buildLevelSettings(level, display = DEFAULT_SETTINGS) {
  return presetLevelSettings(CLOCK_LEVELS, level, displayPrefs(display));
}

/**
 * Parse settings from the current URL query string.
 * Custom mode when `diff` is set without `level`; otherwise level mode at
 * `level` (or `savedLevel`). Invalid values fall back to defaults.
 */
export function parseSettingsFromUrl(search = window.location.search, savedLevel = 1) {
  const params = new URLSearchParams(search);
  const display = {
    face: params.get('face'),
    format: params.get('format'),
    sign: params.get('sign'),
    time: params.get('time'),
    input: params.get('input'),
  };

  if (params.has('level') || !params.has('diff')) {
    return buildLevelSettings(params.get('level') ?? savedLevel, display);
  }

  const diff = params.get('diff');
  return {
    mode: 'custom',
    diff: DIFFS.has(diff) ? diff : DEFAULT_SETTINGS.diff,
    ...displayPrefs(display),
  };
}

/**
 * Serialize settings to a query string (without leading ?).
 */
export function settingsToQuery(settings) {
  const params = new URLSearchParams();
  if (isLevelMode(settings)) {
    params.set('level', String(settings.level));
  } else {
    params.set('diff', settings.diff);
  }
  params.set('face', settings.face);
  params.set('format', settings.format);
  params.set('sign', settings.sign);
  params.set('time', settings.time);
  params.set('input', settings.input);
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
  const face = String(data.get('face') ?? '');
  const diff = String(data.get('diff') ?? '');
  const format = String(data.get('format') ?? '');
  const sign = String(data.get('sign') ?? '');
  const time = String(data.get('time') ?? '');
  const input = String(data.get('input') ?? '');

  if (!FACES.has(face) || !FORMATS.has(format)) {
    return { settings: null, error: 'Choose valid clock face and format.' };
  }

  if (!SIGNS.has(sign) || !TIMES.has(time) || !INPUTS.has(input)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  const display = { face, format, sign, time, input };
  if (mode === 'level') {
    return { settings: buildLevelSettings(data.get('level'), display), error: null };
  }

  if (!DIFFS.has(diff)) {
    return { settings: null, error: 'Choose a valid difficulty.' };
  }

  return {
    settings: { mode: 'custom', diff, ...display },
    error: null,
  };
}

/**
 * Populate the settings modal form from a settings object.
 * `savedLevel` preselects the level dropdown in custom mode.
 */
export function applySettingsToForm(form, settings, savedLevel = 1) {
  const modeInput = form.querySelector(`input[name="mode"][value="${settings.mode}"]`);
  if (modeInput) modeInput.checked = true;

  form.level.value = String(settings.level ?? savedLevel);
  form.diff.value = settings.diff;

  const faceInput = form.querySelector(`input[name="face"][value="${settings.face}"]`);
  if (faceInput) faceInput.checked = true;

  const formatInput = form.querySelector(`input[name="format"][value="${settings.format}"]`);
  if (formatInput) formatInput.checked = true;

  const signInput = form.querySelector(`input[name="sign"][value="${settings.sign}"]`);
  if (signInput) signInput.checked = true;

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;

  const inputMode = form.querySelector(`input[name="input"][value="${settings.input}"]`);
  if (inputMode) inputMode.checked = true;
}
