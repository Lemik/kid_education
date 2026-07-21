const SYSTEMS = new Set(['metric', 'us', 'time', 'both']);
const MODES = new Set(['fact', 'convert', 'both', 'all']);
const DIRS = new Set(['large-to-small', 'small-to-large', 'mixed']);
const QTYS = new Set(['1', 'easy', 'mixed']);
const SIGNS = new Set(['positive', 'both']);
const TIMES = new Set(['y', 'n']);
const INPUTS = new Set(['answer', 'multichoice']);

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

export const DEFAULT_SETTINGS = Object.freeze({
  sys: 'metric',
  pairs: [...PAIR_IDS_BY_SYSTEM.metric],
  mode: 'both',
  dir: 'mixed',
  qty: 'easy',
  sign: 'both',
  time: 'y',
  input: 'multichoice',
});

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
 * Invalid values fall back to defaults.
 */
export function parseSettingsFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);

  const sysRaw = params.get('sys');
  const sys = SYSTEMS.has(sysRaw) ? sysRaw : DEFAULT_SETTINGS.sys;

  const modeRaw = params.get('mode');
  const dirRaw = params.get('dir');
  const qtyRaw = params.get('qty');
  const signRaw = params.get('sign');
  const timeRaw = params.get('time');
  const inputRaw = params.get('input');

  const parsedPairs = parsePairsParam(params.get('pairs'), sys);

  return {
    sys,
    pairs: parsedPairs ?? pairsForSystem(sys),
    mode: MODES.has(modeRaw) ? modeRaw : DEFAULT_SETTINGS.mode,
    dir: DIRS.has(dirRaw) ? dirRaw : DEFAULT_SETTINGS.dir,
    qty: QTYS.has(qtyRaw) ? qtyRaw : DEFAULT_SETTINGS.qty,
    sign: SIGNS.has(signRaw) ? signRaw : DEFAULT_SETTINGS.sign,
    time: TIMES.has(timeRaw) ? timeRaw : DEFAULT_SETTINGS.time,
    input: INPUTS.has(inputRaw) ? inputRaw : DEFAULT_SETTINGS.input,
  };
}

/**
 * Serialize settings to a query string (without leading ?).
 */
export function settingsToQuery(settings) {
  const params = new URLSearchParams();
  params.set('sys', settings.sys);
  params.set('pairs', settings.pairs.join(','));
  params.set('mode', settings.mode);
  params.set('dir', settings.dir);
  params.set('qty', settings.qty);
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
  const sys = String(data.get('sys') ?? '');
  const mode = String(data.get('mode') ?? '');
  const dir = String(data.get('dir') ?? '');
  const qty = String(data.get('qty') ?? '');
  const sign = String(data.get('sign') ?? '');
  const time = String(data.get('time') ?? '');
  const input = String(data.get('input') ?? '');

  if (!SYSTEMS.has(sys)) {
    return { settings: null, error: 'Choose a valid unit system.' };
  }

  if (!MODES.has(mode) || !DIRS.has(dir) || !QTYS.has(qty)) {
    return { settings: null, error: 'Choose valid mode, direction, and quantity settings.' };
  }

  if (!SIGNS.has(sign) || !TIMES.has(time) || !INPUTS.has(input)) {
    return { settings: null, error: 'Please fill in all settings.' };
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
    settings: { sys, pairs, mode, dir, qty, sign, time, input },
    error: null,
  };
}

/**
 * Populate the settings modal form from a settings object.
 */
export function applySettingsToForm(form, settings) {
  const sysInput = form.querySelector(`input[name="sys"][value="${settings.sys}"]`);
  if (sysInput) sysInput.checked = true;

  const modeInput = form.querySelector(`input[name="mode"][value="${settings.mode}"]`);
  if (modeInput) modeInput.checked = true;

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
