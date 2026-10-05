import {
  parseSettingsFromUrl,
  settingsToUrl,
  readSettingsFromForm,
  applySettingsToForm,
  promptText,
  thingName,
} from './latin-settings.js';
import { generatePuzzle, findConflicts, isComplete } from './latin-generator.js';
import { commitSettingsChange } from './apply-settings.js';

const els = {
  timerWrap: document.getElementById('timerWrap'),
  timer: document.getElementById('timer'),
  score: document.getElementById('score'),
  settingsBtn: document.getElementById('settingsBtn'),
  help: document.querySelector('.match-help'),
  helpBtn: document.getElementById('helpBtn'),
  prompt: document.getElementById('latinPrompt'),
  board: document.getElementById('latinBoard'),
  palette: document.getElementById('latinPalette'),
  feedback: document.getElementById('feedback'),
  checkBtn: document.getElementById('checkBtn'),
  newBtn: document.getElementById('newBtn'),
  sign: document.getElementById('latinSign'),
  signDetail: document.getElementById('latinSignDetail'),
  playAgainBtn: document.getElementById('playAgainBtn'),
  settingsModal: document.getElementById('settingsModal'),
  settingsForm: document.getElementById('settingsForm'),
  settingsError: document.getElementById('settingsError'),
  cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
};

let settings = parseSettingsFromUrl();
let puzzle = null;
let selectedSymbol = null;
let solvedCount = 0;
let ended = false;
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

function updateSolved() {
  els.score.textContent = String(solvedCount);
}

function symbolNode(symbolIndex) {
  const span = document.createElement('span');
  span.className = 'latin-symbol';
  if (settings.type === 'num') span.classList.add('is-number');
  if (settings.type === 'word') span.classList.add('is-word');
  span.textContent = puzzle.symbols[symbolIndex];
  span.setAttribute('aria-hidden', 'true');
  return span;
}

function symbolLabel(symbolIndex) {
  return settings.type === 'num'
    ? `number ${puzzle.symbols[symbolIndex]}`
    : puzzle.symbols[symbolIndex];
}

function remainingFor(symbolIndex) {
  const placed = puzzle.cells.filter((cell) => cell.value === symbolIndex).length;
  return puzzle.size - placed;
}

function syncCell(index) {
  const button = els.board.children[index];
  const cell = puzzle.cells[index];
  if (!button || !cell) return;

  button.classList.toggle('is-given', cell.given);
  button.classList.toggle('is-filled', cell.value != null);
  button.disabled = ended || cell.given;
  button.replaceChildren();
  if (cell.value != null) {
    button.appendChild(symbolNode(cell.value));
    button.setAttribute('aria-label', cell.given
      ? `${symbolLabel(cell.value)}, fixed`
      : `${symbolLabel(cell.value)}, tap to remove`);
  } else {
    button.setAttribute('aria-label', 'Empty square');
  }
}

function syncPalette() {
  puzzle.symbols.forEach((_, symbolIndex) => {
    const tile = els.palette.children[symbolIndex];
    if (!tile) return;
    const remaining = remainingFor(symbolIndex);
    const used = remaining <= 0;
    tile.disabled = ended || used;
    tile.classList.toggle('is-selected', selectedSymbol === symbolIndex);
    tile.setAttribute('aria-pressed', selectedSymbol === symbolIndex ? 'true' : 'false');
    const badge = tile.querySelector('.latin-tile-count');
    if (badge) badge.textContent = String(Math.max(0, remaining));
  });
}

function clearConflicts() {
  for (const button of els.board.children) {
    button.classList.remove('is-conflict');
  }
}

function showConflicts(conflicts) {
  clearConflicts();
  conflicts.forEach((index) => {
    const button = els.board.children[index];
    if (button) button.classList.add('is-conflict');
  });
}

function setFeedback(text, kind) {
  els.feedback.textContent = text;
  els.feedback.classList.toggle('correct', kind === 'good');
  els.feedback.classList.toggle('incorrect', kind === 'bad');
}

function win() {
  ended = true;
  stopTimer();
  clearConflicts();
  selectedSymbol = null;
  solvedCount += 1;
  updateSolved();
  syncPalette();
  for (const button of els.board.children) {
    button.disabled = true;
  }
  const timePart = settings.time === 'y' && startedAt != null
    ? ` in ${formatElapsed(Date.now() - startedAt)}`
    : '';
  els.signDetail.textContent = `You solved the ${puzzle.size} × ${puzzle.size} square${timePart}.`;
  els.sign.hidden = false;
  els.playAgainBtn.focus();
}

function afterBoardChange() {
  clearConflicts();
  setFeedback('', null);
  syncPalette();

  if (!isComplete(puzzle)) return;

  const conflicts = findConflicts(puzzle);
  if (conflicts.size === 0) {
    win();
  } else {
    showConflicts(conflicts);
    setFeedback('Almost! The red squares repeat in a row or column.', 'bad');
  }
}

function onCellClick(index) {
  if (ended) return;
  const cell = puzzle.cells[index];
  if (cell.given) return;

  if (cell.value != null) {
    cell.value = null;
    syncCell(index);
    afterBoardChange();
    return;
  }

  if (selectedSymbol == null) {
    setFeedback(`Pick a ${thingName(settings)} below the grid first.`, null);
    return;
  }

  cell.value = selectedSymbol;
  syncCell(index);
  if (remainingFor(selectedSymbol) <= 0) {
    selectedSymbol = null;
  }
  afterBoardChange();
}

function onTileClick(symbolIndex) {
  if (ended) return;
  selectedSymbol = selectedSymbol === symbolIndex ? null : symbolIndex;
  setFeedback('', null);
  syncPalette();
}

function placeFromDrop(index, symbolIndex) {
  if (ended) return;
  const cell = puzzle.cells[index];
  if (cell.given || cell.value != null) return;
  if (remainingFor(symbolIndex) <= 0) return;
  cell.value = symbolIndex;
  syncCell(index);
  afterBoardChange();
}

function renderBoard() {
  els.board.style.setProperty('--latin-size', String(puzzle.size));
  els.board.replaceChildren();

  puzzle.cells.forEach((cell, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'latin-cell';
    button.addEventListener('click', () => onCellClick(index));

    button.addEventListener('dragover', (event) => {
      if (ended || cell.given || puzzle.cells[index].value != null) return;
      event.preventDefault();
      button.classList.add('is-drop');
    });
    button.addEventListener('dragleave', () => button.classList.remove('is-drop'));
    button.addEventListener('drop', (event) => {
      event.preventDefault();
      button.classList.remove('is-drop');
      const raw = event.dataTransfer.getData('text/plain');
      const symbolIndex = Number(raw);
      if (Number.isInteger(symbolIndex)) placeFromDrop(index, symbolIndex);
    });

    els.board.appendChild(button);
    syncCell(index);
  });
}

function renderPalette() {
  els.palette.replaceChildren();

  puzzle.symbols.forEach((_, symbolIndex) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'latin-tile';
    tile.draggable = true;
    tile.setAttribute('aria-label', `Place ${symbolLabel(symbolIndex)}`);
    tile.appendChild(symbolNode(symbolIndex));

    const badge = document.createElement('span');
    badge.className = 'latin-tile-count';
    badge.setAttribute('aria-hidden', 'true');
    tile.appendChild(badge);

    tile.addEventListener('click', () => onTileClick(symbolIndex));
    tile.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', String(symbolIndex));
      event.dataTransfer.effectAllowed = 'copy';
    });

    els.palette.appendChild(tile);
  });

  syncPalette();
}

function onCheck() {
  if (ended || !puzzle) return;
  const conflicts = findConflicts(puzzle);
  if (conflicts.size === 0) {
    setFeedback('Looking good so far — keep going!', 'good');
  } else {
    showConflicts(conflicts);
    setFeedback('The red squares repeat in a row or column.', 'bad');
  }
}

function setHelpOpen(open) {
  els.prompt.hidden = !open;
  els.helpBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function startRound() {
  puzzle = generatePuzzle(settings);
  selectedSymbol = null;
  ended = false;
  els.sign.hidden = true;
  els.prompt.textContent = promptText(settings);
  setFeedback('', null);
  updateSolved();
  renderBoard();
  renderPalette();
  startTimer();
}

function openSettingsModal() {
  setHelpOpen(false);
  applySettingsToForm(els.settingsForm, settings);
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
  solvedCount = 0;
  startRound();
  closeSettingsModal();
}

function bindEvents() {
  els.settingsBtn.addEventListener('click', openSettingsModal);
  els.helpBtn.addEventListener('click', () => {
    setHelpOpen(els.prompt.hidden);
  });
  els.cancelSettingsBtn.addEventListener('click', closeSettingsModal);
  els.checkBtn.addEventListener('click', onCheck);
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
}

function init() {
  settings = parseSettingsFromUrl();
  bindEvents();
  startRound();
}

init();
