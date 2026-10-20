/**
 * Profile page: coins, saved choices, and every game's level map.
 * Reads the profile in localStorage. Nothing here is linked from the menus.
 */

import { getProfile, setName, setSelections } from './profile.js';
import { LEVELS, LEVEL_UP_TARGET } from './levels.js';
import { TIMES_LEVELS } from './times-levels.js';
import { SUBSET_LEVELS } from './subset-levels.js';
import { MEASURE_LEVELS } from './measure-levels.js';
import { PATTERNS_LEVELS } from './patterns-levels.js';
import { WORDS_LEVELS } from './words-levels.js';
import { UNSCRAMBLE_LEVELS } from './unscramble-levels.js';
import { SENTENCES_LEVELS } from './sentences-levels.js';
import { CLOCK_LEVELS } from './clock-levels.js';
import { MONEY_LEVELS } from './money-levels.js';
import { GEOGRAPHY_LEVELS } from './geography-levels.js';
import { FLAGS_LEVELS } from './flags-levels.js';
import { MATCH_LEVELS, MATCH_LEVEL_UP_TARGET } from './match-levels.js';
import { LATIN_LEVELS, LATIN_LEVEL_UP_TARGET } from './latin-levels.js';
import { LLAMA_LEVELS, LLAMA_LEVEL_UP_TARGET } from './llama-levels.js';

const GAMES = [
  { href: '../math/', id: 'math', title: 'Mathematics', icon: '🔢', tone: 'game-card-math', color: '#2563eb', levels: LEVELS, target: LEVEL_UP_TARGET },
  { href: '../times/', id: 'times', title: 'Times Tables', icon: '✖️', tone: 'game-card-times', color: '#e11d48', levels: TIMES_LEVELS, target: LEVEL_UP_TARGET },
  { href: '../subset/', id: 'subset', title: 'Subset', icon: '🧮', tone: 'game-card-subset', color: '#ea580c', levels: SUBSET_LEVELS, target: LEVEL_UP_TARGET },
  { href: '../measure/', id: 'measure', title: 'Measurements', icon: '📏', tone: 'game-card-measure', color: '#16a34a', levels: MEASURE_LEVELS, target: LEVEL_UP_TARGET },
  { href: '../patterns/', id: 'patterns', title: 'Patterns', icon: '🔁', tone: 'game-card-patterns', color: '#7c3aed', levels: PATTERNS_LEVELS, target: LEVEL_UP_TARGET },
  { href: '../words/', id: 'words', title: 'Words', icon: '✏️', tone: 'game-card-words', color: '#d97706', levels: WORDS_LEVELS, target: LEVEL_UP_TARGET },
  { href: '../unscramble/', id: 'unscramble', title: 'Unscramble', icon: '🔤', tone: 'game-card-unscramble', color: '#0d9488', levels: UNSCRAMBLE_LEVELS, target: LEVEL_UP_TARGET },
  { href: '../sentences/', id: 'sentences', title: 'Sentences', icon: '💬', tone: 'game-card-sentences', color: '#db2777', levels: SENTENCES_LEVELS, target: LEVEL_UP_TARGET },
  { href: '../clock/', id: 'clock', title: 'Clock', icon: '🕐', tone: 'game-card-clock', color: '#c2410c', levels: CLOCK_LEVELS, target: LEVEL_UP_TARGET },
  { href: '../money/', id: 'money', title: 'Money', icon: '🪙', tone: 'game-card-money', color: '#65a30d', levels: MONEY_LEVELS, target: LEVEL_UP_TARGET },
  { href: '../geography/', id: 'geography', title: 'Geography', icon: '🍁', tone: 'game-card-geography', color: '#0284c7', levels: GEOGRAPHY_LEVELS, target: LEVEL_UP_TARGET },
  { href: '../flags/', id: 'flags', title: 'Flags', icon: '🚩', tone: 'game-card-flags', color: '#ca8a04', levels: FLAGS_LEVELS, target: LEVEL_UP_TARGET },
  { href: '../match/', id: 'match', title: 'Find a Match', icon: '🃏', tone: 'game-card-match', color: '#c026d3', levels: MATCH_LEVELS, target: MATCH_LEVEL_UP_TARGET, board: true },
  { href: '../latin/', id: 'latin', title: 'Latin Square', icon: '🧩', tone: 'game-card-latin', color: '#4f46e5', levels: LATIN_LEVELS, target: LATIN_LEVEL_UP_TARGET, board: true },
  { href: '../llama/', id: 'llama', title: 'Find a Llama', icon: '🦙', tone: 'game-card-llama', color: '#b45309', levels: LLAMA_LEVELS, target: LLAMA_LEVEL_UP_TARGET, board: true },
];

/** On is the first value, off is the second. Games that offer the choice use it. */
const TOGGLES = [
  {
    kind: 'time',
    title: 'Time',
    on: 'y',
    off: 'n',
    onNote: 'A timer runs while you play',
    offNote: 'No timer while you play',
  },
  {
    kind: 'sign',
    title: 'Results',
    on: 'both',
    off: 'positive',
    onNote: 'Correct and wrong answers are counted',
    offNote: 'Only correct answers are counted',
  },
  {
    kind: 'input',
    title: 'Answers',
    on: 'multichoice',
    off: 'answer',
    onNote: 'You pick from a list',
    offNote: 'You type the answer',
  },
  {
    kind: 'showCoins',
    title: 'Coins',
    on: 'y',
    off: 'n',
    onNote: 'The coin purse stays on screen',
    offNote: 'The coin purse stays hidden',
  },
];

const RING_RADIUS = 52;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const STAR_CAP = 12;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function gameState(game, record) {
  const total = game.levels.length;
  const done = new Set(
    (record?.completed ?? []).filter((n) => n >= 1 && n <= total),
  );
  const level = Math.min(total, Math.max(1, record?.level ?? 1));
  const streak = Math.max(0, Math.min(game.target, record?.streak ?? 0));
  const finished = done.size;
  const started = finished > 0 || streak > 0 || level > 1;
  const onOpenLevel = started && finished < total && !done.has(level);
  return { total, done, level, streak, finished, started, onOpenLevel };
}

function streakLabel(streak, target, board) {
  return board ? `${streak} of ${target} boards` : `${streak} of ${target} in a row`;
}

function choiceToggle(spec, value) {
  const card = document.createElement('label');
  card.className = 'profile-choice';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'profile-switch';
  input.setAttribute('role', 'switch');
  input.checked = value === spec.on;

  const name = el('strong');
  const note = el('span', 'profile-choice-note');

  function paint() {
    const on = input.checked;
    name.textContent = on ? 'On' : 'Off';
    note.textContent = on ? spec.onNote : spec.offNote;
    input.setAttribute('aria-label', `${spec.title}, ${on ? 'on' : 'off'}. ${note.textContent}`);
  }

  input.addEventListener('change', () => {
    setSelections({ [spec.kind]: input.checked ? spec.on : spec.off });
    paint();
    if (spec.kind === 'showCoins') applyCoinDisplay(input.checked);
  });

  paint();

  const top = el('span', 'profile-choice-top');
  top.append(el('span', 'profile-choice-kicker', spec.title), input);
  card.append(top, name, note);
  return card;
}

function levelMap(game, state) {
  const map = el('div', 'profile-map');
  map.setAttribute('aria-hidden', 'true');

  game.levels.forEach((spec, index) => {
    const n = index + 1;
    const cell = el('span', 'profile-cell');
    if (state.done.has(n)) cell.classList.add('is-done');
    if (state.onOpenLevel && n === state.level) cell.classList.add('is-now');
    cell.title = `${n}. ${spec.label}`;
    map.append(cell);
  });
  return map;
}

function streakRow(streak, target) {
  const row = el('div', 'profile-streak');
  row.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < target; i += 1) {
    row.append(el('span', i < streak ? 'profile-pip is-on' : 'profile-pip'));
  }
  return row;
}

function gameCard(game, record) {
  const state = gameState(game, record);
  const card = document.createElement('a');
  card.className = `profile-card ${game.tone}`;
  card.href = game.href;
  card.style.setProperty('--tone', game.color);

  const head = el('div', 'profile-card-head');
  head.append(
    el('span', 'profile-card-icon', game.icon),
    el('span', 'profile-card-title', game.title),
    el('span', `profile-card-count${state.finished === state.total ? ' is-done' : ''}`, `${state.finished}/${state.total}`),
  );

  const status = el('p', 'profile-card-status');
  card.append(head, levelMap(game, state), status);

  if (state.finished === state.total) {
    status.classList.add('is-done');
    status.textContent = 'All levels finished';
  } else if (!state.started) {
    status.classList.add('is-idle');
    status.textContent = 'Not started yet';
  } else if (state.onOpenLevel) {
    const spec = game.levels[state.level - 1];
    status.textContent = `Level ${state.level} · ${spec.label}.`;
    status.append(el('span', 'profile-card-detail', streakLabel(state.streak, game.target, game.board)));
    card.append(streakRow(state.streak, game.target));
  } else {
    status.textContent = 'More levels still open';
  }

  return { card, state };
}

function paintRing(finished, total) {
  const ring = document.getElementById('profileRing');
  const percentEl = document.getElementById('profilePercent');
  const ratio = total > 0 ? finished / total : 0;
  const percent = Math.round(ratio * 100);
  percentEl.textContent = `${percent}%`;
  ring.style.strokeDasharray = String(RING_LENGTH);
  ring.style.strokeLinecap = ratio >= 1 ? 'butt' : 'round';
  if (ratio <= 0) ring.style.opacity = '0';
  if (ratio >= 1) ring.classList.add('is-complete');

  const offset = String(RING_LENGTH * (1 - ratio));
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  if (reduce) ring.style.transition = 'none';
  if (reduce || ratio <= 0) {
    ring.style.strokeDashoffset = offset;
  } else {
    ring.style.strokeDashoffset = String(RING_LENGTH);
    requestAnimationFrame(() => {
      ring.style.strokeDashoffset = offset;
    });
  }
}

function applyCoinDisplay(shown) {
  for (const purse of document.querySelectorAll('.profile-purse, .coin-wrap')) {
    purse.hidden = !shown;
  }
}

function paintStars(coins) {
  const wrap = document.getElementById('profileStars');
  const count = Math.max(0, coins);
  const shown = count === 0 ? 1 : Math.min(count, STAR_CAP);
  for (let i = 0; i < shown; i += 1) {
    const star = el('span', count === 0 ? 'coin-icon is-empty' : 'coin-icon', '★');
    wrap.append(star);
  }
  const label = document.getElementById('profileCoins');
  const noun = count === 1 ? 'coin' : 'coins';
  label.textContent = `${count} ${noun}`;
  label.setAttribute('aria-label', `${count} ${noun}`);
}

function wireName(name) {
  const input = document.getElementById('profileName');
  const greeting = document.getElementById('profileGreeting');
  if (!input || !greeting) return;
  input.value = name;
  greeting.textContent = name ? `Hi, ${name}` : 'Name';

  input.addEventListener('input', () => {
    const saved = setName(input.value);
    greeting.textContent = saved ? `Hi, ${saved}` : 'Name';
  });
  input.addEventListener('blur', () => {
    input.value = setName(input.value);
  });
}

function render() {
  const profile = getProfile();
  const grid = document.getElementById('profileGrid');
  let finished = 0;
  let total = 0;
  let started = 0;

  for (const game of GAMES) {
    const built = gameCard(game, profile.games[game.id]);
    grid.append(built.card);
    finished += built.state.finished;
    total += built.state.total;
    if (built.state.started) started += 1;
  }

  const totalEl = document.getElementById('profileTotal');
  totalEl.textContent = finished === 0
    ? 'No levels finished yet'
    : `${finished} of ${total} levels finished`;

  const startedEl = document.getElementById('profileStarted');
  startedEl.textContent = started === 0
    ? `0 of ${GAMES.length} games started`
    : `${started} of ${GAMES.length} games started`;

  paintRing(finished, total);
  paintStars(profile.coins);
  applyCoinDisplay(profile.showCoins === 'y');
  wireName(profile.name);

  const choices = document.getElementById('profileChoices');
  for (const spec of TOGGLES) {
    choices.append(choiceToggle(spec, profile[spec.kind]));
  }
}

render();
