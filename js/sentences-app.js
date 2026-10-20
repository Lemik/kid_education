import { cheer } from './profile.js';
import {
  parseSettingsFromUrl,
  settingsToUrl,
  readSettingsFromForm,
  applySettingsToForm,
  buildLevelSettings,
  isLevelMode,
} from './sentences-settings.js';
import { SENTENCES_LEVELS } from './sentences-levels.js';
import { LEVEL_UP_TARGET } from './levels.js';
import { createLadder, createLevelStore } from './level-progress.js';
import { generateQuestion } from './sentences-generator.js';
import {
  getScore,
  incrementScore,
  getWrong,
  incrementWrong,
  resetSession,
  getOrCreateStartedAt,
} from './sentences-storage.js';
import { commitSettingsChange } from './apply-settings.js';
import { recordCorrect, recordWrong, withStreakFire, isHotStreak } from './streak.js';

const els = {
  timerWrap: document.getElementById('timerWrap'),
  timer: document.getElementById('timer'),
  score: document.getElementById('score'),
  wrongWrap: document.getElementById('wrongWrap'),
  wrongScore: document.getElementById('wrongScore'),
  settingsBtn: document.getElementById('settingsBtn'),
  sentenceDisplay: document.getElementById('sentenceDisplay'),
  answerArea: document.getElementById('answerArea'),
  typedAnswer: document.getElementById('typedAnswer'),
  wordInput: document.getElementById('wordInput'),
  submitBtn: document.getElementById('submitBtn'),
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
  levels: SENTENCES_LEVELS,
  target: LEVEL_UP_TARGET,
  store: createLevelStore('sentences'),
});

let settings = parseSettingsFromUrl(window.location.search, ladder.saved());
let wordList = null;
let templates = [];
let currentQuestion = null;
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
    `Moves up a level after ${LEVEL_UP_TARGET} correct answers in a row. ` +
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

function renderSentenceDisplay() {
  els.sentenceDisplay.replaceChildren();
  els.sentenceDisplay.className = 'sentence-display';
  els.sentenceDisplay.setAttribute(
    'aria-label',
    `Fill in the blank: ${currentQuestion.before}blank${currentQuestion.after}`,
  );

  const before = document.createElement('span');
  before.className = 'sentence-text';
  before.textContent = currentQuestion.before;

  const blank = document.createElement('span');
  blank.className = 'sentence-blank';
  blank.setAttribute('aria-hidden', 'true');
  blank.textContent = '___';

  const after = document.createElement('span');
  after.className = 'sentence-text';
  after.textContent = currentQuestion.after;

  els.sentenceDisplay.append(before, blank, after);
}

function clearChoiceButtons() {
  const existing = els.answerArea.querySelector('.sentence-choices');
  if (existing) existing.remove();
}

function renderChoices() {
  clearChoiceButtons();

  const choices = document.createElement('div');
  choices.className = 'sentence-choices';
  choices.setAttribute('role', 'group');
  choices.setAttribute('aria-label', 'Word choices');

  for (const word of currentQuestion.choices ?? []) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice-btn sentence-choice-btn';
    btn.textContent = word;
    btn.dataset.value = word;
    btn.disabled = !acceptingAnswers;
    btn.addEventListener('click', () => onWordChoice(word, btn));
    choices.appendChild(btn);
  }

  els.answerArea.insertBefore(choices, els.typedAnswer);
}

function updateSubmitEnabled() {
  if (settings.input !== 'answer') return;
  const value = els.wordInput.value.trim();
  els.submitBtn.disabled = !acceptingAnswers || value.length === 0;
}

function showQuestion() {
  clearAdvanceTimeout();
  clearFeedback();
  clearChoiceButtons();
  acceptingAnswers = true;
  currentQuestion = generateQuestion(settings, wordList, templates);
  renderSentenceDisplay();

  if (settings.input === 'answer') {
    els.typedAnswer.hidden = false;
    els.wordInput.value = '';
    els.wordInput.disabled = false;
    els.wordInput.maxLength = Math.max(6, currentQuestion.answer.length + 2);
    updateSubmitEnabled();
    els.wordInput.focus();
  } else {
    els.typedAnswer.hidden = true;
    renderChoices();
  }
}

function lockInputs() {
  acceptingAnswers = false;
  els.submitBtn.disabled = true;
  els.wordInput.disabled = true;
  for (const btn of els.answerArea.querySelectorAll('.sentence-choice-btn')) {
    btn.disabled = true;
  }
}

function checkAnswer(guess, fromEl = els.wordInput) {
  if (!acceptingAnswers || !currentQuestion) return;

  const normalized = String(guess ?? '').trim().toLowerCase();
  if (!normalized) {
    showFeedback('Type a word.', 'incorrect');
    return;
  }

  lockInputs();

  // Any word that makes sense in the sentence counts as correct.
  const correct =
    normalized === currentQuestion.answer ||
    (currentQuestion.validWords ?? []).includes(normalized);

  let levelMessage = null;
  if (correct) {
    incrementScore();
    const streak = recordCorrect();
    if (isLevelMode(settings)) {
      ladder.pay({ level: settings.level, streak, fromEl });
    }
    levelMessage = recordLevelCorrect();
    if (levelMessage) {
      showFeedback(levelMessage, 'correct level-up');
    } else {
      showFeedback(withStreakFire(`Correct! ${normalized}`), isHotStreak() ? 'correct streak-hot' : 'correct');
    }
  } else {
    incrementWrong();
    recordWrong();
    if (isLevelMode(settings)) ladder.recordMiss(settings.level);
    showFeedback(`You could say: ${currentQuestion.answer}`, 'incorrect');
  }
  updateScoreDisplay();
  updateLevelDisplay();

  let delay = correct ? 1100 : 3100;
  if (levelMessage) delay = 2600;
  advanceTimeout = setTimeout(() => {
    showQuestion();
  }, delay);
}

function onWordChoice(word, btn) {
  if (!acceptingAnswers) return;

  for (const child of els.answerArea.querySelectorAll('.sentence-choice-btn')) {
    child.classList.toggle('selected', child === btn);
  }

  checkAnswer(word, btn);
}

function onSubmitTyped() {
  checkAnswer(els.wordInput.value);
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
  els.submitBtn.addEventListener('click', onSubmitTyped);

  els.wordInput.addEventListener('input', () => {
    updateSubmitEnabled();
  });

  els.wordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmitTyped();
    }
  });
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path} (${response.status})`);
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
    const [words, sentencesData] = await Promise.all([
      loadJson('../data/words.json'),
      loadJson('../data/sentences.json'),
    ]);
    wordList = words;
    templates = Array.isArray(sentencesData.templates) ? sentencesData.templates : [];
    showQuestion();
  } catch {
    els.sentenceDisplay.textContent = 'Could not load sentences.';
    showFeedback('Refresh the page to try again.', 'incorrect');
  }
}

init();
