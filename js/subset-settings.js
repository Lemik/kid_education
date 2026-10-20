import { SUBSET_LEVELS } from './subset-levels.js';
import { presetLevelSettings } from './level-progress.js';
import { withProfileSelections } from './profile.js';

const OPS = new Set(['+', '-', '*', '/']);
const LEVELS = new Set(['1', '2']);
const TIMES = new Set(['y', 'n']);

/** URL params that pick custom difficulty. */
const DIFFICULTY_PARAMS = ['levels', 'op'];

export const DEFAULT_SETTINGS = withProfileSelections({
  mode: 'custom',
  levels: 1,
  op: ['+'],
  time: 'y',
});

export function isLevelMode(settings) {
  return settings?.mode === 'level';
}

/** Choices that apply in both modes. */
function displayPrefs(raw) {
  return {
    time: TIMES.has(raw.time) ? raw.time : DEFAULT_SETTINGS.time,
  };
}

export function buildLevelSettings(level, display = DEFAULT_SETTINGS) {
  return presetLevelSettings(SUBSET_LEVELS, level, displayPrefs(display));
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
 * Custom mode when `levels` or `op` is set without `level`; otherwise level
 * mode at `level` (or `savedLevel`). Invalid values fall back to defaults.
 */
export function parseSettingsFromUrl(search = window.location.search, savedLevel = 1) {
  const params = new URLSearchParams(search);
  const display = { time: params.get('time') };

  if (params.has('level') || !DIFFICULTY_PARAMS.some((key) => params.has(key))) {
    return buildLevelSettings(params.get('level') ?? savedLevel, display);
  }

  const levelsRaw = params.get('levels');
  return {
    mode: 'custom',
    levels: LEVELS.has(levelsRaw) ? Number(levelsRaw) : DEFAULT_SETTINGS.levels,
    op: parseOps(params.get('op')),
    ...displayPrefs(display),
  };
}

/**
 * Serialize settings to a query string (without leading ?).
 * Ops are encoded with encodeURIComponent so "+" is %2B (not a space).
 */
export function settingsToQuery(settings) {
  const params = new URLSearchParams();
  if (isLevelMode(settings)) {
    params.set('level', String(settings.level));
    params.set('time', settings.time);
    return params.toString();
  }
  params.set('levels', String(settings.levels));
  params.set('time', settings.time);
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
  const mode = String(data.get('mode') ?? '');
  const levels = String(data.get('levels') ?? '');
  const op = data.getAll('op').map(String).filter((value) => OPS.has(value));
  const time = String(data.get('time') ?? '');

  if (!TIMES.has(time)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  const display = { time };
  if (mode === 'level') {
    return { settings: buildLevelSettings(data.get('level'), display), error: null };
  }

  if (op.length === 0) {
    return { settings: null, error: 'Select at least one action (+, −, ×, or ÷).' };
  }

  if (!LEVELS.has(levels)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  return { settings: { mode: 'custom', levels: Number(levels), op, ...display }, error: null };
}

/**
 * Populate the settings modal form from a settings object.
 * `savedLevel` preselects the level dropdown in custom mode.
 */
export function applySettingsToForm(form, settings, savedLevel = 1) {
  const modeInput = form.querySelector(`input[name="mode"][value="${settings.mode}"]`);
  if (modeInput) modeInput.checked = true;

  form.level.value = String(settings.level ?? savedLevel);

  const levelsInput = form.querySelector(`input[name="levels"][value="${settings.levels}"]`);
  if (levelsInput) levelsInput.checked = true;

  for (const checkbox of form.querySelectorAll('input[name="op"]')) {
    checkbox.checked = settings.op.includes(checkbox.value);
  }

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;
}
