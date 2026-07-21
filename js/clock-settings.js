const FACES = new Set(['analog', 'digital', 'both']);
const DIFFS = new Set(['oclock', 'half', 'quarter', 'five', 'any']);
const FORMATS = new Set(['12', '24']);
const SIGNS = new Set(['positive', 'both']);
const TIMES = new Set(['y', 'n']);
const INPUTS = new Set(['answer', 'multichoice']);

export const DEFAULT_SETTINGS = Object.freeze({
  face: 'analog',
  diff: 'oclock',
  format: '12',
  sign: 'both',
  time: 'y',
  input: 'multichoice',
});

/**
 * Parse settings from the current URL query string.
 * Invalid values fall back to defaults.
 */
export function parseSettingsFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);

  const face = params.get('face');
  const diff = params.get('diff');
  const format = params.get('format');
  const sign = params.get('sign');
  const time = params.get('time');
  const input = params.get('input');

  return {
    face: FACES.has(face) ? face : DEFAULT_SETTINGS.face,
    diff: DIFFS.has(diff) ? diff : DEFAULT_SETTINGS.diff,
    format: FORMATS.has(format) ? format : DEFAULT_SETTINGS.format,
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
  params.set('face', settings.face);
  params.set('diff', settings.diff);
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
  const face = String(data.get('face') ?? '');
  const diff = String(data.get('diff') ?? '');
  const format = String(data.get('format') ?? '');
  const sign = String(data.get('sign') ?? '');
  const time = String(data.get('time') ?? '');
  const input = String(data.get('input') ?? '');

  if (!FACES.has(face) || !DIFFS.has(diff) || !FORMATS.has(format)) {
    return { settings: null, error: 'Choose valid clock face, difficulty, and format.' };
  }

  if (!SIGNS.has(sign) || !TIMES.has(time) || !INPUTS.has(input)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  return {
    settings: { face, diff, format, sign, time, input },
    error: null,
  };
}

/**
 * Populate the settings modal form from a settings object.
 */
export function applySettingsToForm(form, settings) {
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
