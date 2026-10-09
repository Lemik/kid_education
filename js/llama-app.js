import {
  parseSettingsFromUrl,
  settingsToUrl,
  readSettingsFromForm,
  applySettingsToForm,
  promptText,
  isLevelMode,
  buildLevelSettings,
} from './llama-settings.js';
import { generateBoard } from './llama-generator.js';
import { LLAMA_LEVELS, LLAMA_LEVEL_UP_TARGET, LLAMA_LIVES } from './llama-levels.js';
import {
  getSavedLevel,
  setSavedLevel,
  getLevelSolved,
  setLevelSolved,
} from './llama-storage.js';
import { commitSettingsChange } from './apply-settings.js';

/** Two taps on the same square closer than this count as a double-tap. */
const DOUBLE_TAP_MS = 600;
const SIGN_DELAY_MS = 900;

const REGION_COLORS = [
  '#fca5a5', '#fdba74', '#fde047', '#86efac',
  '#7dd3fc', '#c4b5fd', '#f9a8d4', '#d6d3d1',
];

const els = {
  timerWrap: document.getElementById('timerWrap'),
  timer: document.getElementById('timer'),
  found: document.getElementById('found'),
  lives: document.getElementById('lives'),
  settingsBtn: document.getElementById('settingsBtn'),
  help: document.querySelector('.match-help'),
  helpBtn: document.getElementById('helpBtn'),
  prompt: document.getElementById('llamaPrompt'),
  board: document.getElementById('llamaBoard'),
  feedback: document.getElementById('feedback'),
  newBtn: document.getElementById('newBtn'),
  sign: document.getElementById('llamaSign'),
  signDetail: document.getElementById('llamaSignDetail'),
  playAgainBtn: document.getElementById('playAgainBtn'),
  settingsModal: document.getElementById('settingsModal'),
  settingsForm: document.getElementById('settingsForm'),
  settingsError: document.getElementById('settingsError'),
  cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
  levelFields: document.getElementById('levelFields'),
  levelSelect: document.getElementById('settingLevel'),
  levelHint: document.getElementById('levelHint'),
  customFields: document.getElementById('customFields'),
  levelWrap: document.getElementById('levelWrap'),
  levelValue: document.getElementById('levelValue'),
  levelProgress: document.getElementById('levelProgress'),
  levelLabel: document.getElementById('levelLabel'),
};

let settings = parseSettingsFromUrl(window.location.search, getSavedLevel());
let board = null;
/** Per square: 'empty', 'x', 'found', 'miss', or 'revealed'. */
let marks = [];
let colors = [];
let lives = LLAMA_LIVES;
let foundCount = 0;
let lastTap = null;
let ended = false;
let signTimeout = null;
let startedAt = null;
let timerInterval = null;

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

function stopTimer() {
  if (timerInterval != null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startTimer() {
  stopTimer();
  if (settings.time !== 'y') {
    els.timerWrap.hidden = true;
    return;
  }
  els.timerWrap.hidden = false;
  startedAt = Date.now();
  els.timer.textContent = '00:00';
  timerInterval = setInterval(() => {
    els.timer.textContent = formatElapsed(Date.now() - startedAt);
  }, 500);
}

function updateStatus() {
  els.found.textContent = `${foundCount}/${board.size}`;
  els.lives.textContent = '❤️'.repeat(lives) + '🤍'.repeat(LLAMA_LIVES - lives);
  els.lives.setAttribute('aria-label', `${lives} of ${LLAMA_LIVES} lives left`);
}

function updateLevelDisplay() {
  const levelMode = isLevelMode(settings);
  els.levelWrap.hidden = !levelMode;
  els.levelLabel.hidden = !levelMode;
  if (!levelMode) return;

  els.levelLabel.textContent = settings.label;
  els.levelValue.textContent = String(settings.level);
  els.levelProgress.textContent = `${getLevelSolved()}/${LLAMA_LEVEL_UP_TARGET}`;
  els.levelWrap.title = `Level ${settings.level}: ${settings.label}`;
}

/** Make `level` the child's current level; switching levels restarts the progress. */
function saveCurrentLevel(level) {
  if (getSavedLevel() === level) return;
  setSavedLevel(level);
  setLevelSolved(0);
}

/**
 * Count a solved board toward the next level.
 * Returns a celebration message when the level changes (or is mastered).
 */
function recordLevelSolved() {
  if (!isLevelMode(settings)) return null;

  const solved = getLevelSolved() + 1;
  if (solved < LLAMA_LEVEL_UP_TARGET) {
    setLevelSolved(solved);
    return null;
  }

  setLevelSolved(0);
  if (settings.level >= LLAMA_LEVELS.length) {
    return `You mastered the top level — ${settings.label}!`;
  }

  settings = buildLevelSettings(settings.level + 1, settings.time);
  setSavedLevel(settings.level);
  history.replaceState(null, '', settingsToUrl(settings));
  return `Level up! Level ${settings.level} — ${settings.label}`;
}

function populateLevelSelect() {
  els.levelSelect.replaceChildren(
    ...LLAMA_LEVELS.map((level, index) => {
      const option = document.createElement('option');
      option.value = String(index + 1);
      option.textContent = `${index + 1} — ${level.label}`;
      return option;
    }),
  );
  els.levelHint.textContent = `Moves up a level after ${LLAMA_LEVEL_UP_TARGET} solved fields.`;
}

function updateModeFields() {
  const levelMode = els.settingsForm.querySelector('input[name="mode"]:checked')?.value === 'level';
  els.levelFields.hidden = !levelMode;
  els.customFields.hidden = levelMode;
}

function setFeedback(text, kind) {
  els.feedback.textContent = text;
  els.feedback.classList.toggle('correct', kind === 'good');
  els.feedback.classList.toggle('incorrect', kind === 'bad');
}

const MARK_TEXT = { empty: '', x: '✕', found: '🦙', miss: '✖', revealed: '🦙' };

function cellLabel(index) {
  const row = Math.floor(index / board.size) + 1;
  const col = (index % board.size) + 1;
  const where = `Row ${row}, column ${col}`;
  switch (marks[index]) {
    case 'x': return `${where}, marked X`;
    case 'found': return `${where}, llama found`;
    case 'miss': return `${where}, no llama`;
    case 'revealed': return `${where}, llama`;
    default: return where;
  }
}

function syncCell(index) {
  const button = els.board.children[index];
  if (!button) return;
  const mark = marks[index];
  for (const name of ['x', 'found', 'miss', 'revealed']) {
    button.classList.toggle(`is-${name}`, mark === name);
  }
  button.disabled = ended || mark === 'found' || mark === 'miss';
  const span = button.firstElementChild;
  span.textContent = MARK_TEXT[mark];
  button.setAttribute('aria-label', cellLabel(index));
}

function showWinSign(detail) {
  clearTimeout(signTimeout);
  signTimeout = setTimeout(() => {
    els.signDetail.textContent = detail;
    els.sign.hidden = false;
    els.playAgainBtn.focus();
  }, SIGN_DELAY_MS);
}

function endRound() {
  ended = true;
  lastTap = null;
  stopTimer();
  marks.forEach((_, index) => syncCell(index));
}

function win() {
  endRound();
  const timePart = settings.time === 'y' && startedAt != null
    ? ` in ${formatElapsed(Date.now() - startedAt)}`
    : '';
  const foundText = `You found all ${board.size} llamas${timePart}.`;
  const levelMessage = recordLevelSolved();
  updateLevelDisplay();
  setFeedback('All the llamas are found!', 'good');
  showWinSign(levelMessage ? `${foundText} ${levelMessage}` : foundText);
}

function lose() {
  board.llamas.forEach((index) => {
    if (marks[index] !== 'found') marks[index] = 'revealed';
  });
  endRound();
  setFeedback('Out of lives! Here is where the llamas were hiding. Tap New board to try again.', 'bad');
  els.newBtn.focus();
}

function checkLlama(index) {
  if (board.llamas.has(index)) {
    marks[index] = 'found';
    foundCount += 1;
    syncCell(index);
    updateStatus();
    if (foundCount === board.size) {
      win();
    } else {
      setFeedback('You found a llama!', 'good');
    }
    return;
  }

  marks[index] = 'miss';
  lives -= 1;
  syncCell(index);
  updateStatus();
  const button = els.board.children[index];
  button.classList.remove('is-shake');
  void button.offsetWidth;
  button.classList.add('is-shake');

  if (lives <= 0) {
    lose();
  } else {
    setFeedback(`No llama there. ${lives} ${lives === 1 ? 'life' : 'lives'} left.`, 'bad');
  }
}

function onCellClick(index) {
  if (ended) return;
  const mark = marks[index];
  if (mark === 'found' || mark === 'miss') return;

  const now = performance.now();
  if (lastTap && lastTap.index === index && now - lastTap.time < DOUBLE_TAP_MS) {
    marks[index] = lastTap.before;
    lastTap = null;
    checkLlama(index);
    return;
  }

  lastTap = { index, time: now, before: mark };
  marks[index] = mark === 'x' ? 'empty' : 'x';
  setFeedback('', null);
  syncCell(index);
}

function renderBoard() {
  const n = board.size;
  els.board.style.setProperty('--llama-size', String(n));
  els.board.replaceChildren();

  board.regions.forEach((region, index) => {
    const row = Math.floor(index / n);
    const col = index % n;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'llama-cell';
    button.style.setProperty('--llama-color', colors[region]);
    if (row > 0 && board.regions[index - n] !== region) button.classList.add('edge-top');
    if (row < n - 1 && board.regions[index + n] !== region) button.classList.add('edge-bottom');
    if (col > 0 && board.regions[index - 1] !== region) button.classList.add('edge-left');
    if (col < n - 1 && board.regions[index + 1] !== region) button.classList.add('edge-right');

    const span = document.createElement('span');
    span.className = 'llama-mark';
    span.setAttribute('aria-hidden', 'true');
    button.appendChild(span);

    button.addEventListener('click', () => onCellClick(index));
    els.board.appendChild(button);
    syncCell(index);
  });
}

function shuffled(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function setHelpOpen(open) {
  els.prompt.hidden = !open;
  els.helpBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function startRound() {
  clearTimeout(signTimeout);
  board = generateBoard(settings);
  colors = shuffled(REGION_COLORS);
  marks = new Array(board.size * board.size).fill('empty');
  lives = LLAMA_LIVES;
  foundCount = 0;
  lastTap = null;
  ended = false;
  els.sign.hidden = true;
  els.prompt.textContent = promptText(settings);
  setFeedback('', null);
  updateStatus();
  updateLevelDisplay();
  renderBoard();
  startTimer();
}

function openSettingsModal() {
  setHelpOpen(false);
  applySettingsToForm(els.settingsForm, settings, getSavedLevel());
  updateModeFields();
  els.settingsError.hidden = true;
  els.settingsError.textContent = '';
  els.settingsModal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeSettingsModal() {
  els.settingsModal.hidden = true;
  document.body.classList.remove('modal-open');
}

function onSettingsSubmit(event) {
  event.preventDefault();
  const { settings: next, error } = readSettingsFromForm(els.settingsForm);
  if (error) {
    els.settingsError.hidden = false;
    els.settingsError.textContent = error;
    return;
  }

  commitSettingsChange(next, settingsToUrl, () => {});
  settings = next;
  if (isLevelMode(settings)) saveCurrentLevel(settings.level);
  startRound();
  closeSettingsModal();
}

function bindEvents() {
  els.settingsBtn.addEventListener('click', openSettingsModal);
  els.helpBtn.addEventListener('click', () => {
    setHelpOpen(els.prompt.hidden);
  });
  els.cancelSettingsBtn.addEventListener('click', closeSettingsModal);
  els.newBtn.addEventListener('click', startRound);
  els.playAgainBtn.addEventListener('click', startRound);

  els.settingsModal.addEventListener('click', (event) => {
    if (event.target === els.settingsModal) {
      closeSettingsModal();
    }
  });

  document.addEventListener('click', (event) => {
    if (els.prompt.hidden || els.help.contains(event.target)) return;
    setHelpOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!els.settingsModal.hidden) {
      closeSettingsModal();
      return;
    }
    if (!els.prompt.hidden) setHelpOpen(false);
  });

  els.settingsForm.addEventListener('submit', onSettingsSubmit);
  els.settingsForm.addEventListener('change', updateModeFields);
}

function init() {
  populateLevelSelect();
  if (isLevelMode(settings)) {
    saveCurrentLevel(settings.level);
    history.replaceState(null, '', settingsToUrl(settings));
  }
  bindEvents();
  startRound();
}

init();
