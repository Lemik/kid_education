const LENGTH_SPECS = new Set(['3', '4', '5', '6', '3-5', '4-6']);
const SIGNS = new Set(['positive', 'both']);
const TIMES = new Set(['y', 'n']);
const INPUTS = new Set(['answer', 'multichoice']);

export const DEFAULT_SETTINGS = Object.freeze({
  len: '3',
  sign: 'positive',
  time: 'y',
  input: 'multichoice',
});

/**
 * Parse settings from the current URL query string.
 * Invalid values fall back to defaults.
 */
export function parseSettingsFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);

  const len = params.get('len');
  const sign = params.get('sign');
  const time = params.get('time');
  const input = params.get('input');

  return {
    len: LENGTH_SPECS.has(len) ? len : DEFAULT_SETTINGS.len,
    sign: SIGNS.has(sign) ? sign : DEFAULT_SETTINGS.sign,
    time: TIMES.has(time) ? time : DEFAULT_SETTINGS.time,
    input: INPUTS.has(input) ? input : DEFAULT_SETTINGS.input,
  };
}

/**
 * Serialize settings to a query string (without leading ?).
 */
export function settingsToQuery(settings) {
  const params = new URLSearchParams();
  params.set('len', settings.len);
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
  const len = String(data.get('len') ?? '');
  const sign = String(data.get('sign') ?? '');
  const time = String(data.get('time') ?? '');
  const input = String(data.get('input') ?? '');

  if (!LENGTH_SPECS.has(len)) {
    return { settings: null, error: 'Choose a valid word length.' };
  }

  if (!SIGNS.has(sign) || !TIMES.has(time) || !INPUTS.has(input)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  return {
    settings: { len, sign, time, input },
    error: null,
  };
}

/**
 * Populate the settings modal form from a settings object.
 */
export function applySettingsToForm(form, settings) {
  form.len.value = settings.len;

  const signInput = form.querySelector(`input[name="sign"][value="${settings.sign}"]`);
  if (signInput) signInput.checked = true;

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;

  const inputMode = form.querySelector(`input[name="input"][value="${settings.input}"]`);
  if (inputMode) inputMode.checked = true;
}
