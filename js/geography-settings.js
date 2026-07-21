const TOPICS = new Set([
  'capital',
  'capital-reverse',
  'abbrev',
  'abbrev-reverse',
  'facts',
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

export const DEFAULT_SETTINGS = Object.freeze({
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

/**
 * Parse settings from the current URL query string.
 * Invalid values fall back to defaults.
 */
export function parseSettingsFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);

  const topicRaw = params.get('topic');
  const subsetRaw = params.get('subset');
  const signRaw = params.get('sign');
  const timeRaw = params.get('time');
  const inputRaw = params.get('input');

  return {
    topic: TOPICS.has(topicRaw) ? topicRaw : DEFAULT_SETTINGS.topic,
    subset: SUBSETS.has(subsetRaw) ? subsetRaw : DEFAULT_SETTINGS.subset,
    items: parseItemsParam(params.get('items')),
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
  params.set('topic', settings.topic);
  params.set('subset', settings.subset);
  if (Array.isArray(settings.items) && settings.items.length > 0) {
    params.set('items', settings.items.join(','));
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
  const topic = String(data.get('topic') ?? '');
  const subset = String(data.get('subset') ?? '');
  const sign = String(data.get('sign') ?? '');
  const time = String(data.get('time') ?? '');
  const input = String(data.get('input') ?? '');

  if (!TOPICS.has(topic)) {
    return { settings: null, error: 'Choose a valid topic.' };
  }

  if (!SUBSETS.has(subset)) {
    return { settings: null, error: 'Choose a valid subset.' };
  }

  if (!SIGNS.has(sign) || !TIMES.has(time) || !INPUTS.has(input)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  return {
    settings: {
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
 */
export function applySettingsToForm(form, settings) {
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
