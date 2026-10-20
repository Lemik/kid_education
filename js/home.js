import { completedCount } from './profile.js';
import { LEVELS } from './levels.js';
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
import { MATCH_LEVELS } from './match-levels.js';
import { LATIN_LEVELS } from './latin-levels.js';
import { LLAMA_LEVELS } from './llama-levels.js';

const GAMES = [
  ['math/', 'math', LEVELS.length],
  ['times/', 'times', TIMES_LEVELS.length],
  ['subset/', 'subset', SUBSET_LEVELS.length],
  ['measure/', 'measure', MEASURE_LEVELS.length],
  ['patterns/', 'patterns', PATTERNS_LEVELS.length],
  ['words/', 'words', WORDS_LEVELS.length],
  ['unscramble/', 'unscramble', UNSCRAMBLE_LEVELS.length],
  ['sentences/', 'sentences', SENTENCES_LEVELS.length],
  ['clock/', 'clock', CLOCK_LEVELS.length],
  ['money/', 'money', MONEY_LEVELS.length],
  ['geography/', 'geography', GEOGRAPHY_LEVELS.length],
  ['flags/', 'flags', FLAGS_LEVELS.length],
  ['match/', 'match', MATCH_LEVELS.length],
  ['latin/', 'latin', LATIN_LEVELS.length],
  ['llama/', 'llama', LLAMA_LEVELS.length],
];

function progressLabel(finished, total) {
  if (finished <= 0) return 'Not started';
  return `${finished} of ${total} finished`;
}

function addCardProgress(card, finished, total) {
  const wrap = document.createElement('span');
  wrap.className = 'game-card-progress';

  const track = document.createElement('span');
  track.className = 'game-card-progress-track';
  const bar = document.createElement('span');
  bar.className = 'game-card-progress-bar';
  const pct = total > 0 ? Math.round((finished / total) * 100) : 0;
  bar.style.width = `${pct}%`;
  track.append(bar);

  const text = document.createElement('span');
  text.textContent = progressLabel(finished, total);

  wrap.append(track, text);
  card.append(wrap);
}

const summary = document.getElementById('homeProgress');
let done = 0;
let total = 0;

for (const card of document.querySelectorAll('.game-card')) {
  const spec = GAMES.find(([href]) => href === card.getAttribute('href'));
  if (!spec) continue;
  const [, id, count] = spec;
  const finished = completedCount(id);
  done += finished;
  total += count;
  addCardProgress(card, finished, count);
}

if (summary) {
  summary.textContent = done === 0
    ? 'No levels finished yet'
    : `${done} of ${total} levels finished`;
}
