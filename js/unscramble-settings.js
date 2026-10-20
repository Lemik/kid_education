import { UNSCRAMBLE_LEVELS } from './unscramble-levels.js';
import { presetLevelSettings } from './level-progress.js';
import { withProfileSelections } from './profile.js';

const LENGTH_SPECS = new Set(['3', '4', '5', '6', '3-5', '4-6']);
const FIRSTS = new Set(['y', 'n']);
const SIGNS = new Set(['positive', 'both']);
const TIMES = new Set(['y', 'n']);
const DIFFICULTY_PARAMS = ['len', 'first'];

export const DEFAULT_SETTINGS = withProfileSelections({
  mode: 'custom',
  len: '3',
  first: 'y',
  sign: 'both',
  time: 'y',
});

export function isLevelMode(settings) {
  return settings?.mode === 'level';
}

/** Choices that apply in both modes. */
function displayPrefs(raw) {
  return {
    sign: SIGNS.has(raw.sign) ? raw.sign : DEFAULT_SETTINGS.sign,
    time: TIMES.has(raw.time) ? raw.time : DEFAULT_SETTINGS.time,
  };
}

export function buildLevelSettings(level, display = DEFAULT_SETTINGS) {
  return presetLevelSettings(UNSCRAMBLE_LEVELS, level, displayPrefs(display));
}

/**
 * Parse settings from the current URL query string.
 * Custom mode when difficulty params are set without `level`; otherwise
 * level mode at `level` (or `savedLevel`). Invalid values fall back to defaults.
 */
export function parseSettingsFromUrl(search = window.location.search, savedLevel = 1) {
  const params = new URLSearchParams(search);
  const display = {
    sign: params.get('sign'),
    time: params.get('time'),
  };

  if (params.has('level') || !DIFFICULTY_PARAMS.some((key) => params.has(key))) {
    return buildLevelSettings(params.get('level') ?? savedLevel, display);
  }

  const len = params.get('len');
  const first = params.get('first');
  return {
    mode: 'custom',
    len: LENGTH_SPECS.has(len) ? len : DEFAULT_SETTINGS.len,
    first: FIRSTS.has(first) ? first : DEFAULT_SETTINGS.first,
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
    params.set('len', settings.len);
    params.set('first', settings.first);
  }
  params.set('sign', settings.sign);
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
  const len = String(data.get('len') ?? '');
  const first = String(data.get('first') ?? '');
  const sign = String(data.get('sign') ?? '');
  const time = String(data.get('time') ?? '');

  if (!SIGNS.has(sign) || !TIMES.has(time)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  const display = { sign, time };
  if (mode === 'level') {
    return { settings: buildLevelSettings(data.get('level'), display), error: null };
  }

  if (!LENGTH_SPECS.has(len)) {
    return { settings: null, error: 'Choose a valid word length.' };
  }

  if (!FIRSTS.has(first)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  return {
    settings: { mode: 'custom', len, first, ...display },
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
  form.len.value = settings.len;

  const firstInput = form.querySelector(`input[name="first"][value="${settings.first}"]`);
  if (firstInput) firstInput.checked = true;

  const signInput = form.querySelector(`input[name="sign"][value="${settings.sign}"]`);
  if (signInput) signInput.checked = true;

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;
}
