import { GEOGRAPHY_LEVELS } from './geography-levels.js';
import { presetLevelSettings } from './level-progress.js';
import { withProfileSelections } from './profile.js';

const TOPICS = new Set([
  'capital',
  'capital-reverse',
  'abbrev',
  'abbrev-reverse',
  'city',
  'facts',
  'peoples',
  'mixed',
]);

const SUBSETS = new Set([
  'all',
  'provinces',
  'territories',
  'west',
  'atlantic',
  'easy6',
]);

export const ALL_ITEM_IDS = Object.freeze([
  'bc', 'ab', 'sk', 'mb', 'on', 'qc', 'nb', 'ns', 'pe', 'nl', 'yt', 'nt', 'nu',
]);

const ALL_ITEM_ID_SET = new Set(ALL_ITEM_IDS);

/** Preset subset → item ids. */
export const SUBSET_IDS = Object.freeze({
  all: [...ALL_ITEM_IDS],
  provinces: Object.freeze(['bc', 'ab', 'sk', 'mb', 'on', 'qc', 'nb', 'ns', 'pe', 'nl']),
  territories: Object.freeze(['yt', 'nt', 'nu']),
  west: Object.freeze(['bc', 'ab', 'sk', 'mb', 'yt', 'nt']),
  atlantic: Object.freeze(['nb', 'ns', 'pe', 'nl']),
  easy6: Object.freeze(['on', 'bc', 'ab', 'qc', 'ns', 'mb']),
});

const SIGNS = new Set(['positive', 'both']);
const TIMES = new Set(['y', 'n']);
const INPUTS = new Set(['answer', 'multichoice']);

const DIFFICULTY_PARAMS = ['topic', 'subset', 'items'];

export const DEFAULT_SETTINGS = withProfileSelections({
  mode: 'custom',
  topic: 'mixed',
  subset: 'all',
  items: null,
  sign: 'both',
  time: 'y',
  input: 'multichoice',
});

/**
 * Parse optional items=on,bc,ab override. Returns null if missing/invalid.
 */
function parseItemsParam(raw) {
  if (raw == null || String(raw).trim() === '') return null;

  const ids = String(raw)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((id) => id && ALL_ITEM_ID_SET.has(id));

  const unique = [...new Set(ids)];
  return unique.length > 0 ? unique : null;
}

/**
 * Resolve the effective item id list from settings.
 */
export function resolveItemIds(settings) {
  if (Array.isArray(settings.items) && settings.items.length > 0) {
    return settings.items;
  }
  return [...(SUBSET_IDS[settings.subset] ?? SUBSET_IDS.all)];
}

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
  return presetLevelSettings(GEOGRAPHY_LEVELS, level, displayPrefs(display));
}

/**
 * Parse settings from the current URL query string.
 * Custom mode when topic/subset/items are set without `level`; otherwise level
 * mode at `level` (or `savedLevel`). Invalid values fall back to defaults.
 */
export function parseSettingsFromUrl(search = window.location.search, savedLevel = 1) {
  const params = new URLSearchParams(search);

  const topicRaw = params.get('topic');
  const subsetRaw = params.get('subset');
  const display = {
    sign: params.get('sign'),
    time: params.get('time'),
    input: params.get('input'),
  };

  if (params.has('level') || !DIFFICULTY_PARAMS.some((key) => params.has(key))) {
    return buildLevelSettings(params.get('level') ?? savedLevel, display);
  }

  return {
    mode: 'custom',
    topic: TOPICS.has(topicRaw) ? topicRaw : DEFAULT_SETTINGS.topic,
    subset: SUBSETS.has(subsetRaw) ? subsetRaw : DEFAULT_SETTINGS.subset,
    items: parseItemsParam(params.get('items')),
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
    params.set('topic', settings.topic);
    params.set('subset', settings.subset);
    if (Array.isArray(settings.items) && settings.items.length > 0) {
      params.set('items', settings.items.join(','));
    }
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
  const topic = String(data.get('topic') ?? '');
  const subset = String(data.get('subset') ?? '');
  const sign = String(data.get('sign') ?? '');
  const time = String(data.get('time') ?? '');
  const input = String(data.get('input') ?? '');

  if (!SIGNS.has(sign) || !TIMES.has(time) || !INPUTS.has(input)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  if (mode === 'level') {
    return { settings: buildLevelSettings(data.get('level'), { sign, time, input }), error: null };
  }

  if (!TOPICS.has(topic)) {
    return { settings: null, error: 'Choose a valid topic.' };
  }

  if (!SUBSETS.has(subset)) {
    return { settings: null, error: 'Choose a valid subset.' };
  }

  return {
    settings: {
      mode: 'custom',
      topic,
      subset,
      items: null,
      sign,
      time,
      input,
    },
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

  const topicInput = form.querySelector(`input[name="topic"][value="${settings.topic}"]`);
  if (topicInput) topicInput.checked = true;

  if (form.subset) {
    form.subset.value = settings.subset;
  }

  const signInput = form.querySelector(`input[name="sign"][value="${settings.sign}"]`);
  if (signInput) signInput.checked = true;

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;

  const inputMode = form.querySelector(`input[name="input"][value="${settings.input}"]`);
  if (inputMode) inputMode.checked = true;
}
