import { getGameProgress, markLevelDone, setGameProgress } from './profile.js';

const GAME = 'llama';

export function getSavedLevel() {
  return getGameProgress(GAME).level;
}

export function setSavedLevel(level) {
  setGameProgress(GAME, { level });
}

/** Boards solved at the current level. */
export function getLevelSolved() {
  return getGameProgress(GAME).streak;
}

export function setLevelSolved(count) {
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
