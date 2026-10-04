import { clampLevel, getLevel } from './levels.js';
import { TIMES_LEVELS } from './times-levels.js';

const ALL_TABLES = Array.from({ length: 12 }, (_, i) => i + 1);
const MAXES = new Set(['10', '12']);
const TIMES = new Set(['y', 'n']);
const INPUTS = new Set(['answer', 'multichoice']);
const LAYOUTS = new Set(['side', 'column']);
const MISSINGS = new Set(['y', 'n']);

export const DEFAULT_SETTINGS = Object.freeze({
  tables: [2],
  max: '10',
  missing: 'n',
  time: 'y',
  input: 'answer',
  layout: 'side',
});

export function isLevelMode(settings) {
  return settings?.mode === 'level';
}

function displayPrefs(display) {
  return {
    time: TIMES.has(display.time) ? display.time : DEFAULT_SETTINGS.time,
    input: INPUTS.has(display.input) ? display.input : DEFAULT_SETTINGS.input,
    layout: LAYOUTS.has(display.layout) ? display.layout : DEFAULT_SETTINGS.layout,
  };
}

/** Fields shared by both modes so js/generator.js can build questions from `spec`. */
function withSpec(spec) {
  return {
    spec,
    a: '1',
    b: '1',
    op: ['*'],
    sign: 'positive',
    missing: spec.missing ? 'y' : 'n',
  };
}

export function buildLevelSettings(level, display = DEFAULT_SETTINGS) {
  const n = clampLevel(level, TIMES_LEVELS);
  return {
    mode: 'level',
    level: n,
    ...withSpec(getLevel(n, TIMES_LEVELS)),
    ...displayPrefs(display),
  };
}

export function buildCustomSettings({ tables, max, missing, ...display }) {
  const factorMax = Number(max);
  const spec = {
    label: `Custom: ×${tables.join(', ×')}`,
    ops: ['*'],
    tables: [...tables],
    factorMax,
    ...(missing === 'y' ? { missing: ['a', 'b', 'result'] } : {}),
  };
  return {
    mode: 'custom',
    tables: [...tables],
    max: String(factorMax),
    ...withSpec(spec),
    missing,
    ...displayPrefs(display),
  };
}

function parseTables(raw) {
  const tables = [
    ...new Set(
      String(raw ?? '')
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((n) => ALL_TABLES.includes(n)),
    ),
  ].sort((x, y) => x - y);
  return tables.length > 0 ? tables : [...DEFAULT_SETTINGS.tables];
}

/**
 * Parse settings from the URL. Custom mode when `tables` is present;
 * otherwise level mode at `level` (or `savedLevel`).
 */
export function parseSettingsFromUrl(search = window.location.search, savedLevel = 1) {
  const params = new URLSearchParams(search);
  const display = {
    time: params.get('time'),
    input: params.get('input'),
    layout: params.get('layout'),
  };

  if (!params.has('tables')) {
    const level = params.has('level') ? params.get('level') : savedLevel;
    return buildLevelSettings(level, display);
  }

  const max = params.get('max');
  const missing = params.get('missing');
  return buildCustomSettings({
    tables: parseTables(params.get('tables')),
    max: MAXES.has(max) ? max : DEFAULT_SETTINGS.max,
    missing: MISSINGS.has(missing) ? missing : DEFAULT_SETTINGS.missing,
    ...display,
  });
}

export function settingsToQuery(settings) {
  const params = new URLSearchParams();
  if (settings.mode === 'level') {
    params.set('level', String(settings.level));
  } else {
    params.set('tables', settings.tables.join(','));
    params.set('max', settings.max);
    params.set('missing', settings.missing);
  }
  params.set('time', settings.time);
  params.set('input', settings.input);
  params.set('layout', settings.layout);
  return params.toString().replaceAll('%2C', ',');
}

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
  const display = {
    time: String(data.get('time') ?? ''),
    input: String(data.get('input') ?? ''),
    layout: String(data.get('layout') ?? ''),
  };

  if (!TIMES.has(display.time) || !INPUTS.has(display.input) || !LAYOUTS.has(display.layout)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  if (mode === 'level') {
    return { settings: buildLevelSettings(data.get('level'), display), error: null };
  }

  const tables = data
    .getAll('tables')
    .map(Number)
    .filter((n) => ALL_TABLES.includes(n));
  if (tables.length === 0) {
    return { settings: null, error: 'Pick at least one times table.' };
  }

  const max = String(data.get('max') ?? '');
  const missing = String(data.get('missing') ?? '');
  if (!MAXES.has(max) || !MISSINGS.has(missing)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  return { settings: buildCustomSettings({ tables, max, missing, ...display }), error: null };
}

/**
 * Populate the settings modal form. Custom fields keep their defaults in level
 * mode; `savedLevel` preselects the level dropdown in custom mode.
 */
export function applySettingsToForm(form, settings, savedLevel = 1) {
  const custom = settings.mode === 'custom' ? settings : DEFAULT_SETTINGS;

  form.querySelector(`input[name="mode"][value="${settings.mode}"]`).checked = true;
  form.level.value = String(clampLevel(settings.level ?? savedLevel, TIMES_LEVELS));

  for (const checkbox of form.querySelectorAll('input[name="tables"]')) {
    checkbox.checked = custom.tables.includes(Number(checkbox.value));
  }
  form.querySelector(`input[name="max"][value="${custom.max}"]`).checked = true;
  form.querySelector(`input[name="missing"][value="${custom.missing}"]`).checked = true;
  form.querySelector(`input[name="time"][value="${settings.time}"]`).checked = true;
  form.querySelector(`input[name="input"][value="${settings.input}"]`).checked = true;
  form.querySelector(`input[name="layout"][value="${settings.layout}"]`).checked = true;
}
