import { maxPairs } from './match-generator.js';
import { MATCH_LEVELS } from './match-levels.js';
import { presetLevelSettings } from './level-progress.js';
import { withProfileSelections } from './profile.js';

const TIMES = new Set(['y', 'n']);
const MIXES = new Set(['y', 'n']);
const LIMITS = new Set([15, 30, 60, 120, 180, 300, 600]);

export const DEFAULT_SETTINGS = withProfileSelections({
  mode: 'custom',
  cards: 12,
  pictures: true,
  numbers: false,
  words: false,
  mix: 'n',
  time: 'y',
  limit: 120,
});

function parseCards(raw) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 6 || value > 100 || value % 2 !== 0) {
    return DEFAULT_SETTINGS.cards;
  }
  return value;
}

function parseKinds(raw) {
  if (raw == null || raw === '') {
    return {
      pictures: DEFAULT_SETTINGS.pictures,
      numbers: DEFAULT_SETTINGS.numbers,
      words: DEFAULT_SETTINGS.words,
    };
  }

  const parts = new Set(raw.split(',').map((part) => part.trim()).filter(Boolean));
  const pictures = parts.has('pic');
  const numbers = parts.has('num');
  const words = parts.has('word');

  if (!pictures && !numbers && !words) {
    return {
      pictures: DEFAULT_SETTINGS.pictures,
      numbers: DEFAULT_SETTINGS.numbers,
      words: DEFAULT_SETTINGS.words,
    };
  }

  return { pictures, numbers, words };
}

function parseLimit(raw) {
  const value = Number(raw);
  return LIMITS.has(value) ? value : DEFAULT_SETTINGS.limit;
}

export function isLevelMode(settings) {
  return settings?.mode === 'level';
}

/** Choices that apply in both modes. */
function displayPrefs(raw) {
  return {
    time: TIMES.has(raw.time) ? raw.time : DEFAULT_SETTINGS.time,
    limit: parseLimit(raw.limit),
  };
}

export function buildLevelSettings(level, display = DEFAULT_SETTINGS) {
  return presetLevelSettings(MATCH_LEVELS, level, displayPrefs(display));
}

/**
 * Parse settings from the current URL query string.
 * Custom mode when any of `cards`, `kind`, or `mix` is set without `level`;
 * otherwise level mode at `level` (or `savedLevel`). Invalid values fall back to defaults.
 */
export function parseSettingsFromUrl(search = window.location.search, savedLevel = 1) {
  const params = new URLSearchParams(search);
  const display = { time: params.get('time'), limit: params.get('limit') };
  const hasCustom = ['cards', 'kind', 'mix'].some((key) => params.has(key));

  if (params.has('level') || !hasCustom) {
    return buildLevelSettings(params.get('level') ?? savedLevel, display);
  }

  const kinds = parseKinds(params.get('kind'));
  const mix = params.get('mix');

  const settings = {
    mode: 'custom',
    cards: parseCards(params.get('cards')),
    pictures: kinds.pictures,
    numbers: kinds.numbers,
    words: kinds.words,
    mix: MIXES.has(mix) ? mix : DEFAULT_SETTINGS.mix,
    ...displayPrefs(display),
  };

  if (maxPairs(settings) * 2 < settings.cards) {
    return { ...DEFAULT_SETTINGS, ...displayPrefs(display) };
  }

  return settings;
}

function kindsQuery(settings) {
  const kinds = [];
  if (settings.pictures) kinds.push('pic');
  if (settings.numbers) kinds.push('num');
  if (settings.words) kinds.push('word');
  return kinds.join(',');
}

/**
 * Serialize settings to a query string (without leading ?).
 */
export function settingsToQuery(settings) {
  const params = new URLSearchParams();
  if (isLevelMode(settings)) {
    params.set('level', String(settings.level));
  } else {
    params.set('cards', String(settings.cards));
    params.set('kind', kindsQuery(settings));
    params.set('mix', settings.mix);
  }
  params.set('time', settings.time);
  params.set('limit', String(settings.limit));
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

function validatePairPool(settings) {
  if (settings.mix === 'y') {
    const selected = [settings.pictures, settings.numbers, settings.words].filter(Boolean).length;
    if (selected < 2) {
      return 'Mix needs at least two of pictures, numbers, and words.';
    }
  }

  const available = maxPairs(settings) * 2;
  if (settings.cards > available) {
    return `These choices can make ${available} cards. Lower the number, or change pictures, numbers, words, or mix.`;
  }

  return null;
}

/**
 * Read settings from the settings modal form.
 * Returns { settings, error } — error is a string if validation fails.
 */
export function readSettingsFromForm(form) {
  const data = new FormData(form);
  const mode = String(data.get('mode') ?? '');
  const cards = Number(data.get('cards'));
  const kinds = data.getAll('kind').map(String);
  const mix = String(data.get('mix') ?? '');
  const time = String(data.get('time') ?? '');
  const limit = Number(data.get('limit'));

  if (!TIMES.has(time) || !LIMITS.has(limit)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  if (mode === 'level') {
    return { settings: buildLevelSettings(data.get('level'), { time, limit }), error: null };
  }

  if (!Number.isInteger(cards) || cards < 6 || cards > 100 || cards % 2 !== 0) {
    return { settings: null, error: 'Choose an even number of cards from 6 to 100.' };
  }

  const pictures = kinds.includes('pic');
  const numbers = kinds.includes('num');
  const words = kinds.includes('word');

  if (!pictures && !numbers && !words) {
    return { settings: null, error: 'Pick at least one of pictures, numbers, or words.' };
  }

  if (!MIXES.has(mix)) {
    return { settings: null, error: 'Please fill in all settings.' };
  }

  const settings = { mode: 'custom', cards, pictures, numbers, words, mix, time, limit };
  const error = validatePairPool(settings);
  if (error) {
    return { settings: null, error };
  }

  return { settings, error: null };
}

/**
 * Populate the settings modal form from a settings object.
 * `savedLevel` preselects the level dropdown in custom mode.
 */
export function applySettingsToForm(form, settings, savedLevel = 1) {
  const modeInput = form.querySelector(`input[name="mode"][value="${settings.mode}"]`);
  if (modeInput) modeInput.checked = true;

  form.level.value = String(settings.level ?? savedLevel);
  form.cards.value = String(settings.cards);

  const pictureInput = form.querySelector('input[name="kind"][value="pic"]');
  const numberInput = form.querySelector('input[name="kind"][value="num"]');
  const wordInput = form.querySelector('input[name="kind"][value="word"]');
  if (pictureInput) pictureInput.checked = settings.pictures;
  if (numberInput) numberInput.checked = settings.numbers;
  if (wordInput) wordInput.checked = settings.words;

  const mixInput = form.querySelector(`input[name="mix"][value="${settings.mix}"]`);
  if (mixInput) mixInput.checked = true;

  const timeInput = form.querySelector(`input[name="time"][value="${settings.time}"]`);
  if (timeInput) timeInput.checked = true;

  form.limit.value = String(settings.limit);
}

export function mixHintText(settings) {
  if (settings.mix !== 'y') {
    return 'Two cards match when they show the same picture, number, or word.';
  }

  const bits = [];
  if (settings.pictures && settings.words) {
    bits.push('a picture matches its word, like cat or the color red');
  }
  if (settings.numbers && settings.words) {
    bits.push('a number matches its word, like 7 and seven');
  }
  if (settings.pictures && settings.numbers && !settings.words) {
    bits.push('a group of dots matches its number, like three dots and 3');
  }

  if (bits.length === 0) {
    return 'Mix needs at least two of pictures, numbers, and words.';
  }

  const sentence = bits.join(', and ');
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}

export function promptText(settings) {
  const rule = 'If they do not match, the first card closes and you pick one more.';
  if (settings.mix !== 'y') {
    return `Flip a card, then another. Matching pictures, numbers, or words stay open. ${rule}`;
  }
  if (settings.pictures && settings.numbers && !settings.words) {
    return `Flip a card, then another. A group of dots matches its number. ${rule}`;
  }
  if (settings.pictures && settings.words && settings.numbers) {
    return `Flip a card, then another. A picture matches its word, and a number matches its word. ${rule}`;
  }
  if (settings.numbers && settings.words) {
    return `Flip a card, then another. A number matches its word. ${rule}`;
  }
  return `Flip a card, then another. A picture matches its word. ${rule}`;
}
