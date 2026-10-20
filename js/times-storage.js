import { getGameProgress, markLevelDone, setGameProgress } from './profile.js';

const SCORE_KEY = 'kidTimes.score';
const WRONG_KEY = 'kidTimes.wrong';
const STARTED_AT_KEY = 'kidTimes.startedAt';
const GAME = 'times';

function readNumber(key, fallback = 0, store = sessionStorage) {
  const raw = store.getItem(key);
  if (raw == null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function getScore() {
  return Math.max(0, Math.floor(readNumber(SCORE_KEY, 0)));
}

export function incrementScore() {
  const next = getScore() + 1;
  sessionStorage.setItem(SCORE_KEY, String(next));
  return next;
}

export function getWrong() {
  return Math.max(0, Math.floor(readNumber(WRONG_KEY, 0)));
}

export function incrementWrong() {
  const next = getWrong() + 1;
  sessionStorage.setItem(WRONG_KEY, String(next));
  return next;
}

/**
 * Return the session start timestamp (ms). Creates one if missing.
 */
export function getOrCreateStartedAt() {
  const existing = readNumber(STARTED_AT_KEY, NaN);
  if (Number.isFinite(existing) && existing > 0) {
    return existing;
  }
  const now = Date.now();
  sessionStorage.setItem(STARTED_AT_KEY, String(now));
  return now;
}

export function getSavedLevel() {
  return getGameProgress(GAME).level;
}

export function setSavedLevel(level) {
  setGameProgress(GAME, { level });
}

/** Correct answers in a row at the current level. */
export function getLevelStreak() {
  return getGameProgress(GAME).streak;
}

export function setLevelStreak(count) {
  setGameProgress(GAME, { streak: count });
}

export function setLevelMastered(done) {
  setGameProgress(GAME, { mastered: done });
}

export function getCompletedLevels() {
  return getGameProgress(GAME).completed;
}

export function markLevelDoneHere(level) {
  markLevelDone(GAME, level);
}

/**
 * Full session reset when settings change via Go.
 */
export function resetSession() {
  sessionStorage.setItem(SCORE_KEY, '0');
  sessionStorage.setItem(WRONG_KEY, '0');
  sessionStorage.setItem(STARTED_AT_KEY, String(Date.now()));
}
