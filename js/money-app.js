import {
  parseSettingsFromUrl,
  settingsToUrl,
  readSettingsFromForm,
  applySettingsToForm,
} from './money-settings.js';
import { generateQuestion, generateCentChoices } from './money-generator.js';
import {
  getScore,
  incrementScore,
  getWrong,
  incrementWrong,
  resetSession,
  getOrCreateStartedAt,
} from './money-storage.js';

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
};

let settings = parseSettingsFromUrl();
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

  if (correct) {
    incrementScore();
    showFeedback('Great job!', 'correct');
  } else {
    incrementWrong();
    showFeedback(wrongMessage(currentQuestion), 'incorrect');
  }
  updateScoreDisplay();

  advanceTimeout = setTimeout(() => {
    showQuestion();
  }, correct ? 3300 : 1100);
}

function onSubmitTyped() {
  checkAnswer(els.answerInput.value);
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

function onSettingsSubmit(event) {
  event.preventDefault();

  const { settings: next, error } = readSettingsFromForm(els.settingsForm);
  if (error) {
    els.settingsError.hidden = false;
    els.settingsError.textContent = error;
    return;
  }

  resetSession();
  const url = settingsToUrl(next);
  window.location.assign(url);
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
  settings = parseSettingsFromUrl();
  updateScoreDisplay();
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
