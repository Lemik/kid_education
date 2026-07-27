import {
  parseSettingsFromUrl,
  settingsToUrl,
  readSettingsFromForm,
  applySettingsToForm,
} from './unscramble-settings.js';
import { generateQuestion } from './unscramble-generator.js';
import {
  getScore,
  incrementScore,
  getWrong,
  incrementWrong,
  resetSession,
  getOrCreateStartedAt,
} from './unscramble-storage.js';
import { commitSettingsChange } from './apply-settings.js';

const els = {
  timerWrap: document.getElementById('timerWrap'),
  timer: document.getElementById('timer'),
  score: document.getElementById('score'),
  wrongWrap: document.getElementById('wrongWrap'),
  wrongScore: document.getElementById('wrongScore'),
  settingsBtn: document.getElementById('settingsBtn'),
  answerSlots: document.getElementById('answerSlots'),
  letterPool: document.getElementById('letterPool'),
  undoBtn: document.getElementById('undoBtn'),
  feedback: document.getElementById('feedback'),
  settingsModal: document.getElementById('settingsModal'),
  settingsForm: document.getElementById('settingsForm'),
  settingsError: document.getElementById('settingsError'),
  cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
};

let settings = parseSettingsFromUrl();
let wordList = null;
let currentQuestion = null;
/** @type {Array<{ slotIndex: number, letterId: number }>} */
let placements = [];
let acceptingAnswers = true;
let timerInterval = null;
let advanceTimeout = null;

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mmss = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
}

function updateScoreDisplay() {
  els.score.textContent = String(getScore());
  els.wrongScore.textContent = String(getWrong());
  els.wrongWrap.hidden = settings.sign !== 'both';
}

function clearFeedback() {
  els.feedback.textContent = '';
  els.feedback.className = 'feedback';
}

function showFeedback(message, kind) {
  els.feedback.textContent = message;
  els.feedback.className = `feedback ${kind}`;
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
  const startedAt = getOrCreateStartedAt();

  const tick = () => {
    els.timer.textContent = formatElapsed(Date.now() - startedAt);
  };

  tick();
  timerInterval = setInterval(tick, 1000);
}

function clearAdvanceTimeout() {
  if (advanceTimeout != null) {
    clearTimeout(advanceTimeout);
    advanceTimeout = null;
  }
}

function usedIds() {
  return new Set(placements.map((placement) => placement.letterId));
}

function nextEmptySlotIndex() {
  if (!currentQuestion) return null;
  const filled = new Set(placements.map((placement) => placement.slotIndex));
  for (let i = currentQuestion.fixedPrefix; i < currentQuestion.word.length; i += 1) {
    if (!filled.has(i)) return i;
  }
  return null;
}

function allSlotsFilled() {
  if (!currentQuestion) return false;
  const needed = currentQuestion.word.length - currentQuestion.fixedPrefix;
  return placements.length >= needed;
}

function letterById(id) {
  return currentQuestion?.letters.find((letter) => letter.id === id) ?? null;
}

function builtWord() {
  if (!currentQuestion) return '';
  const chars = currentQuestion.word.split('').map((char, index) => {
    if (index < currentQuestion.fixedPrefix) return char;
    const placement = placements.find((item) => item.slotIndex === index);
    if (!placement) return '';
    return letterById(placement.letterId)?.char ?? '';
  });
  return chars.join('');
}

function updateUndoEnabled() {
  els.undoBtn.disabled = !acceptingAnswers || placements.length === 0;
}

function renderAnswerSlots() {
  els.answerSlots.replaceChildren();
  els.answerSlots.className = 'word-display unscramble-answer';
  els.answerSlots.setAttribute('aria-label', 'Answer slots');

  const filledBySlot = new Map(
    placements.map((placement) => [placement.slotIndex, placement.letterId]),
  );

  for (let i = 0; i < currentQuestion.word.length; i += 1) {
    const col = document.createElement('div');
    col.className = 'word-slot';
    col.dataset.index = String(i);

    const letterEl = document.createElement('div');
    const isFixed = i < currentQuestion.fixedPrefix;
    const letterId = filledBySlot.get(i);
    const placedLetter = letterId != null ? letterById(letterId) : null;

    if (isFixed) {
      letterEl.className = 'word-letter';
      letterEl.textContent = currentQuestion.word[i];
    } else if (placedLetter) {
      letterEl.className = 'word-blank word-filled';
      letterEl.textContent = placedLetter.char;
      col.classList.add('unscramble-slot-filled');
      col.addEventListener('click', () => {
        if (!acceptingAnswers) return;
        // Only undo if this is the most recently filled slot.
        const last = placements[placements.length - 1];
        if (last && last.slotIndex === i) {
          onUndo();
        }
      });
    } else {
      letterEl.className = 'word-blank';
      letterEl.textContent = '_';
    }

    col.appendChild(letterEl);
    els.answerSlots.appendChild(col);
  }
}

function renderLetterPool() {
  els.letterPool.replaceChildren();
  const used = usedIds();

  for (const letter of currentQuestion.scrambled) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice-btn unscramble-tile';
    btn.textContent = letter.char;
    btn.dataset.id = String(letter.id);
    const isUsed = used.has(letter.id);
    btn.disabled = !acceptingAnswers || isUsed;
    if (isUsed) {
      btn.classList.add('used');
    }
    btn.addEventListener('click', () => onLetterTap(letter.id));
    els.letterPool.appendChild(btn);
  }
}

function renderQuestion() {
  renderAnswerSlots();
  renderLetterPool();
  updateUndoEnabled();
}

function onLetterTap(letterId) {
  if (!acceptingAnswers || !currentQuestion) return;
  if (usedIds().has(letterId)) return;

  const slotIndex = nextEmptySlotIndex();
  if (slotIndex == null) return;

  placements.push({ slotIndex, letterId });
  renderQuestion();

  if (allSlotsFilled()) {
    checkAnswer();
  }
}

function onUndo() {
  if (!acceptingAnswers || placements.length === 0) return;
  placements.pop();
  clearFeedback();
  renderQuestion();
}

function lockInputs() {
  acceptingAnswers = false;
  els.undoBtn.disabled = true;
  for (const btn of els.letterPool.querySelectorAll('.choice-btn')) {
    btn.disabled = true;
  }
}

function checkAnswer() {
  if (!acceptingAnswers || !currentQuestion) return;
  if (!allSlotsFilled()) return;

  lockInputs();

  const correct = builtWord() === currentQuestion.word;

  if (correct) {
    incrementScore();
    showFeedback(`Correct! ${currentQuestion.word}`, 'correct');
  } else {
    incrementWrong();
    showFeedback(`The word was ${currentQuestion.word}`, 'incorrect');
  }
  updateScoreDisplay();

  advanceTimeout = setTimeout(() => {
    showQuestion();
  }, correct ? 1100 : 3100);
}

function showQuestion() {
  clearAdvanceTimeout();
  clearFeedback();
  acceptingAnswers = true;
  placements = [];
  currentQuestion = generateQuestion(settings, wordList);
  renderQuestion();
}

function openSettingsModal() {
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

function applyNewSettings(next) {
  clearAdvanceTimeout();
  stopTimer();
  settings = next;
  updateScoreDisplay();
  startTimer();
  if (wordList) showQuestion();
}

function onSettingsSubmit(event) {
  event.preventDefault();

  const { settings: next, error } = readSettingsFromForm(els.settingsForm);
  if (error) {
    els.settingsError.hidden = false;
    els.settingsError.textContent = error;
    return;
  }

  commitSettingsChange(next, settingsToUrl, resetSession);
  applyNewSettings(next);
  closeSettingsModal();
}

function bindEvents() {
  els.settingsBtn.addEventListener('click', openSettingsModal);
  els.cancelSettingsBtn.addEventListener('click', closeSettingsModal);
  els.undoBtn.addEventListener('click', onUndo);

  els.settingsModal.addEventListener('click', (event) => {
    if (event.target === els.settingsModal) {
      closeSettingsModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.settingsModal.hidden) {
      closeSettingsModal();
    }
  });

  els.settingsForm.addEventListener('submit', onSettingsSubmit);
}

async function loadWordList() {
  const response = await fetch('../data/words.json');
  if (!response.ok) {
    throw new Error(`Failed to load words (${response.status})`);
  }
  return response.json();
}

async function init() {
  settings = parseSettingsFromUrl();
  updateScoreDisplay();
  startTimer();
  bindEvents();

  try {
    wordList = await loadWordList();
    showQuestion();
  } catch {
    els.answerSlots.textContent = 'Could not load word list.';
    showFeedback('Refresh the page to try again.', 'incorrect');
  }
}

init();
