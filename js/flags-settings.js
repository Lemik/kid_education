import { FLAGS_LEVELS } from './flags-levels.js';
import { presetLevelSettings } from './level-progress.js';
import { withProfileSelections } from './profile.js';

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
const DIFFICULTY_PARAMS = ['mode', 'region', 'pairs'];

export const DEFAULT_SETTINGS = withProfileSelections({
  play: 'custom',
  mode: 'flag',
  region: 'popular',
  pairs: 5,
  time: 'y',
});

/** `play` is the level/custom switch; `mode` is the question type. */
export function isLevelMode(settings) {
  return settings?.play === 'level';
}

function parsePairs(raw) {
  return PAIRS.has(String(raw)) ? Number(raw) : DEFAULT_SETTINGS.pairs;
}

/** Choices that apply in both modes (pairs is kept so custom mode remembers it). */
function displayPrefs(raw) {
  return {
    pairs: parsePairs(raw.pairs),
    time: TIMES.has(raw.time) ? raw.time : DEFAULT_SETTINGS.time,
  };
}

export function buildLevelSettings(level, display = DEFAULT_SETTINGS) {
  const built = presetLevelSettings(FLAGS_LEVELS, level, displayPrefs(display));
  return { ...built, mode: FLAGS_LEVELS[built.level - 1].preset.mode, play: 'level' };
}

/**
 * Parse settings from the current URL query string.
 * Custom mode when mode/region/pairs are set without `level`; otherwise level
 * mode at `level` (or `savedLevel`). Invalid values fall back to defaults.
 */
export function parseSettingsFromUrl(search = window.location.search, savedLevel = 1) {
  const params = new URLSearchParams(search);
  const display = {
    pairs: params.get('pairs'),
    time: params.get('time'),
  };

  if (params.has('level') || !DIFFICULTY_PARAMS.some((key) => params.has(key))) {
    return buildLevelSettings(params.get('level') ?? savedLevel, display);
  }

  const modeRaw = params.get('mode');
  const regionRaw = params.get('region');

  return {
    play: 'custom',
    mode: MODES.has(modeRaw) ? modeRaw : DEFAULT_SETTINGS.mode,
    region: REGION_SET.has(regionRaw) ? regionRaw : DEFAULT_SETTINGS.region,
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
    params.set('mode', settings.mode);
    params.set('region', settings.region);
    params.set('pairs', String(settings.pairs));
  }
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
  const play = String(data.get('play') ?? '');
  const mode = String(data.get('mode') ?? '');
  const region = String(data.get('region') ?? '');
  const pairs = String(data.get('pairs') ?? '');
  const time = String(data.get('time') ?? '');

  if (!TIMES.has(time)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  if (play === 'level') {
    return { settings: buildLevelSettings(data.get('level'), { pairs, time }), error: null };
  }

  if (!MODES.has(mode)) {
    return { settings: null, error: 'Choose a game mode.' };
  }

  if (!REGION_SET.has(region)) {
    return { settings: null, error: 'Choose a valid region.' };
  }

  if (!PAIRS.has(pairs)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  return {
    settings: { play: 'custom', mode, region, pairs: Number(pairs), time },
    error: null,
  };
}

/**
 * Populate the settings modal form from a settings object.
 * `savedLevel` preselects the level dropdown in custom mode.
 */
export function applySettingsToForm(form, settings, savedLevel = 1) {
  const playInput = form.querySelector(`input[name="play"][value="${settings.play}"]`);
  if (playInput) playInput.checked = true;

  form.level.value = String(settings.level ?? savedLevel);

  const modeInput = form.querySelector(`input[name="mode"][value="${settings.mode}"]`);
  if (modeInput) modeInput.checked = true;

  if (form.region) form.region.value = settings.region;
  if (form.pairs) form.pairs.value = String(settings.pairs);

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;
}
