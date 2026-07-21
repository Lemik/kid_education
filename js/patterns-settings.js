const RULES = new Set(['+', '-', '*']);
const STEPS = new Set([1, 2, 3, 5, 10]);
const STARTS = new Set(['1-10', '1-20', '1-50', '5-30']);
const SIGNS = new Set(['positive', 'both']);
const TIMES = new Set(['y', 'n']);
const INPUTS = new Set(['answer', 'multichoice']);

export const DEFAULT_SETTINGS = Object.freeze({
  rule: ['+'],
  step: [2, 5],
  start: '1-20',
  sign: 'both',
  time: 'y',
  input: 'answer',
});

function parseRules(raw) {
  if (raw == null || String(raw).trim() === '') {
    return [...DEFAULT_SETTINGS.rule];
  }

  // URLSearchParams decodes bare "+" as a space, so ",-" or " ,-" often means "+,-".
  const parts = String(raw)
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      return trimmed === '' ? '+' : trimmed;
    });

  const rules = [...new Set(parts.filter((rule) => RULES.has(rule)))];
  return rules.length > 0 ? rules : [...DEFAULT_SETTINGS.rule];
}

function parseSteps(raw) {
  if (raw == null || String(raw).trim() === '') {
    return [...DEFAULT_SETTINGS.step];
  }

  const parts = String(raw)
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => STEPS.has(n));

  const steps = [...new Set(parts)];
  return steps.length > 0 ? steps : [...DEFAULT_SETTINGS.step];
}

/**
 * Parse settings from the current URL query string.
 * Invalid values fall back to defaults.
 */
export function parseSettingsFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);

  const start = params.get('start');
  const sign = params.get('sign');
  const time = params.get('time');
  const input = params.get('input');

  return {
    rule: parseRules(params.get('rule')),
    step: parseSteps(params.get('step')),
    start: STARTS.has(start) ? start : DEFAULT_SETTINGS.start,
    sign: SIGNS.has(sign) ? sign : DEFAULT_SETTINGS.sign,
    time: TIMES.has(time) ? time : DEFAULT_SETTINGS.time,
    input: INPUTS.has(input) ? input : DEFAULT_SETTINGS.input,
  };
}

/**
 * Serialize settings to a query string (without leading ?).
 * Rules are encoded with encodeURIComponent so "+" is %2B (not a space).
 */
export function settingsToQuery(settings) {
  const params = new URLSearchParams();
  params.set('start', settings.start);
  params.set('sign', settings.sign);
  params.set('time', settings.time);
  params.set('input', settings.input);
  params.set('step', settings.step.join(','));
  const rule = settings.rule.map((value) => encodeURIComponent(value)).join(',');
  return `${params.toString()}&rule=${rule}`;
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
  const start = String(data.get('start') ?? '');
  const sign = String(data.get('sign') ?? '');
  const time = String(data.get('time') ?? '');
  const input = String(data.get('input') ?? '');
  const rule = data.getAll('rule').map(String).filter((value) => RULES.has(value));
  const step = data
    .getAll('step')
    .map((value) => Number(value))
    .filter((n) => STEPS.has(n));

  if (rule.length === 0) {
    return { settings: null, error: 'Select at least one rule (+, −, or ×).' };
  }

  if (step.length === 0) {
    return { settings: null, error: 'Select at least one step / factor.' };
  }

  // Multiplication-only sessions need a factor ≥ 2.
  if (rule.every((r) => r === '*') && step.every((n) => n < 2)) {
    return { settings: null, error: 'For × patterns, select a factor of 2 or more.' };
  }

  if (!STARTS.has(start)) {
    return { settings: null, error: 'Choose a valid start range.' };
  }

  if (!SIGNS.has(sign) || !TIMES.has(time) || !INPUTS.has(input)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  return {
    settings: { rule, step, start, sign, time, input },
    error: null,
  };
}

/**
 * Populate the settings modal form from a settings object.
 */
export function applySettingsToForm(form, settings) {
  form.start.value = settings.start;

  for (const checkbox of form.querySelectorAll('input[name="rule"]')) {
    checkbox.checked = settings.rule.includes(checkbox.value);
  }

  for (const checkbox of form.querySelectorAll('input[name="step"]')) {
    checkbox.checked = settings.step.includes(Number(checkbox.value));
  }

  const signInput = form.querySelector(`input[name="sign"][value="${settings.sign}"]`);
  if (signInput) signInput.checked = true;

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;

  const inputMode = form.querySelector(`input[name="input"][value="${settings.input}"]`);
  if (inputMode) inputMode.checked = true;
}
