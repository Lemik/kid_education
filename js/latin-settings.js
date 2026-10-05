const TYPES = new Set(['pic', 'num', 'word']);
const SIZES = new Set([3, 4, 5, 6]);
const DIFFS = new Set(['easy', 'medium', 'hard']);
const TIMES = new Set(['y', 'n']);

export const DEFAULT_SETTINGS = Object.freeze({
  type: 'pic',
  size: 4,
  diff: 'easy',
  time: 'y',
});

/**
 * Parse settings from the current URL query string.
 * Invalid values fall back to defaults.
 */
export function parseSettingsFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);
  const type = params.get('type');
  const size = Number(params.get('size'));
  const diff = params.get('diff');
  const time = params.get('time');

  return {
    type: TYPES.has(type) ? type : DEFAULT_SETTINGS.type,
    size: SIZES.has(size) ? size : DEFAULT_SETTINGS.size,
    diff: DIFFS.has(diff) ? diff : DEFAULT_SETTINGS.diff,
    time: TIMES.has(time) ? time : DEFAULT_SETTINGS.time,
  };
}

/**
 * Serialize settings to a query string (without leading ?).
 */
export function settingsToQuery(settings) {
  const params = new URLSearchParams();
  params.set('type', settings.type);
  params.set('size', String(settings.size));
  params.set('diff', settings.diff);
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
  const type = String(data.get('type') ?? '');
  const size = Number(data.get('size'));
  const diff = String(data.get('diff') ?? '');
  const time = String(data.get('time') ?? '');

  if (!TYPES.has(type) || !SIZES.has(size) || !DIFFS.has(diff) || !TIMES.has(time)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  return { settings: { type, size, diff, time }, error: null };
}

/**
 * Populate the settings modal form from a settings object.
 */
export function applySettingsToForm(form, settings) {
  const typeInput = form.querySelector(`input[name="type"][value="${settings.type}"]`);
  if (typeInput) typeInput.checked = true;

  form.size.value = String(settings.size);

  const diffInput = form.querySelector(`input[name="diff"][value="${settings.diff}"]`);
  if (diffInput) diffInput.checked = true;

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;
}

/** Short name of what is being placed: picture, number, or word. */
export function thingName(settings) {
  if (settings.type === 'num') return 'number';
  if (settings.type === 'word') return 'word';
  return 'picture';
}

/** Help text for the current settings. */
export function promptText(settings) {
  const thing = thingName(settings);
  return `Fill the grid so each ${thing} appears exactly once in every row and every column. `
    + `Tap a ${thing} below the grid, then tap an empty square to place it. `
    + `Tap a ${thing} you placed to remove it. Press Check for a hint.`;
}
