import {
  parseSettingsFromUrl,
  settingsToUrl,
  readSettingsFromForm,
  applySettingsToForm,
} from './settings.js';
import { generateQuestion, generateChoices, generateOpChoices, OP_SYMBOLS } from './generator.js';
import {
  getScore,
  incrementScore,
  getWrong,
  incrementWrong,
  resetSession,
  getOrCreateStartedAt,
} from './storage.js';
import { commitSettingsChange } from './apply-settings.js';

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
  standardModeFields: document.getElementById('standardModeFields'),
  timesTableHint: document.getElementById('timesTableHint'),
};

let settings = parseSettingsFromUrl();
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
  // "Show results: both" also displays the incorrect-answer count.
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

function renderTypedMode(question) {
  els.typedAnswer.hidden = false;
  els.choices.hidden = true;
  els.choices.innerHTML = '';
  els.answerInput.value = '';
  els.answerInput.disabled = false;
  els.submitBtn.disabled = false;
  selectedChoice = null;

  if (question.missing === 'op') {
    els.answerInput.type = 'text';
    els.answerInput.inputMode = 'text';
    els.answerInput.placeholder = '?';
  } else {
    els.answerInput.type = 'number';
    els.answerInput.inputMode = 'numeric';
    els.answerInput.placeholder = '?';
  }

  els.answerInput.focus();
}

function renderChoiceMode(question) {
  els.typedAnswer.hidden = true;
  els.choices.hidden = false;
  els.choices.innerHTML = '';
  selectedChoice = null;

  const isOp = question.missing === 'op';
  const options = isOp
    ? generateOpChoices(question.answer, settings.op)
    : generateChoices(question.answer);

  for (const value of options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice-btn';
    btn.textContent = isOp ? OP_SYMBOLS[value] : String(value);
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

  // Auto-submit on selection for a smoother kid flow.
  checkAnswer(value);
}

function renderEquation(question) {
  if (settings.layout !== 'column') {
    // Restore the answer area to its normal spot before wiping equation content.
    els.feedback.before(els.answerArea);
    els.equation.className = 'equation equation-side';
    els.equation.textContent = question.display;
    els.equation.removeAttribute('aria-label');
    return;
  }

  const topNumber = document.createElement('span');
  topNumber.className = 'column-number';
  topNumber.textContent = question.missing === 'a' ? '?' : String(question.a);

  const bottomRow = document.createElement('span');
  bottomRow.className = 'column-row';

  const operator = document.createElement('span');
  operator.className = 'column-operator';
  operator.textContent = question.missing === 'op' ? '?' : OP_SYMBOLS[question.op];

  const bottomNumber = document.createElement('span');
  bottomNumber.className = 'column-number';
  bottomNumber.textContent = question.missing === 'b' ? '?' : String(question.b);

  const line = document.createElement('span');
  line.className = 'column-line';
  line.setAttribute('aria-hidden', 'true');

  // Answer input/choices live directly under the line, like written arithmetic.
  const answerSlot = document.createElement('span');
  answerSlot.className = 'column-answer-slot';
  answerSlot.appendChild(els.answerArea);

  bottomRow.append(operator, bottomNumber);
  els.equation.className = 'equation equation-column';
  els.equation.replaceChildren(topNumber, bottomRow, line, answerSlot);
  els.equation.setAttribute('aria-label', question.display);
}

function showQuestion() {
  clearAdvanceTimeout();
  clearFeedback();
  acceptingAnswers = true;
  currentQuestion = generateQuestion(settings);
  renderEquation(currentQuestion);

  if (settings.input === 'multichoice') {
    renderChoiceMode(currentQuestion);
  } else {
    renderTypedMode(currentQuestion);
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

const OP_INPUT_ALIASES = {
  '+': '+',
  '-': '-',
  '−': '-',
  '*': '*',
  '×': '*',
  x: '*',
  X: '*',
  '/': '/',
  '÷': '/',
};

function normalizeOpInput(raw) {
  const trimmed = String(raw).trim();
  return OP_INPUT_ALIASES[trimmed] ?? null;
}

function formatAnswerForFeedback(answer, missing) {
  if (missing === 'op') return OP_SYMBOLS[answer] ?? String(answer);
  return String(answer);
}

function checkAnswer(rawValue) {
  if (!acceptingAnswers || !currentQuestion) return;

  const isOp = currentQuestion.missing === 'op';
  let value;
  let correct;

  if (isOp) {
    // Multichoice passes the raw op code ('+', '-', ...); typed input may use symbols.
    if (typeof rawValue === 'string' && ['+', '-', '*', '/'].includes(rawValue)) {
      value = rawValue;
    } else {
      value = normalizeOpInput(rawValue);
    }
    if (value == null) {
      showFeedback('Enter +, −, ×, or ÷.', 'incorrect');
      return;
    }
    correct = value === currentQuestion.answer;
  } else {
    value = typeof rawValue === 'number' ? rawValue : Number(String(rawValue).trim());
    if (!Number.isFinite(value)) {
      showFeedback('Enter a number.', 'incorrect');
      return;
    }
    correct = value === currentQuestion.answer;
  }

  lockInputs();

  if (correct) {
    incrementScore();
    showFeedback('Great job!', 'correct');
  } else {
    incrementWrong();
    const shown = formatAnswerForFeedback(currentQuestion.answer, currentQuestion.missing);
    showFeedback(`Try again — the answer was ${shown}.`, 'incorrect');
  }
  updateScoreDisplay();

  advanceTimeout = setTimeout(() => {
    showQuestion();
  }, correct ? 1100 : 3100);
}

function onSubmitTyped() {
  checkAnswer(els.answerInput.value);
}

function openSettingsModal() {
  applySettingsToForm(els.settingsForm, settings);
  updateModeFieldLock();
  els.settingsError.hidden = true;
  els.settingsError.textContent = '';
  els.settingsModal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeSettingsModal() {
  els.settingsModal.hidden = true;
  document.body.classList.remove('modal-open');
}

function updateModeFieldLock() {
  const modeValue = els.settingsForm.querySelector('input[name="mode"]:checked')?.value;
  const timesTable = modeValue === 'times-table';
  if (els.standardModeFields) {
    els.standardModeFields.hidden = timesTable;
  }
  if (els.timesTableHint) {
    els.timesTableHint.hidden = !timesTable;
  }
}

function applyNewSettings(next) {
  clearAdvanceTimeout();
  stopTimer();
  settings = next;
  updateScoreDisplay();
  startTimer();
  showQuestion();
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
    radio.addEventListener('change', updateModeFieldLock);
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
  settings = parseSettingsFromUrl();
  updateScoreDisplay();
  startTimer();
  bindEvents();
  showQuestion();
}

init();
