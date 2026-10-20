/**
 * One profile for this browser: coins, shared choices, and level progress.
 * Stored in localStorage so it lasts across visits and games.
 *
 * Choices:
 * - time: 'y' | 'n'           show the timer
 * - sign: 'positive' | 'both' show correct answers only, or correct and wrong
 * - input: 'answer' | 'multichoice'
 * - showCoins: 'y' | 'n'      show the coin purse
 * - name: string            used in encouragement when it is not empty
 *
 * Each game stores the level last played, the streak toward finishing it,
 * and the list of finished levels. Any level can be played. A finished
 * level stays finished.
 */

const PROFILE_KEY = 'kid.profile';
const NAME_LIMIT = 20;

const ALLOWED = Object.freeze({
  time: ['y', 'n'],
  sign: ['positive', 'both'],
  input: ['answer', 'multichoice'],
  showCoins: ['y', 'n'],
});

/** Earlier per-game keys, copied in once when the profile is first created. */
const LEGACY_GAMES = Object.freeze({
  math: ['kidMath.level', 'kidMath.levelStreak'],
  times: ['kidTimes.level', 'kidTimes.levelStreak'],
  latin: ['kidLatin.level', 'kidLatin.levelSolved'],
  llama: ['kidLlama.level', 'kidLlama.levelSolved'],
  subset: ['kid.subset.level', 'kid.subset.levelStreak'],
  measure: ['kid.measure.level', 'kid.measure.levelStreak'],
  patterns: ['kid.patterns.level', 'kid.patterns.levelStreak'],
  words: ['kid.words.level', 'kid.words.levelStreak'],
  unscramble: ['kid.unscramble.level', 'kid.unscramble.levelStreak'],
  sentences: ['kid.sentences.level', 'kid.sentences.levelStreak'],
  clock: ['kid.clock.level', 'kid.clock.levelStreak'],
  money: ['kid.money.level', 'kid.money.levelStreak'],
  geography: ['kid.geography.level', 'kid.geography.levelStreak'],
  flags: ['kid.flags.level', 'kid.flags.levelStreak'],
  match: ['kid.match.level', 'kid.match.levelStreak'],
});

let cache = null;

function cleanName(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_LIMIT);
}

function whole(value, fallback) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function pick(kind, value, fallback) {
  return ALLOWED[kind].includes(value) ? value : fallback;
}

function readLegacyNumber(key) {
  const raw = localStorage.getItem(key);
  if (raw == null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function completedFromLevel(level, mastered) {
  const last = mastered ? level : level - 1;
  const completed = [];
  for (let n = 1; n <= last; n += 1) completed.push(n);
  return completed;
}

function cleanCompleted(list) {
  if (!Array.isArray(list)) return null;
  const seen = new Set();
  const completed = [];
  for (const item of list) {
    const n = Math.floor(Number(item));
    if (!Number.isFinite(n) || n < 1 || seen.has(n)) continue;
    seen.add(n);
    completed.push(n);
  }
  completed.sort((a, b) => a - b);
  return completed;
}

function recordFrom(partial = {}) {
  const level = Math.max(1, whole(partial.level, 1));
  const streak = Math.max(0, whole(partial.streak, 0));
  const mastered = partial.mastered === true;
  const explicit = cleanCompleted(partial.completed);
  const completed = explicit ?? completedFromLevel(level, mastered);
  return { level, streak, mastered, completed };
}

function blankProfile() {
  return {
    coins: 0,
    time: 'y',
    sign: 'both',
    input: 'answer',
    showCoins: 'y',
    name: '',
    games: {},
  };
}

function normalize(raw) {
  const profile = blankProfile();
  if (!raw || typeof raw !== 'object') return profile;
  profile.coins = Math.max(0, whole(raw.coins, 0));
  profile.time = pick('time', raw.time, profile.time);
  profile.sign = pick('sign', raw.sign, profile.sign);
  profile.input = pick('input', raw.input, profile.input);
  profile.showCoins = pick('showCoins', raw.showCoins, profile.showCoins);
  profile.name = cleanName(raw.name);
  const games = raw.games && typeof raw.games === 'object' ? raw.games : {};
  for (const [id, record] of Object.entries(games)) {
    if (!record || typeof record !== 'object') continue;
    profile.games[id] = recordFrom(record);
  }
  return profile;
}

function save(profile) {
  cache = profile;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function migrate() {
  const profile = blankProfile();
  try {
    const sessionCoins = Number(sessionStorage.getItem('kid.coins'));
    if (Number.isFinite(sessionCoins) && sessionCoins > 0) {
      profile.coins = Math.floor(sessionCoins);
    }
    sessionStorage.removeItem('kid.coins');
  } catch {
    // sessionStorage can be unavailable; coins simply start at 0.
  }

  for (const [id, [levelKey, streakKey]] of Object.entries(LEGACY_GAMES)) {
    const level = readLegacyNumber(levelKey);
    const streak = readLegacyNumber(streakKey);
    if (level == null && streak == null) continue;
    profile.games[id] = recordFrom({ level: level ?? 1, streak: streak ?? 0 });
    localStorage.removeItem(levelKey);
    localStorage.removeItem(streakKey);
  }

  save(profile);
  return profile;
}

function load() {
  if (cache) return cache;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (raw == null) return migrate();
  try {
    cache = normalize(JSON.parse(raw));
  } catch {
    cache = blankProfile();
    save(cache);
  }
  return cache;
}

/** A copy of the profile (coins, choices, and per-game progress). */
export function getProfile() {
  const profile = load();
  const games = {};
  for (const [id, record] of Object.entries(profile.games)) {
    games[id] = { ...record, completed: [...record.completed] };
  }
  return {
    coins: profile.coins,
    time: profile.time,
    sign: profile.sign,
    input: profile.input,
    showCoins: profile.showCoins,
    name: profile.name,
    games,
  };
}

export function getCoins() {
  return load().coins;
}

export function setCoins(total) {
  const profile = load();
  profile.coins = Math.max(0, whole(total, 0));
  save(profile);
  return profile.coins;
}

export function getSelections() {
  const profile = load();
  return {
    time: profile.time,
    sign: profile.sign,
    input: profile.input,
    showCoins: profile.showCoins,
  };
}

export function getName() {
  return load().name;
}

export function setName(value) {
  const profile = load();
  profile.name = cleanName(value);
  save(profile);
  return profile.name;
}

/**
 * Add the saved name to an encouragement line.
 * The line is unchanged when the name is empty.
 */
export function cheer(message) {
  const name = load().name;
  if (!name) return message;
  if (message === 'Looking good so far — keep going!') {
    return `Hey ${name}, keep going!`;
  }
  if (message.startsWith('Great job!')) {
    const rest = message.slice('Great job!'.length).trim();
    return rest ? `Good job, ${name}! ${rest}` : `Good job, ${name}!`;
  }
  if (message.startsWith('Correct!')) {
    const rest = message.slice('Correct!'.length).trim();
    return rest ? `Good job, ${name}! ${rest}` : `Good job, ${name}!`;
  }
  if (
    message.startsWith('Level up!')
    || message.startsWith('You mastered')
    || message === 'You found a llama!'
    || message === 'All the llamas are found!'
  ) {
    return `Good job, ${name}! ${message}`;
  }
  return message;
}

/** Whether the coin purse is shown. Coins are still saved when this is off. */
export function coinsAreShown() {
  return load().showCoins === 'y';
}

export function setSelections(patch) {
  const profile = load();
  if (patch.time != null) profile.time = pick('time', patch.time, profile.time);
  if (patch.sign != null) profile.sign = pick('sign', patch.sign, profile.sign);
  if (patch.input != null) profile.input = pick('input', patch.input, profile.input);
  if (patch.showCoins != null) profile.showCoins = pick('showCoins', patch.showCoins, profile.showCoins);
  save(profile);
  return getSelections();
}

/**
 * Use `value` when it is a valid choice; otherwise the choice saved on the profile.
 * `kind` is 'time', 'sign', or 'input'.
 */
export function selection(kind, value) {
  const profile = load();
  return pick(kind, value, profile[kind]);
}

/**
 * Replace time / sign / input defaults with the profile's saved choices.
 * Other fields on `base` stay as written.
 */
export function withProfileSelections(base) {
  const obj = { ...base };
  for (const key of ['time', 'sign', 'input']) {
    if (!Object.prototype.hasOwnProperty.call(base, key)) continue;
    Object.defineProperty(obj, key, {
      enumerable: true,
      get() {
        return selection(key);
      },
    });
  }
  return Object.freeze(obj);
}

/** Open level, streak, and finished levels for one game. */
export function getGameProgress(id) {
  const record = load().games[id];
  if (!record) return recordFrom();
  return { ...record, completed: [...record.completed] };
}

/** Merge `patch` ({ level, streak, mastered, completed }) into one game. */
export function setGameProgress(id, patch) {
  const profile = load();
  const current = profile.games[id] ?? recordFrom();
  profile.games[id] = recordFrom({
    level: patch.level ?? current.level,
    streak: patch.streak ?? current.streak,
    mastered: patch.mastered ?? current.mastered,
    completed: patch.completed ?? current.completed,
  });
  save(profile);
  return getGameProgress(id);
}

/** Remember that `level` of `id` is finished. Repeating it leaves the list as it is. */
export function markLevelDone(id, level) {
  const progress = getGameProgress(id);
  const n = Math.floor(Number(level));
  if (!Number.isFinite(n) || n < 1 || progress.completed.includes(n)) return progress;
  return setGameProgress(id, { completed: [...progress.completed, n] });
}

/** How many levels of `id` are finished. */
export function completedCount(id) {
  return getGameProgress(id).completed.length;
}

/**
 * Save the timer, results, and answer-mode radios from a settings form.
 * A game that does not offer a choice leaves that part of the profile alone.
 */
export function rememberFormSelections(form) {
  if (!form) return getSelections();
  const data = new FormData(form);
  const patch = {};
  if (form.querySelector('input[name="time"]')) patch.time = String(data.get('time') ?? '');
  if (form.querySelector('input[name="sign"]')) patch.sign = String(data.get('sign') ?? '');
  if (form.querySelector('input[name="input"]')) patch.input = String(data.get('input') ?? '');
  return setSelections(patch);
}
