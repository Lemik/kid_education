import { MEASURE_LEVELS } from './measure-levels.js';
import { presetLevelSettings } from './level-progress.js';
import { withProfileSelections } from './profile.js';

const SYSTEMS = new Set(['metric', 'us', 'time', 'both']);
const QTYPES = new Set(['fact', 'convert', 'both', 'all']);
const DIRS = new Set(['large-to-small', 'small-to-large', 'mixed']);
const QTYS = new Set(['1', 'easy', 'mixed']);
const SIGNS = new Set(['positive', 'both']);
const TIMES = new Set(['y', 'n']);
const INPUTS = new Set(['answer', 'multichoice']);

/**
 * URL params that pick custom difficulty. The question type keeps its old
 * `mode` param name so existing links still work; in settings it is `qtype`
 * because `mode` is the level/custom choice.
 */
const DIFFICULTY_PARAMS = ['sys', 'pairs', 'mode', 'dir', 'qty'];

/** All known pair ids by system (kept in sync with data/units.json). */
export const PAIR_IDS_BY_SYSTEM = Object.freeze({
  metric: Object.freeze(['mm-cm', 'cm-m', 'm-km', 'g-kg', 'mL-L']),
  us: Object.freeze(['in-ft', 'ft-yd', 'oz-lb']),
  time: Object.freeze([
    'min-hr',
    'hr-day',
    'day-week',
    'day-month',
    'day-year',
    'month-year',
    'week-year',
  ]),
});

export const ALL_PAIR_IDS = Object.freeze([
  ...PAIR_IDS_BY_SYSTEM.metric,
  ...PAIR_IDS_BY_SYSTEM.us,
  ...PAIR_IDS_BY_SYSTEM.time,
]);

const ALL_PAIR_ID_SET = new Set(ALL_PAIR_IDS);

export const DEFAULT_SETTINGS = withProfileSelections({
  mode: 'custom',
  sys: 'metric',
  pairs: [...PAIR_IDS_BY_SYSTEM.metric],
  qtype: 'both',
  dir: 'mixed',
  qty: 'easy',
  sign: 'both',
  time: 'y',
  input: 'multichoice',
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
  return presetLevelSettings(MEASURE_LEVELS, level, displayPrefs(display));
}

/**
 * Pair ids available for a given system setting.
 */
export function pairsForSystem(sys) {
  if (sys === 'metric') return [...PAIR_IDS_BY_SYSTEM.metric];
  if (sys === 'us') return [...PAIR_IDS_BY_SYSTEM.us];
  if (sys === 'time') return [...PAIR_IDS_BY_SYSTEM.time];
  // both = all systems
  return [...ALL_PAIR_IDS];
}

/**
 * Parse a pairs query value into a validated list of ids.
 * Returns null if the param is missing/empty (caller should use defaults).
 */
function parsePairsParam(raw, sys) {
  if (raw == null || String(raw).trim() === '') return null;

  const allowed = new Set(pairsForSystem(sys));
  const ids = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter((id) => id && ALL_PAIR_ID_SET.has(id) && allowed.has(id));

  return ids.length > 0 ? ids : null;
}

/**
 * Parse settings from the current URL query string.
 * Custom mode when a difficulty param (sys, pairs, mode, dir, qty) is set
 * without `level`; otherwise level mode at `level` (or `savedLevel`).
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

  const sysRaw = params.get('sys');
  const sys = SYSTEMS.has(sysRaw) ? sysRaw : DEFAULT_SETTINGS.sys;

  const qtypeRaw = params.get('mode');
  const dirRaw = params.get('dir');
  const qtyRaw = params.get('qty');

  const parsedPairs = parsePairsParam(params.get('pairs'), sys);

  return {
    mode: 'custom',
    sys,
    pairs: parsedPairs ?? pairsForSystem(sys),
    qtype: QTYPES.has(qtypeRaw) ? qtypeRaw : DEFAULT_SETTINGS.qtype,
    dir: DIRS.has(dirRaw) ? dirRaw : DEFAULT_SETTINGS.dir,
    qty: QTYS.has(qtyRaw) ? qtyRaw : DEFAULT_SETTINGS.qty,
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
    params.set('sys', settings.sys);
    params.set('pairs', settings.pairs.join(','));
    params.set('mode', settings.qtype);
    params.set('dir', settings.dir);
    params.set('qty', settings.qty);
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
  const sys = String(data.get('sys') ?? '');
  const qtype = String(data.get('qtype') ?? '');
  const dir = String(data.get('dir') ?? '');
  const qty = String(data.get('qty') ?? '');
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

  if (!SYSTEMS.has(sys)) {
    return { settings: null, error: 'Choose a valid unit system.' };
  }

  if (!QTYPES.has(qtype) || !DIRS.has(dir) || !QTYS.has(qty)) {
    return { settings: null, error: 'Choose valid question type, direction, and quantity settings.' };
  }

  const allowed = new Set(pairsForSystem(sys));
  const pairs = data
    .getAll('pairs')
    .map((v) => String(v))
    .filter((id) => allowed.has(id));

  if (pairs.length === 0) {
    return { settings: null, error: 'Select at least one unit pair.' };
  }

  return {
    settings: { mode: 'custom', sys, pairs, qtype, dir, qty, ...display },
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

  const sysInput = form.querySelector(`input[name="sys"][value="${settings.sys}"]`);
  if (sysInput) sysInput.checked = true;

  const qtypeInput = form.querySelector(`input[name="qtype"][value="${settings.qtype}"]`);
  if (qtypeInput) qtypeInput.checked = true;

  const dirInput = form.querySelector(`input[name="dir"][value="${settings.dir}"]`);
  if (dirInput) dirInput.checked = true;

  const qtyInput = form.querySelector(`input[name="qty"][value="${settings.qty}"]`);
  if (qtyInput) qtyInput.checked = true;

  const signInput = form.querySelector(`input[name="sign"][value="${settings.sign}"]`);
  if (signInput) signInput.checked = true;

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;

  const inputMode = form.querySelector(`input[name="input"][value="${settings.input}"]`);
  if (inputMode) inputMode.checked = true;

  const selected = new Set(settings.pairs);
  for (const checkbox of form.querySelectorAll('input[name="pairs"]')) {
    checkbox.checked = selected.has(checkbox.value);
  }
}
