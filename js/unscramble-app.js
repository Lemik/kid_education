import { cheer } from './profile.js';
import {
  parseSettingsFromUrl,
  settingsToUrl,
  readSettingsFromForm,
  applySettingsToForm,
  buildLevelSettings,
  isLevelMode,
} from './unscramble-settings.js';
import { UNSCRAMBLE_LEVELS } from './unscramble-levels.js';
import { LEVEL_UP_TARGET } from './levels.js';
import { createLadder, createLevelStore } from './level-progress.js';
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
import { recordCorrect, recordWrong, withStreakFire, isHotStreak } from './streak.js';

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
  levelFields: document.getElementById('levelFields'),
  levelSelect: document.getElementById('settingLevel'),
  levelHint: document.getElementById('levelHint'),
  customFields: document.getElementById('customFields'),
  levelWrap: document.getElementById('levelWrap'),
  levelValue: document.getElementById('levelValue'),
  levelProgress: document.getElementById('levelProgress'),
  levelLabel: document.getElementById('levelLabel'),
};

const ladder = createLadder({
  levels: UNSCRAMBLE_LEVELS,
  target: LEVEL_UP_TARGET,
  store: createLevelStore('unscramble'),
});

let settings = parseSettingsFromUrl(window.location.search, ladder.saved());
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

function updateLevelDisplay() {
  ladder.render(
    { wrap: els.levelWrap, value: els.levelValue, progress: els.levelProgress, label: els.levelLabel },
    settings.level,
    isLevelMode(settings),
  );
}

/** Use the chosen level. Any level on the ladder can be played. */
function clampToUnlocked(next) {
  if (!isLevelMode(next)) return next;
  const level = ladder.resolve(next.level);
  return level === next.level ? next : buildLevelSettings(level, next);
}

/** Count a correct answer toward the next level; returns a message on level-up. */
function recordLevelCorrect() {
  if (!isLevelMode(settings)) return null;
  const result = ladder.recordWin(settings.level);
  if (!result) return null;
  if (result.mastered) return cheer(`You mastered the top level — ${settings.label}!`);

  settings = buildLevelSettings(result.next, settings);
  history.replaceState(null, '', settingsToUrl(settings));
  return cheer(`Level up! Level ${settings.level} — ${settings.label}`);
}

function populateLevelSelect() {
  ladder.fillSelect(els.levelSelect);
  els.levelHint.textContent =
    `Moves up a level after ${LEVEL_UP_TARGET} correct words in a row. ` +
    'Finished levels show a check. Playing a finished level again does not earn coins.';
}

function updateModeFields() {
  const levelMode = els.settingsForm.querySelector('input[name="mode"]:checked')?.value === 'level';
  els.levelFields.hidden = !levelMode;
  els.customFields.hidden = levelMode;
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
    checkAnswer(els.letterPool.querySelector(`.unscramble-tile[data-id="${letterId}"]`));
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

function checkAnswer(fromEl = null) {
  if (!acceptingAnswers || !currentQuestion) return;
  if (!allSlotsFilled()) return;

  lockInputs();

  const correct = builtWord() === currentQuestion.word;

  let levelMessage = null;
  if (correct) {
    incrementScore();
    const streak = recordCorrect();
    if (isLevelMode(settings)) {
      ladder.pay({ level: settings.level, streak, fromEl: fromEl ?? els.answerSlots });
    }
    levelMessage = recordLevelCorrect();
    if (levelMessage) {
      showFeedback(levelMessage, 'correct level-up');
    } else {
      showFeedback(withStreakFire(`Correct! ${currentQuestion.word}`), isHotStreak() ? 'correct streak-hot' : 'correct');
    }
  } else {
    incrementWrong();
    recordWrong();
    if (isLevelMode(settings)) ladder.recordMiss(settings.level);
    showFeedback(`The word was ${currentQuestion.word}`, 'incorrect');
  }
  updateScoreDisplay();
  updateLevelDisplay();

  let delay = correct ? 1100 : 3100;
  if (levelMessage) delay = 2600;
  advanceTimeout = setTimeout(() => {
    showQuestion();
  }, delay);
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
  populateLevelSelect();
  applySettingsToForm(els.settingsForm, settings, ladder.saved());
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

function applyNewSettings(next) {
  clearAdvanceTimeout();
  stopTimer();
  settings = next;
  updateScoreDisplay();
  updateLevelDisplay();
  startTimer();
  if (wordList) showQuestion();
}

function onSettingsSubmit(event) {
  event.preventDefault();

  const { settings: picked, error } = readSettingsFromForm(els.settingsForm);
  if (error) {
    els.settingsError.hidden = false;
    els.settingsError.textContent = error;
    return;
  }

  const next = clampToUnlocked(picked);
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

  for (const radio of els.settingsForm.querySelectorAll('input[name="mode"]')) {
    radio.addEventListener('change', updateModeFields);
  }

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
  settings = clampToUnlocked(parseSettingsFromUrl(window.location.search, ladder.saved()));
  populateLevelSelect();
  if (isLevelMode(settings)) {
    history.replaceState(null, '', settingsToUrl(settings));
  }
  updateScoreDisplay();
  updateLevelDisplay();
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
