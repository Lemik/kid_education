import { cheer } from './profile.js';
import {
  parseSettingsFromUrl,
  settingsToUrl,
  readSettingsFromForm,
  applySettingsToForm,
  buildLevelSettings,
  isLevelMode,
} from './money-settings.js';
import { MONEY_LEVELS } from './money-levels.js';
import { LEVEL_UP_TARGET } from './levels.js';
import { createLadder, createLevelStore } from './level-progress.js';
import { generateQuestion, generateCentChoices } from './money-generator.js';
import {
  getScore,
  incrementScore,
  getWrong,
  incrementWrong,
  resetSession,
  getOrCreateStartedAt,
} from './money-storage.js';
import { commitSettingsChange } from './apply-settings.js';
import { recordCorrect, recordWrong, withStreakFire, isHotStreak } from './streak.js';

const els = {
  timerWrap: document.getElementById('timerWrap'),
  timer: document.getElementById('timer'),
  score: document.getElementById('score'),
  wrongWrap: document.getElementById('wrongWrap'),
  wrongScore: document.getElementById('wrongScore'),
  settingsBtn: document.getElementById('settingsBtn'),
  question: document.getElementById('moneyQuestion'),
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
  levels: MONEY_LEVELS,
  target: LEVEL_UP_TARGET,
  store: createLevelStore('money'),
});

let settings = parseSettingsFromUrl(window.location.search, ladder.saved());
let coinCatalog = null;
let catalogById = {};
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

function formatCents(cents) {
  return `${cents}¢`;
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

function createCoinImg(coinId) {
  const def = catalogById[coinId];
  const size = def.size || 56;
  const img = document.createElement('img');
  img.className = 'coin-img';
  img.src = def.image;
  img.alt = def.label;
  img.width = size;
  img.height = size;
  img.draggable = false;
  return img;
}

function createCoinGroup(coins) {
  const group = document.createElement('div');
  group.className = 'money-group';
  for (const coin of coins) {
    for (let i = 0; i < coin.count; i += 1) {
      group.appendChild(createCoinImg(coin.id));
    }
  }
  return group;
}

function renderQuestion(question) {
  els.question.innerHTML = '';
  els.question.className = 'money-question';

  const prompt = document.createElement('p');
  prompt.className = 'money-prompt';
  prompt.textContent = question.prompt;
  els.question.appendChild(prompt);

  if (question.type === 'equation') {
    const equation = document.createElement('p');
    equation.className = 'money-equation-text';
    equation.textContent = question.display;
    els.question.appendChild(equation);
    els.question.appendChild(createCoinGroup(question.coins));
    return;
  }

  if (question.type === 'compare') {
    const compare = document.createElement('div');
    compare.className = 'money-compare';

    for (const side of [
      { key: 'A', coins: question.groupA },
      { key: 'B', coins: question.groupB },
    ]) {
      const panel = document.createElement('div');
      panel.className = 'money-compare-panel';

      const label = document.createElement('span');
      label.className = 'money-group-label';
      label.textContent = side.key;
      panel.appendChild(label);
      panel.appendChild(createCoinGroup(side.coins));
      compare.appendChild(panel);
    }

    els.question.appendChild(compare);
    return;
  }

  // count
  els.question.appendChild(createCoinGroup(question.coins));
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

function renderChoiceButtons(options, { labelFn = String, valueFn = (v) => v } = {}) {
  els.typedAnswer.hidden = true;
  els.choices.hidden = false;
  els.choices.innerHTML = '';
  selectedChoice = null;

  for (const option of options) {
    const value = valueFn(option);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice-btn';
    btn.textContent = labelFn(option);
    btn.dataset.value = String(value);
    btn.addEventListener('click', () => onChoiceSelected(btn, value));
    els.choices.appendChild(btn);
  }
}

function renderCentChoiceMode(answer) {
  renderChoiceButtons(generateCentChoices(answer), {
    labelFn: (cents) => formatCents(cents),
    valueFn: (cents) => cents,
  });
}

function renderCompareChoiceMode() {
  renderChoiceButtons(
    [
      { label: 'A', value: 'A' },
      { label: 'B', value: 'B' },
      { label: 'Same', value: 'same' },
    ],
    {
      labelFn: (opt) => opt.label,
      valueFn: (opt) => opt.value,
    },
  );
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
  currentQuestion = generateQuestion(settings, coinCatalog);
  renderQuestion(currentQuestion);

  if (currentQuestion.type === 'compare') {
    renderCompareChoiceMode();
  } else if (settings.input === 'multichoice') {
    renderCentChoiceMode(currentQuestion.answer);
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

function answersMatch(rawValue, question) {
  if (question.type === 'compare') {
    const normalized = String(rawValue).trim().toLowerCase();
    if (normalized === 'same' || normalized === 'equal' || normalized === '=') {
      return question.answer === 'same';
    }
    if (normalized === 'a') return question.answer === 'A';
    if (normalized === 'b') return question.answer === 'B';
    return String(rawValue) === question.answer;
  }

  const value = typeof rawValue === 'number' ? rawValue : Number(String(rawValue).trim());
  return Number.isFinite(value) && value === question.answer;
}

function wrongMessage(question) {
  if (question.type === 'compare') {
    return `Try again — A was ${formatCents(question.totals.A)}, B was ${formatCents(question.totals.B)}.`;
  }
  return `Try again — the answer was ${formatCents(question.answer)}.`;
}

function checkAnswer(rawValue) {
  if (!acceptingAnswers || !currentQuestion) return;

  if (currentQuestion.type !== 'compare') {
    const value = typeof rawValue === 'number' ? rawValue : Number(String(rawValue).trim());
    if (!Number.isFinite(value)) {
      showFeedback('Enter a number.', 'incorrect');
      return;
    }
  }

  lockInputs();

  const correct = answersMatch(rawValue, currentQuestion);

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
    showFeedback(wrongMessage(currentQuestion), 'incorrect');
  }
  updateScoreDisplay();
  updateLevelDisplay();

  let delay = correct ? 3300 : 1100;
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
  if (coinCatalog) showQuestion();
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
    const response = await fetch('../data/money.json');
    if (!response.ok) {
      throw new Error(`Failed to load money.json (${response.status})`);
    }
    const data = await response.json();
    coinCatalog = data.coins;
    catalogById = Object.fromEntries(coinCatalog.map((coin) => [coin.id, coin]));
    showQuestion();
  } catch (error) {
    els.question.textContent = 'Could not load coin data.';
    showFeedback(String(error.message || error), 'incorrect');
  }
}

init();
