const MINUTES_BY_DIFF = {
  oclock: [0],
  half: [0, 30],
  quarter: [0, 15, 30, 45],
  five: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
  any: null, // 0–59
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(array) {
  return array[randomInt(0, array.length - 1)];
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Allowed minutes for a difficulty setting.
 */
export function allowedMinutes(diff) {
  const preset = MINUTES_BY_DIFF[diff];
  if (Array.isArray(preset)) return [...preset];
  const minutes = [];
  for (let m = 0; m <= 59; m += 1) minutes.push(m);
  return minutes;
}

/**
 * Format a time for display / answers.
 * 12h: "3:30" (hours stored as 1–12)
 * 24h: "15:30" (hours stored as 0–23)
 */
export function formatTime(hours, minutes, format) {
  const mm = String(minutes).padStart(2, '0');
  if (format === '24') {
    return `${String(hours).padStart(2, '0')}:${mm}`;
  }
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${mm}`;
}

/**
 * Digital display text (same as answer format; no AM/PM in 12h mode).
 */
export function formatTimeDisplay(hours, minutes, format) {
  return formatTime(hours, minutes, format);
}

/**
 * Pick a random hour for the given format.
 * 12h → 1–12; 24h → 0–23.
 */
function randomHours(format) {
  if (format === '24') {
    return randomInt(0, 23);
  }
  return randomInt(1, 12);
}

function wrapHours(hours, format, delta) {
  if (format === '24') {
    return (hours + delta + 24) % 24;
  }
  // 1–12 wrap: map to 0–11, shift, map back to 1–12
  const zeroBased = hours % 12;
  const next = (zeroBased + delta + 12) % 12;
  return next === 0 ? 12 : next;
}

/**
 * Generate a random valid time for the settings.
 */
export function randomTime(settings) {
  const minutesPool = allowedMinutes(settings.diff);
  const hours = randomHours(settings.format);
  const minutes = pick(minutesPool);
  return { hours, minutes };
}

/**
 * Generate 4 multiple-choice options (strings) including the correct answer.
 */
export function generateChoices(hours, minutes, settings) {
  const correct = formatTime(hours, minutes, settings.format);
  const choices = new Set([correct]);
  const minutesPool = allowedMinutes(settings.diff);

  const candidates = [];

  // Hour ±1
  for (const delta of [-1, 1, -2, 2]) {
    candidates.push({
      hours: wrapHours(hours, settings.format, delta),
      minutes,
    });
  }

  // Other minutes on same hour
  for (const m of minutesPool) {
    if (m !== minutes) {
      candidates.push({ hours, minutes: m });
    }
  }

  // Combined shifts
  for (const delta of [-1, 1]) {
    for (const m of shuffle(minutesPool).slice(0, 4)) {
      if (m === minutes) continue;
      candidates.push({
        hours: wrapHours(hours, settings.format, delta),
        minutes: m,
      });
    }
  }

  for (const candidate of shuffle(candidates)) {
    if (choices.size >= 4) break;
    choices.add(formatTime(candidate.hours, candidate.minutes, settings.format));
  }

  // Pad with random valid times if needed
  let guard = 0;
  while (choices.size < 4 && guard < 50) {
    guard += 1;
    const t = randomTime(settings);
    choices.add(formatTime(t.hours, t.minutes, settings.format));
  }

  return shuffle([...choices]);
}

/**
 * Normalize a typed answer to a comparable form, or null if invalid.
 * Accepts "3:30", "03:30", "3:30 PM", "15:30", etc.
 * AM/PM is ignored in 12h mode (answers are face times 1–12).
 */
export function normalizeTypedAnswer(raw, format) {
  const trimmed = String(raw).trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3] ? match[3].toLowerCase() : null;

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (minutes < 0 || minutes > 59) return null;

  if (format === '24') {
    if (period) {
      if (hours < 1 || hours > 12) return null;
      if (period === 'am') {
        hours = hours === 12 ? 0 : hours;
      } else {
        hours = hours === 12 ? 12 : hours + 12;
      }
    } else if (hours < 0 || hours > 23) {
      return null;
    }
    return formatTime(hours, minutes, '24');
  }

  // 12h mode: strip period and compare face hour (1–12).
  if (hours === 0) hours = 12;
  if (hours > 12 && hours <= 23) {
    hours = hours % 12 === 0 ? 12 : hours % 12;
  }
  if (hours < 1 || hours > 12) return null;
  return formatTime(hours, minutes, '12');
}

/**
 * Generate a "What time is it?" question.
 */
export function generateQuestion(settings) {
  const { hours, minutes } = randomTime(settings);

  let face = settings.face;
  if (face === 'both') {
    face = Math.random() < 0.5 ? 'analog' : 'digital';
  }

  const answerText = formatTime(hours, minutes, settings.format);

  return {
    hours,
    minutes,
    face,
    answerText,
    displayText: formatTimeDisplay(hours, minutes, settings.format),
  };
}
