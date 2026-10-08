const MODES = new Set(['flag', 'name', 'match', 'mixed']);

export const REGIONS = Object.freeze([
  'popular',
  'world',
  'europe',
  'asia',
  'africa',
  'americas',
  'oceania',
]);

const REGION_SET = new Set(REGIONS);
const PAIRS = new Set(['4', '5', '6', '8']);
const TIMES = new Set(['y', 'n']);

export const DEFAULT_SETTINGS = Object.freeze({
  mode: 'flag',
  region: 'popular',
  pairs: 5,
  time: 'y',
});

/**
 * Parse settings from the current URL query string.
 * Invalid values fall back to defaults.
 */
export function parseSettingsFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);

  const modeRaw = params.get('mode');
  const regionRaw = params.get('region');
  const pairsRaw = params.get('pairs');
  const timeRaw = params.get('time');

  return {
    mode: MODES.has(modeRaw) ? modeRaw : DEFAULT_SETTINGS.mode,
    region: REGION_SET.has(regionRaw) ? regionRaw : DEFAULT_SETTINGS.region,
    pairs: PAIRS.has(pairsRaw) ? Number(pairsRaw) : DEFAULT_SETTINGS.pairs,
    time: TIMES.has(timeRaw) ? timeRaw : DEFAULT_SETTINGS.time,
  };
}

/**
 * Serialize settings to a query string (without leading ?).
 */
export function settingsToQuery(settings) {
  const params = new URLSearchParams();
  params.set('mode', settings.mode);
  params.set('region', settings.region);
  params.set('pairs', String(settings.pairs));
  params.set('time', settings.time);
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
  const region = String(data.get('region') ?? '');
  const pairs = String(data.get('pairs') ?? '');
  const time = String(data.get('time') ?? '');

  if (!MODES.has(mode)) {
    return { settings: null, error: 'Choose a game mode.' };
  }

  if (!REGION_SET.has(region)) {
    return { settings: null, error: 'Choose a valid region.' };
  }

  if (!PAIRS.has(pairs) || !TIMES.has(time)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  return {
    settings: { mode, region, pairs: Number(pairs), time },
    error: null,
  };
}

/**
 * Populate the settings modal form from a settings object.
 */
export function applySettingsToForm(form, settings) {
  const modeInput = form.querySelector(`input[name="mode"][value="${settings.mode}"]`);
  if (modeInput) modeInput.checked = true;

  if (form.region) form.region.value = settings.region;
  if (form.pairs) form.pairs.value = String(settings.pairs);

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;
}
