import { MONEY_LEVELS } from './money-levels.js';
import { presetLevelSettings } from './level-progress.js';
import { withProfileSelections } from './profile.js';

const TYPES = new Set(['count', 'compare', 'equation']);
const COINS = new Set(['nickel', 'dime', 'quarter', 'loonie', 'toonie']);
const MAX_COINS = new Set([1, 2, 3, 4]);
const MAX_TOTALS = new Set([50, 100, 200, 500]);
const SIGNS = new Set(['positive', 'both']);
const TIMES = new Set(['y', 'n']);
const INPUTS = new Set(['answer', 'multichoice']);

const DIFFICULTY_PARAMS = ['type', 'coins', 'maxCoins', 'maxTotal'];

export const DEFAULT_SETTINGS = withProfileSelections({
  mode: 'custom',
  type: ['count', 'compare', 'equation'],
  coins: ['dime', 'quarter'],
  maxCoins: 3,
  maxTotal: 100,
  sign: 'both',
  time: 'y',
  input: 'multichoice',
});

function parseList(raw, allowed, fallback) {
  if (raw == null || String(raw).trim() === '') {
    return [...fallback];
  }

  const parts = String(raw)
    .split(',')
    .map((part) => part.trim())
    .filter((part) => allowed.has(part));

  const unique = [...new Set(parts)];
  return unique.length > 0 ? unique : [...fallback];
}

function parseNumberParam(raw, allowed, fallback) {
  const value = Number(raw);
  return allowed.has(value) ? value : fallback;
}

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
  return presetLevelSettings(MONEY_LEVELS, level, displayPrefs(display));
}

/**
 * Parse settings from the current URL query string.
 * Custom mode when difficulty params are set without `level`; otherwise level
 * mode at `level` (or `savedLevel`). Invalid values fall back to defaults.
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

  return {
    mode: 'custom',
    type: parseList(params.get('type'), TYPES, DEFAULT_SETTINGS.type),
    coins: parseList(params.get('coins'), COINS, DEFAULT_SETTINGS.coins),
    maxCoins: parseNumberParam(params.get('maxCoins'), MAX_COINS, DEFAULT_SETTINGS.maxCoins),
    maxTotal: parseNumberParam(params.get('maxTotal'), MAX_TOTALS, DEFAULT_SETTINGS.maxTotal),
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
    params.set('type', settings.type.join(','));
    params.set('coins', settings.coins.join(','));
    params.set('maxCoins', String(settings.maxCoins));
    params.set('maxTotal', String(settings.maxTotal));
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
 * Returns { settings, error } � error is a string if validation fails.
 */
export function readSettingsFromForm(form) {
  const data = new FormData(form);
  const mode = String(data.get('mode') ?? '');
  const type = data.getAll('type').map(String).filter((value) => TYPES.has(value));
  const coins = data.getAll('coins').map(String).filter((value) => COINS.has(value));
  const maxCoins = Number(data.get('maxCoins'));
  const maxTotal = Number(data.get('maxTotal'));
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

  if (type.length === 0) {
    return { settings: null, error: 'Select at least one question type.' };
  }

  if (coins.length === 0) {
    return { settings: null, error: 'Select at least one coin.' };
  }

  if (!MAX_COINS.has(maxCoins)) {
    return { settings: null, error: 'Choose a valid max coins per type.' };
  }

  if (!MAX_TOTALS.has(maxTotal)) {
    return { settings: null, error: 'Choose a valid max total.' };
  }

  // Smallest enabled coin must be able to fit under maxTotal.
  const minCoinCents = {
    nickel: 5,
    dime: 10,
    quarter: 25,
    loonie: 100,
    toonie: 200,
  };
  const smallest = Math.min(...coins.map((id) => minCoinCents[id]));
  if (smallest > maxTotal) {
    return {
      settings: null,
      error: 'Max total is too small for the coins you selected.',
    };
  }

  return {
    settings: { mode: 'custom', type, coins, maxCoins, maxTotal, ...display },
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

  for (const checkbox of form.querySelectorAll('input[name="type"]')) {
    checkbox.checked = settings.type.includes(checkbox.value);
  }

  for (const checkbox of form.querySelectorAll('input[name="coins"]')) {
    checkbox.checked = settings.coins.includes(checkbox.value);
  }

  form.maxCoins.value = String(settings.maxCoins);
  form.maxTotal.value = String(settings.maxTotal);

  const signInput = form.querySelector(`input[name="sign"][value="${settings.sign}"]`);
  if (signInput) signInput.checked = true;

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;

  const inputMode = form.querySelector(`input[name="input"][value="${settings.input}"]`);
  if (inputMode) inputMode.checked = true;
}
