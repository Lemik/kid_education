const OPS = new Set(['+', '-', '*', '/']);
const LEVELS = new Set(['1', '2']);
const TIMES = new Set(['y', 'n']);

export const DEFAULT_SETTINGS = Object.freeze({
  levels: 1,
  op: ['+'],
  time: 'y',
});

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
 * Invalid values fall back to defaults.
 */
export function parseSettingsFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);
  const levelsRaw = params.get('levels');
  const timeRaw = params.get('time');

  return {
    levels: LEVELS.has(levelsRaw) ? Number(levelsRaw) : DEFAULT_SETTINGS.levels,
    op: parseOps(params.get('op')),
    time: TIMES.has(timeRaw) ? timeRaw : DEFAULT_SETTINGS.time,
  };
}

/**
 * Serialize settings to a query string (without leading ?).
 * Ops are encoded with encodeURIComponent so "+" is %2B (not a space).
 */
export function settingsToQuery(settings) {
  const params = new URLSearchParams();
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
  const levels = String(data.get('levels') ?? '');
  const op = data.getAll('op').map(String).filter((value) => OPS.has(value));
  const time = String(data.get('time') ?? '');

  if (op.length === 0) {
    return { settings: null, error: 'Select at least one action (+, −, ×, or ÷).' };
  }

  if (!LEVELS.has(levels) || !TIMES.has(time)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  return { settings: { levels: Number(levels), op, time }, error: null };
}

/**
 * Populate the settings modal form from a settings object.
 */
export function applySettingsToForm(form, settings) {
  const levelsInput = form.querySelector(`input[name="levels"][value="${settings.levels}"]`);
  if (levelsInput) levelsInput.checked = true;

  for (const checkbox of form.querySelectorAll('input[name="op"]')) {
    checkbox.checked = settings.op.includes(checkbox.value);
  }

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;
}
