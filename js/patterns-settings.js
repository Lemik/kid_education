import { PATTERNS_LEVELS } from './patterns-levels.js';
import { presetLevelSettings } from './level-progress.js';
import { withProfileSelections } from './profile.js';

const RULES = new Set(['+', '-', '*']);
const STEPS = new Set([1, 2, 3, 5, 10]);
const STARTS = new Set(['1-10', '1-20', '1-50', '5-30']);
const SIGNS = new Set(['positive', 'both']);
const TIMES = new Set(['y', 'n']);
const INPUTS = new Set(['answer', 'multichoice']);

/** URL params that pick custom difficulty. */
const DIFFICULTY_PARAMS = ['rule', 'step', 'start'];

export const DEFAULT_SETTINGS = withProfileSelections({
  mode: 'custom',
  rule: ['+'],
  step: [2, 5],
  start: '1-20',
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
  return presetLevelSettings(PATTERNS_LEVELS, level, displayPrefs(display));
}

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
 * Custom mode when a difficulty param (rule, step, start) is set without
 * `level`; otherwise level mode at `level` (or `savedLevel`).
 * Invalid values fall back to defaults.
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

  const start = params.get('start');
  return {
    mode: 'custom',
    rule: parseRules(params.get('rule')),
    step: parseSteps(params.get('step')),
    start: STARTS.has(start) ? start : DEFAULT_SETTINGS.start,
    ...displayPrefs(display),
  };
}

/**
 * Serialize settings to a query string (without leading ?).
 * Rules are encoded with encodeURIComponent so "+" is %2B (not a space).
 */
export function settingsToQuery(settings) {
  const params = new URLSearchParams();
  if (isLevelMode(settings)) {
    params.set('level', String(settings.level));
  } else {
    params.set('start', settings.start);
    params.set('step', settings.step.join(','));
  }
  params.set('sign', settings.sign);
  params.set('time', settings.time);
  params.set('input', settings.input);
  if (isLevelMode(settings)) return params.toString();

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
  const mode = String(data.get('mode') ?? '');
  const start = String(data.get('start') ?? '');
  const sign = String(data.get('sign') ?? '');
  const time = String(data.get('time') ?? '');
  const input = String(data.get('input') ?? '');
  const rule = data.getAll('rule').map(String).filter((value) => RULES.has(value));
  const step = data
    .getAll('step')
    .map((value) => Number(value))
    .filter((n) => STEPS.has(n));

  if (!SIGNS.has(sign) || !TIMES.has(time) || !INPUTS.has(input)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  const display = { sign, time, input };
  if (mode === 'level') {
    return { settings: buildLevelSettings(data.get('level'), display), error: null };
  }

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

  return {
    settings: { mode: 'custom', rule, step, start, ...display },
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
