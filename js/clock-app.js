import { cheer } from './profile.js';
import {
  parseSettingsFromUrl,
  settingsToUrl,
  readSettingsFromForm,
  applySettingsToForm,
  buildLevelSettings,
  isLevelMode,
} from './clock-settings.js';
import { CLOCK_LEVELS } from './clock-levels.js';
import { LEVEL_UP_TARGET } from './levels.js';
import { createLadder, createLevelStore } from './level-progress.js';
import {
  generateQuestion,
  generateChoices,
  normalizeTypedAnswer,
} from './clock-generator.js';
import {
  getScore,
  incrementScore,
  getWrong,
  incrementWrong,
  resetSession,
  getOrCreateStartedAt,
} from './clock-storage.js';
import { commitSettingsChange } from './apply-settings.js';
import { recordCorrect, recordWrong, withStreakFire, isHotStreak } from './streak.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CX = 100;
const CY = 100;

const els = {
  timerWrap: document.getElementById('timerWrap'),
  timer: document.getElementById('timer'),
  score: document.getElementById('score'),
  wrongWrap: document.getElementById('wrongWrap'),
  wrongScore: document.getElementById('wrongScore'),
  settingsBtn: document.getElementById('settingsBtn'),
  clockDisplay: document.getElementById('clockDisplay'),
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
  levels: CLOCK_LEVELS,
  target: LEVEL_UP_TARGET,
  store: createLevelStore('clock'),
});

let settings = parseSettingsFromUrl(window.location.search, ladder.saved());
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

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value));
  }
  return el;
}

/**
 * Build an analog clock SVG for the given hours (1–12 or 0–23) and minutes.
 */
function renderAnalogClock(hours, minutes) {
  const svg = svgEl('svg', {
    class: 'clock-face',
    viewBox: '0 0 200 200',
    role: 'img',
    'aria-label': `Analog clock showing ${currentQuestion.answerText}`,
  });

  svg.appendChild(
    svgEl('circle', {
      class: 'clock-face-ring',
      cx: CX,
      cy: CY,
      r: 92,
    }),
  );

  // Hour ticks and numbers
  for (let i = 1; i <= 12; i += 1) {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const outerR = 88;
    const innerR = 78;
    const x1 = CX + Math.cos(angle) * outerR;
    const y1 = CY + Math.sin(angle) * outerR;
    const x2 = CX + Math.cos(angle) * innerR;
    const y2 = CY + Math.sin(angle) * innerR;
    svg.appendChild(
      svgEl('line', {
        class: 'clock-tick',
        x1,
        y1,
        x2,
        y2,
      }),
    );

    const numR = 64;
    const tx = CX + Math.cos(angle) * numR;
    const ty = CY + Math.sin(angle) * numR;
    const text = svgEl('text', {
      class: 'clock-number',
      x: tx,
      y: ty,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
    });
    text.textContent = String(i);
    svg.appendChild(text);
  }

  const hourAngle = (hours % 12) * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6;

  const hourHand = svgEl('line', {
    class: 'clock-hand clock-hand-hour',
    x1: CX,
    y1: CY,
    x2: CX,
    y2: CY - 45,
    transform: `rotate(${hourAngle}, ${CX}, ${CY})`,
  });
  const minuteHand = svgEl('line', {
    class: 'clock-hand clock-hand-minute',
    x1: CX,
    y1: CY,
    x2: CX,
    y2: CY - 68,
    transform: `rotate(${minuteAngle}, ${CX}, ${CY})`,
  });

  svg.appendChild(hourHand);
  svg.appendChild(minuteHand);
  svg.appendChild(
    svgEl('circle', {
      class: 'clock-center',
      cx: CX,
      cy: CY,
      r: 5,
    }),
  );

  return svg;
}

function renderDigitalClock(displayText) {
  const el = document.createElement('div');
  el.className = 'clock-digital';
  el.textContent = displayText;
  el.setAttribute('aria-label', `Digital clock showing ${displayText}`);
  return el;
}

function renderClock(question) {
  els.clockDisplay.innerHTML = '';
  if (question.face === 'digital') {
    els.clockDisplay.appendChild(renderDigitalClock(question.displayText));
  } else {
    els.clockDisplay.appendChild(renderAnalogClock(question.hours, question.minutes));
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
  els.answerInput.focus();
}

function renderChoiceMode(question) {
  els.typedAnswer.hidden = true;
  els.choices.hidden = false;
  els.choices.innerHTML = '';
  selectedChoice = null;

  const options = generateChoices(question.hours, question.minutes, settings);
  for (const value of options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice-btn';
    btn.textContent = value;
    btn.dataset.value = value;
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
  currentQuestion = generateQuestion(settings);
  renderClock(currentQuestion);

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

  const normalized =
    typeof rawValue === 'string' && settings.input === 'multichoice'
      ? String(rawValue).trim()
      : normalizeTypedAnswer(rawValue, settings.format);

  if (normalized == null) {
    showFeedback('Enter a time like 3:30.', 'incorrect');
    return;
  }

  lockInputs();

  const correct = normalized === currentQuestion.answerText;

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
    showFeedback(`Try again — the answer was ${currentQuestion.answerText}.`, 'incorrect');
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
  showQuestion();
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
  els.answerInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmitTyped();
    }
  });
}

function init() {
  settings = clampToUnlocked(parseSettingsFromUrl(window.location.search, ladder.saved()));
  populateLevelSelect();
  if (isLevelMode(settings)) {
    history.replaceState(null, '', settingsToUrl(settings));
  }
  updateScoreDisplay();
  updateLevelDisplay();
  startTimer();
  bindEvents();
  showQuestion();
}

init();
