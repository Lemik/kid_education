import { WORDS_LEVELS } from './words-levels.js';
import { presetLevelSettings } from './level-progress.js';
import { withProfileSelections } from './profile.js';

const LENGTH_SPECS = new Set(['3', '4', '5', '6', '3-5', '4-6']);
const HIDE_SPECS = new Set(['1', '2', '3', 'auto']);
const FIRSTS = new Set(['y', 'n']);
const SIGNS = new Set(['positive', 'both']);
const TIMES = new Set(['y', 'n']);
const INPUTS = new Set(['answer', 'multichoice']);
const DIFFICULTY_PARAMS = ['len', 'hide', 'first'];

export const DEFAULT_SETTINGS = withProfileSelections({
  mode: 'custom',
  len: '3',
  hide: '1',
  first: 'y',
  sign: 'both',
  time: 'y',
  input: 'answer',
});

export function isLevelMode(settings) {
  return settings?.mode === 'level';
}

/** Choices that apply in both modes. */
function displayPrefs(raw) {
  return {
    sign: SIGNS.has(raw.sign) ? raw.sign : DEFAULT_SETTINGS.sign,
    time: TIMES.has(raw.time) ? raw.time : DEFAULT_SETTINGS.time,
    input: INPUTS.has(raw.input) ? raw.input : DEFAULT_SETTINGS.input,
  };
}

export function buildLevelSettings(level, display = DEFAULT_SETTINGS) {
  return presetLevelSettings(WORDS_LEVELS, level, displayPrefs(display));
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
    input: params.get('input'),
  };

  if (params.has('level') || !DIFFICULTY_PARAMS.some((key) => params.has(key))) {
    return buildLevelSettings(params.get('level') ?? savedLevel, display);
  }

  const len = params.get('len');
  const hide = params.get('hide');
  const first = params.get('first');
  return {
    mode: 'custom',
    len: LENGTH_SPECS.has(len) ? len : DEFAULT_SETTINGS.len,
    hide: HIDE_SPECS.has(hide) ? hide : DEFAULT_SETTINGS.hide,
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
    params.set('hide', settings.hide);
    params.set('first', settings.first);
  }
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
  const len = String(data.get('len') ?? '');
  const hide = String(data.get('hide') ?? '');
  const first = String(data.get('first') ?? '');
  const sign = String(data.get('sign') ?? '');
  const time = String(data.get('time') ?? '');
  const input = String(data.get('input') ?? '');

  if (!SIGNS.has(sign) || !TIMES.has(time) || !INPUTS.has(input)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  const display = { sign, time, input };
  if (mode === 'level') {
    return { settings: buildLevelSettings(data.get('level'), display), error: null };
  }

  if (!LENGTH_SPECS.has(len) || !HIDE_SPECS.has(hide)) {
    return { settings: null, error: 'Choose valid word length and hide settings.' };
  }

  if (!FIRSTS.has(first)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  return {
    settings: { mode: 'custom', len, hide, first, ...display },
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
  form.hide.value = settings.hide;

  const firstInput = form.querySelector(`input[name="first"][value="${settings.first}"]`);
  if (firstInput) firstInput.checked = true;

  const signInput = form.querySelector(`input[name="sign"][value="${settings.sign}"]`);
  if (signInput) signInput.checked = true;

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;

  const inputMode = form.querySelector(`input[name="input"][value="${settings.input}"]`);
  if (inputMode) inputMode.checked = true;
}
