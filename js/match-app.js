import {
  parseSettingsFromUrl,
  settingsToUrl,
  readSettingsFromForm,
  applySettingsToForm,
  mixHintText,
  promptText,
} from './match-settings.js';
import { generateBoard } from './match-generator.js';
import { commitSettingsChange } from './apply-settings.js';

const MISMATCH_MS = 800;

const els = {
  timerWrap: document.getElementById('timerWrap'),
  timer: document.getElementById('timer'),
  score: document.getElementById('score'),
  settingsBtn: document.getElementById('settingsBtn'),
  help: document.querySelector('.match-help'),
  helpBtn: document.getElementById('helpBtn'),
  prompt: document.getElementById('matchPrompt'),
  board: document.getElementById('matchBoard'),
  sign: document.getElementById('matchSign'),
  signCard: document.getElementById('matchSignCard'),
  signEmoji: document.getElementById('matchSignEmoji'),
  signTitle: document.getElementById('matchSignTitle'),
  signDetail: document.getElementById('matchSignDetail'),
  playAgainBtn: document.getElementById('playAgainBtn'),
  settingsModal: document.getElementById('settingsModal'),
  settingsForm: document.getElementById('settingsForm'),
  settingsError: document.getElementById('settingsError'),
  cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
  timeLimitField: document.getElementById('timeLimitField'),
  mixHint: document.getElementById('mixHint'),
};

let settings = parseSettingsFromUrl();
let cards = [];
let pendingIndex = null;
let pairsFound = 0;
let ended = false;
let busy = false;
let deadline = null;
let timerInterval = null;
let mismatchTimer = null;

function pairTotal() {
  return cards.length / 2;
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function columnsFor(count) {
  const narrow = window.innerWidth <= 720;
  if (count <= 6) return 3;
  if (count <= 12) return narrow ? 3 : 4;
  if (count <= 20) return narrow ? 4 : 5;
  if (count <= 30) return narrow ? 4 : 6;
  if (count <= 48) return narrow ? 5 : 8;
  if (count <= 80) return narrow ? 5 : 10;
  return narrow ? 6 : 10;
}

function updateFound() {
  els.score.textContent = `${pairsFound} / ${pairTotal()}`;
}

function hideSign() {
  els.sign.hidden = true;
}

function showSign(kind) {
  const total = pairTotal();
  els.sign.hidden = false;
  els.signCard.classList.toggle('match-sign-card--win', kind === 'win');
  els.signCard.classList.toggle('match-sign-card--time', kind === 'time');

  if (kind === 'win') {
    els.signEmoji.textContent = '🎉';
    els.signTitle.textContent = 'Congratulations!';
    els.signDetail.textContent = `You found all ${total} pairs.`;
  } else {
    els.signEmoji.textContent = '⏱️';
    els.signTitle.textContent = "Time's up!";
    els.signDetail.textContent = `You found ${pairsFound} of ${total}.`;
  }

  els.playAgainBtn.focus();
}

function stopTimer() {
  if (timerInterval != null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function clearMismatchTimer() {
  if (mismatchTimer != null) {
    clearTimeout(mismatchTimer);
    mismatchTimer = null;
  }
}

function startTimer() {
  stopTimer();
  deadline = null;
  els.timer.classList.remove('is-urgent', 'is-done');

  if (settings.time !== 'y') {
    els.timerWrap.hidden = true;
    return;
  }

  els.timerWrap.hidden = false;
  deadline = Date.now() + settings.limit * 1000;

  const tick = () => {
    if (ended || deadline == null) return;
    const left = deadline - Date.now();
    if (left <= 0) {
      els.timer.textContent = '00:00';
      els.timer.classList.add('is-done');
      els.timer.classList.remove('is-urgent');
      endRound('time');
      return;
    }
    const seconds = Math.ceil(left / 1000);
    els.timer.textContent = formatCountdown(left);
    els.timer.classList.toggle('is-urgent', seconds <= 10);
  };

  tick();
  timerInterval = setInterval(tick, 200);
}

function faceContent(card) {
  if (card.kind === 'emoji') {
    const span = document.createElement('span');
    span.className = 'match-emoji';
    span.textContent = card.emoji;
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  if (card.kind === 'color') {
    const span = document.createElement('span');
    span.className = 'match-swatch';
    span.style.background = card.color;
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  if (card.kind === 'dots') {
    const wrap = document.createElement('span');
    wrap.className = 'match-dots';
    wrap.dataset.count = String(card.count);
    wrap.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < card.count; i += 1) {
      wrap.appendChild(document.createElement('i'));
    }
    return wrap;
  }

  const span = document.createElement('span');
  span.className = card.kind === 'number' ? 'match-number' : 'match-word';
  if (card.kind === 'word' && card.text.length > 12) {
    span.classList.add('is-longer');
  } else if (card.kind === 'word' && card.text.length > 8) {
    span.classList.add('is-long');
  }
  span.textContent = card.text;
  return span;
}

function syncCard(index) {
  const button = els.board.children[index];
  const card = cards[index];
  if (!button || !card) return;

  const faceUp = card.open || card.matched;
  button.classList.toggle('is-open', faceUp);
  button.classList.toggle('is-matched', card.matched);
  button.classList.toggle('is-pending', card.pending);
  button.classList.toggle('is-mismatch', card.mismatch);
  button.disabled = ended || card.matched;
  button.setAttribute('aria-pressed', faceUp ? 'true' : 'false');
  button.setAttribute('aria-label', faceUp ? card.label : 'Hidden card');
}

function layoutBoard() {
  els.board.style.setProperty('--match-cols', String(columnsFor(cards.length)));
}

function renderBoard() {
  els.board.replaceChildren();
  layoutBoard();

  cards.forEach((card, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'match-card';
    button.dataset.pair = card.pairId;

    const inner = document.createElement('span');
    inner.className = 'match-card-inner';

    const back = document.createElement('span');
    back.className = 'match-card-face match-card-back';
    back.setAttribute('aria-hidden', 'true');

    const front = document.createElement('span');
    front.className = 'match-card-face match-card-front';
    front.appendChild(faceContent(card));

    inner.append(back, front);
    button.appendChild(inner);
    button.addEventListener('click', () => onCardClick(index));
    els.board.appendChild(button);
    syncCard(index);
  });
}

function endRound(kind) {
  if (ended) return;
  ended = true;
  busy = false;
  clearMismatchTimer();
  stopTimer();
  if (kind === 'time') {
    els.timer.textContent = '00:00';
    els.timer.classList.add('is-done');
  }
  cards.forEach((card, index) => {
    card.pending = false;
    card.mismatch = false;
    syncCard(index);
  });
  showSign(kind);
}

function onCardClick(index) {
  if (ended || busy) return;
  const card = cards[index];
  if (!card || card.matched || card.open) return;

  card.open = true;
  syncCard(index);

  if (pendingIndex == null) {
    card.pending = true;
    pendingIndex = index;
    syncCard(index);
    return;
  }

  const first = pendingIndex;
  pendingIndex = null;
  cards[first].pending = false;

  if (cards[first].pairId === card.pairId) {
    cards[first].matched = true;
    card.matched = true;
    syncCard(first);
    syncCard(index);
    pairsFound += 1;
    updateFound();
    if (pairsFound === pairTotal()) {
      endRound('win');
    }
    return;
  }

  cards[first].mismatch = true;
  card.mismatch = true;
  syncCard(first);
  syncCard(index);
  busy = true;

  mismatchTimer = setTimeout(() => {
    mismatchTimer = null;
    if (ended) return;
    cards[first].open = false;
    cards[first].mismatch = false;
    card.mismatch = false;
    card.pending = true;
    pendingIndex = index;
    busy = false;
    syncCard(first);
    syncCard(index);
  }, MISMATCH_MS);
}

function setHelpOpen(open) {
  els.prompt.hidden = !open;
  els.helpBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function startRound() {
  clearMismatchTimer();
  stopTimer();
  cards = generateBoard(settings).map((card) => ({
    ...card,
    open: false,
    matched: false,
    pending: false,
    mismatch: false,
  }));
  pendingIndex = null;
  pairsFound = 0;
  ended = false;
  busy = false;
  hideSign();
  els.prompt.textContent = promptText(settings);
  updateFound();
  renderBoard();
  startTimer();
}

function formSnapshot() {
  const data = new FormData(els.settingsForm);
  const kinds = data.getAll('kind').map(String);
  return {
    pictures: kinds.includes('pic'),
    numbers: kinds.includes('num'),
    words: kinds.includes('word'),
    mix: String(data.get('mix') ?? 'n'),
  };
}

function syncSettingsFormHints() {
  const timeInput = els.settingsForm.querySelector('input[name="time"]:checked');
  els.timeLimitField.hidden = !timeInput || timeInput.value !== 'y';
  els.mixHint.textContent = mixHintText(formSnapshot());
}

function openSettingsModal() {
  setHelpOpen(false);
  applySettingsToForm(els.settingsForm, settings);
  syncSettingsFormHints();
  els.settingsError.hidden = true;
  els.settingsError.textContent = '';
  els.settingsModal.hidden = false;
  document.body.classList.add('modal-open');
  const cardsInput = els.settingsForm.cards;
  if (cardsInput) cardsInput.focus();
}

function closeSettingsModal() {
  els.settingsModal.hidden = true;
  document.body.classList.remove('modal-open');
}

function applyNewSettings(next) {
  settings = next;
  startRound();
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
  applyNewSettings(next);
  closeSettingsModal();
}

function bindEvents() {
  els.settingsBtn.addEventListener('click', openSettingsModal);
  els.helpBtn.addEventListener('click', () => {
    setHelpOpen(els.prompt.hidden);
  });
  els.cancelSettingsBtn.addEventListener('click', closeSettingsModal);
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
  els.settingsForm.addEventListener('change', syncSettingsFormHints);

  window.addEventListener('resize', () => {
    if (cards.length > 0) layoutBoard();
  });
}

function init() {
  settings = parseSettingsFromUrl();
  bindEvents();
  startRound();
}

init();
