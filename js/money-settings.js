const TYPES = new Set(['count', 'compare', 'equation']);
const COINS = new Set(['nickel', 'dime', 'quarter', 'loonie', 'toonie']);
const MAX_COINS = new Set([1, 2, 3, 4]);
const MAX_TOTALS = new Set([50, 100, 200, 500]);
const SIGNS = new Set(['positive', 'both']);
const TIMES = new Set(['y', 'n']);
const INPUTS = new Set(['answer', 'multichoice']);

export const DEFAULT_SETTINGS = Object.freeze({
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

/**
 * Parse settings from the current URL query string.
 * Invalid values fall back to defaults.
 */
export function parseSettingsFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);

  return {
    type: parseList(params.get('type'), TYPES, DEFAULT_SETTINGS.type),
    coins: parseList(params.get('coins'), COINS, DEFAULT_SETTINGS.coins),
    maxCoins: parseNumberParam(params.get('maxCoins'), MAX_COINS, DEFAULT_SETTINGS.maxCoins),
    maxTotal: parseNumberParam(params.get('maxTotal'), MAX_TOTALS, DEFAULT_SETTINGS.maxTotal),
    sign: SIGNS.has(params.get('sign')) ? params.get('sign') : DEFAULT_SETTINGS.sign,
    time: TIMES.has(params.get('time')) ? params.get('time') : DEFAULT_SETTINGS.time,
    input: INPUTS.has(params.get('input')) ? params.get('input') : DEFAULT_SETTINGS.input,
  };
}

/**
 * Serialize settings to a query string (without leading ?).
 */
export function settingsToQuery(settings) {
  const params = new URLSearchParams();
  params.set('type', settings.type.join(','));
  params.set('coins', settings.coins.join(','));
  params.set('maxCoins', String(settings.maxCoins));
  params.set('maxTotal', String(settings.maxTotal));
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
  const type = data.getAll('type').map(String).filter((value) => TYPES.has(value));
  const coins = data.getAll('coins').map(String).filter((value) => COINS.has(value));
  const maxCoins = Number(data.get('maxCoins'));
  const maxTotal = Number(data.get('maxTotal'));
  const sign = String(data.get('sign') ?? '');
  const time = String(data.get('time') ?? '');
  const input = String(data.get('input') ?? '');

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

  if (!SIGNS.has(sign) || !TIMES.has(time) || !INPUTS.has(input)) {
    return { settings: null, error: 'Please fill in all settings.' };
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
    settings: { type, coins, maxCoins, maxTotal, sign, time, input },
    error: null,
  };
}

/**
 * Populate the settings modal form from a settings object.
 */
export function applySettingsToForm(form, settings) {
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
