const DIGIT_SPECS = new Set(['1', '2', '3', '4', '2-3', '2-4']);
const OPS = new Set(['+', '-', '*', '/']);
const SIGNS = new Set(['positive', 'both']);
const TIMES = new Set(['y', 'n']);
const INPUTS = new Set(['answer', 'multichoice']);
const LAYOUTS = new Set(['side', 'column']);
const MISSINGS = new Set(['y', 'n']);
const MODES = new Set(['default', 'times-table']);

export const DEFAULT_SETTINGS = Object.freeze({
  mode: 'default',
  a: '1',
  b: '1',
  op: ['+'],
  sign: 'both',
  time: 'y',
  input: 'answer',
  layout: 'side',
  missing: 'n',
});

export function isTimesTableMode(settings) {
  return settings?.mode === 'times-table';
}

function parseOps(raw) {
  if (raw == null || String(raw).trim() === '') {
    return [...DEFAULT_SETTINGS.op];
  }

  // URLSearchParams decodes bare "+" as a space, so ",-" or " ,-" often means "+,-".
  const parts = String(raw)
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      return trimmed === '' ? '+' : trimmed;
    });

  const ops = [...new Set(parts.filter((op) => OPS.has(op)))];
  return ops.length > 0 ? ops : [...DEFAULT_SETTINGS.op];
}

/**
 * Parse settings from the current URL query string.
 * Invalid values fall back to defaults.
 */
export function parseSettingsFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);

  const modeRaw = params.get('mode');
  const mode = MODES.has(modeRaw) ? modeRaw : DEFAULT_SETTINGS.mode;
  const timesTable = mode === 'times-table';

  const a = params.get('a');
  const b = params.get('b');
  const sign = params.get('sign');
  const time = params.get('time');
  const input = params.get('input');
  const layout = params.get('layout');
  const missing = params.get('missing');

  return {
    mode,
    a: timesTable ? '1' : DIGIT_SPECS.has(a) ? a : DEFAULT_SETTINGS.a,
    b: timesTable ? '1' : DIGIT_SPECS.has(b) ? b : DEFAULT_SETTINGS.b,
    op: timesTable ? ['*'] : parseOps(params.get('op')),
    sign: SIGNS.has(sign) ? sign : DEFAULT_SETTINGS.sign,
    time: TIMES.has(time) ? time : DEFAULT_SETTINGS.time,
    input: INPUTS.has(input) ? input : DEFAULT_SETTINGS.input,
    layout: LAYOUTS.has(layout) ? layout : DEFAULT_SETTINGS.layout,
    missing: MISSINGS.has(missing) ? missing : DEFAULT_SETTINGS.missing,
  };
}

/**
 * Serialize settings to a query string (without leading ?).
 * Ops are encoded with encodeURIComponent so "+" is %2B (not a space).
 */
export function settingsToQuery(settings) {
  const params = new URLSearchParams();
  if (settings.mode === 'times-table') {
    params.set('mode', 'times-table');
  } else {
    params.set('a', settings.a);
    params.set('b', settings.b);
  }
  params.set('sign', settings.sign);
  params.set('time', settings.time);
  params.set('input', settings.input);
  params.set('layout', settings.layout);
  params.set('missing', settings.missing);
  if (settings.mode === 'times-table') {
    return params.toString();
  }
  const op = settings.op.map((value) => encodeURIComponent(value)).join(',');
  return `${params.toString()}&op=${op}`;
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
  const modeRaw = String(data.get('mode') ?? '');
  const mode = MODES.has(modeRaw) ? modeRaw : DEFAULT_SETTINGS.mode;
  const timesTable = mode === 'times-table';

  const sign = String(data.get('sign') ?? '');
  const time = String(data.get('time') ?? '');
  const input = String(data.get('input') ?? '');
  const layout = String(data.get('layout') ?? '');
  const missing = String(data.get('missing') ?? '');

  if (
    !SIGNS.has(sign) ||
    !TIMES.has(time) ||
    !INPUTS.has(input) ||
    !LAYOUTS.has(layout) ||
    !MISSINGS.has(missing)
  ) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  if (timesTable) {
    return {
      settings: {
        mode: 'times-table',
        a: '1',
        b: '1',
        op: ['*'],
        sign,
        time,
        input,
        layout,
        missing,
      },
      error: null,
    };
  }

  const a = String(data.get('a') ?? '');
  const b = String(data.get('b') ?? '');
  const op = data.getAll('op').map(String).filter((value) => OPS.has(value));

  if (op.length === 0) {
    return { settings: null, error: 'Select at least one equation (+, −, ×, or ÷).' };
  }

  if (!DIGIT_SPECS.has(a) || !DIGIT_SPECS.has(b)) {
    return { settings: null, error: 'Choose valid digit settings for both numbers.' };
  }

  return {
    settings: { mode: 'default', a, b, op, sign, time, input, layout, missing },
    error: null,
  };
}

/**
 * Populate the settings modal form from a settings object.
 */
export function applySettingsToForm(form, settings) {
  const modeInput = form.querySelector(`input[name="mode"][value="${settings.mode}"]`);
  if (modeInput) modeInput.checked = true;

  form.a.value = settings.a;
  form.b.value = settings.b;

  for (const checkbox of form.querySelectorAll('input[name="op"]')) {
    checkbox.checked = settings.op.includes(checkbox.value);
  }

  const signInput = form.querySelector(`input[name="sign"][value="${settings.sign}"]`);
  if (signInput) signInput.checked = true;

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;

  const inputMode = form.querySelector(`input[name="input"][value="${settings.input}"]`);
  if (inputMode) inputMode.checked = true;

  const layoutInput = form.querySelector(`input[name="layout"][value="${settings.layout}"]`);
  if (layoutInput) layoutInput.checked = true;

  const missingInput = form.querySelector(`input[name="missing"][value="${settings.missing}"]`);
  if (missingInput) missingInput.checked = true;
}
