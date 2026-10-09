// Level progress persists across visits (localStorage).
const LEVEL_KEY = 'kidLlama.level';
const LEVEL_SOLVED_KEY = 'kidLlama.levelSolved';

function readNumber(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function getSavedLevel() {
  return Math.max(1, Math.floor(readNumber(LEVEL_KEY, 1)));
}

export function setSavedLevel(level) {
  localStorage.setItem(LEVEL_KEY, String(Math.max(1, Math.floor(level))));
}

/** Boards solved at the current level. */
export function getLevelSolved() {
  return Math.max(0, Math.floor(readNumber(LEVEL_SOLVED_KEY, 0)));
}

export function setLevelSolved(count) {
  localStorage.setItem(LEVEL_SOLVED_KEY, String(Math.max(0, Math.floor(count))));
}
