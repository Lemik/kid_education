import { cheer } from './profile.js';
import {
  parseSettingsFromUrl,
  settingsToUrl,
  readSettingsFromForm,
  applySettingsToForm,
  pairsForSystem,
  buildLevelSettings,
  isLevelMode,
} from './measure-settings.js';
import { MEASURE_LEVELS } from './measure-levels.js';
import { LEVEL_UP_TARGET } from './levels.js';
import { createLadder, createLevelStore } from './level-progress.js';
import { generateQuestion, generateMeasureChoices } from './measure-generator.js';
import {
  getScore,
  incrementScore,
  getWrong,
  incrementWrong,
  resetSession,
  getOrCreateStartedAt,
} from './measure-storage.js';
import { commitSettingsChange } from './apply-settings.js';
import { recordCorrect, recordWrong, withStreakFire, isHotStreak } from './streak.js';

const els = {
  timerWrap: document.getElementById('timerWrap'),
  timer: document.getElementById('timer'),
  score: document.getElementById('score'),
  wrongWrap: document.getElementById('wrongWrap'),
  wrongScore: document.getElementById('wrongScore'),
  settingsBtn: document.getElementById('settingsBtn'),
  equation: document.getElementById('equation'),
  answerArea: document.getElementById('answerArea'),
  typedAnswer: document.getElementById('typedAnswer'),
  answerInput: document.getElementById('answerInput'),
  submitBtn: document.getElementById('submitBtn'),
  choices: document.getElementById('choices'),
  feedback: document.getElementById('feedback'),
  settingsModal: document.getElementById('settingsModal'),
  settingsForm: document.getElementById('settingsForm'),
  settingsError: document.getElementById('settingsError'),
  cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
  metricPairs: document.getElementById('metricPairs'),
  usPairs: document.getElementById('usPairs'),
  timePairs: document.getElementById('timePairs'),
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
  levels: MEASURE_LEVELS,
  target: LEVEL_UP_TARGET,
  store: createLevelStore('measure'),
});

let settings = parseSettingsFromUrl(window.location.search, ladder.saved());
let unitsData = null;
let currentQuestion = null;
let selectedChoice = null;
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

function correctAnswerEl() {
  return els.choices.querySelector('.choice-btn.selected') ?? els.answerInput;
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

function renderTypedMode() {
  els.typedAnswer.hidden = false;
  els.choices.hidden = true;
  els.choices.innerHTML = '';
  els.answerInput.value = '';
  els.answerInput.disabled = false;
  els.submitBtn.disabled = false;
  selectedChoice = null;
  els.answerInput.type = 'number';
  els.answerInput.inputMode = 'numeric';
  els.answerInput.placeholder = '?';
  els.answerInput.focus();
}

function renderChoiceMode(question) {
  els.typedAnswer.hidden = true;
  els.choices.hidden = false;
  els.choices.innerHTML = '';
  selectedChoice = null;

  const options = generateMeasureChoices(
    question.answer,
    question.factor,
    question.direction,
    question.amount,
  );

  for (const value of options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice-btn';
    btn.textContent = String(value);
    btn.dataset.value = String(value);
    btn.addEventListener('click', () => onChoiceSelected(btn, value));
    els.choices.appendChild(btn);
  }
}

function onChoiceSelected(btn, value) {
  if (!acceptingAnswers) return;

  selectedChoice = value;
  for (const child of els.choices.querySelectorAll('.choice-btn')) {
    child.classList.toggle('selected', child === btn);
  }

  checkAnswer(value);
}

function showQuestion() {
  clearAdvanceTimeout();
  clearFeedback();
  acceptingAnswers = true;
  currentQuestion = generateQuestion(settings, unitsData);
  els.equation.textContent = currentQuestion.display;

  if (settings.input === 'multichoice') {
    renderChoiceMode(currentQuestion);
  } else {
    renderTypedMode();
  }
}

function lockInputs() {
  acceptingAnswers = false;
  els.answerInput.disabled = true;
  els.submitBtn.disabled = true;
  for (const btn of els.choices.querySelectorAll('.choice-btn')) {
    btn.disabled = true;
  }
}

function checkAnswer(rawValue) {
  if (!acceptingAnswers || !currentQuestion) return;

  const value = typeof rawValue === 'number' ? rawValue : Number(String(rawValue).trim());
  if (!Number.isFinite(value)) {
    showFeedback('Enter a number.', 'incorrect');
    return;
  }

  const correct = value === currentQuestion.answer;
  lockInputs();

  let levelMessage = null;
  if (correct) {
    incrementScore();
    const streak = recordCorrect();
    if (isLevelMode(settings)) {
      ladder.pay({ level: settings.level, streak, fromEl: correctAnswerEl() });
    }
    levelMessage = recordLevelCorrect();
    if (levelMessage) {
      showFeedback(levelMessage, 'correct level-up');
    } else {
      showFeedback(withStreakFire('Great job!'), isHotStreak() ? 'correct streak-hot' : 'correct');
    }
  } else {
    incrementWrong();
    recordWrong();
    if (isLevelMode(settings)) ladder.recordMiss(settings.level);
    showFeedback(`Try again — the answer was ${currentQuestion.answer}.`, 'incorrect');
  }
  updateScoreDisplay();
  updateLevelDisplay();

  let delay = correct ? 1100 : 3100;
  if (levelMessage) delay = 2600;
  advanceTimeout = setTimeout(() => {
    showQuestion();
  }, delay);
}

function onSubmitTyped() {
  checkAnswer(els.answerInput.value);
}

/**
 * Show/hide pair checkbox groups based on selected system,
 * and uncheck pairs that are not available for that system.
 */
function updatePairVisibility() {
  const sysValue = els.settingsForm.querySelector('input[name="sys"]:checked')?.value ?? 'metric';
  const allowed = new Set(pairsForSystem(sysValue));

  if (els.metricPairs) {
    els.metricPairs.hidden = sysValue === 'us' || sysValue === 'time';
  }
  if (els.usPairs) {
    els.usPairs.hidden = sysValue === 'metric' || sysValue === 'time';
  }
  if (els.timePairs) {
    els.timePairs.hidden = sysValue === 'metric' || sysValue === 'us';
  }

  for (const checkbox of els.settingsForm.querySelectorAll('input[name="pairs"]')) {
    const available = allowed.has(checkbox.value);
    checkbox.disabled = !available;
    if (!available) {
      checkbox.checked = false;
    } else if (!els.settingsForm.querySelector('input[name="pairs"]:checked')) {
      // keep existing checked state when switching into a system
    }
  }
}

function openSettingsModal() {
  populateLevelSelect();
  applySettingsToForm(els.settingsForm, settings, ladder.saved());
  updatePairVisibility();
  // Re-apply checks after visibility (disabled pairs were cleared)
  applySettingsToForm(els.settingsForm, settings, ladder.saved());
  updatePairVisibility();
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
  if (unitsData) showQuestion();
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

  for (const radio of els.settingsForm.querySelectorAll('input[name="sys"]')) {
    radio.addEventListener('change', () => {
      updatePairVisibility();
      // When switching system, check all available pairs by default
      const sysValue = els.settingsForm.querySelector('input[name="sys"]:checked')?.value;
      const allowed = new Set(pairsForSystem(sysValue));
      for (const checkbox of els.settingsForm.querySelectorAll('input[name="pairs"]')) {
        if (allowed.has(checkbox.value)) {
          checkbox.checked = true;
        }
      }
    });
  }

  for (const radio of els.settingsForm.querySelectorAll('input[name="mode"]')) {
    radio.addEventListener('change', updateModeFields);
  }

  els.settingsForm.addEventListener('submit', onSettingsSubmit);
  els.submitBtn.addEventListener('click', onSubmitTyped);
  els.answerInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmitTyped();
    }
  });
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
    const response = await fetch('../data/units.json');
    if (!response.ok) throw new Error(`Failed to load units: ${response.status}`);
    unitsData = await response.json();
  } catch (err) {
    els.equation.textContent = 'Could not load unit data.';
    console.error(err);
    return;
  }

  showQuestion();
}

init();
