import {
  parseSettingsFromUrl,
  settingsToUrl,
  readSettingsFromForm,
  applySettingsToForm,
} from './words-settings.js';
import { generateQuestion } from './words-generator.js';
import {
  getScore,
  incrementScore,
  getWrong,
  incrementWrong,
  resetSession,
  getOrCreateStartedAt,
} from './words-storage.js';

const els = {
  timerWrap: document.getElementById('timerWrap'),
  timer: document.getElementById('timer'),
  score: document.getElementById('score'),
  wrongWrap: document.getElementById('wrongWrap'),
  wrongScore: document.getElementById('wrongScore'),
  settingsBtn: document.getElementById('settingsBtn'),
  wordDisplay: document.getElementById('wordDisplay'),
  answerArea: document.getElementById('answerArea'),
  typedAnswer: document.getElementById('typedAnswer'),
  submitBtn: document.getElementById('submitBtn'),
  feedback: document.getElementById('feedback'),
  settingsModal: document.getElementById('settingsModal'),
  settingsForm: document.getElementById('settingsForm'),
  settingsError: document.getElementById('settingsError'),
  cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
};

let settings = parseSettingsFromUrl();
let wordList = null;
let currentQuestion = null;
let filledAnswers = {};
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

function getHiddenIndexes() {
  if (!currentQuestion) return [];
  return currentQuestion.slots.filter((slot) => slot.hidden).map((slot) => slot.index);
}

function allBlanksFilled() {
  return getHiddenIndexes().every((index) => {
    const value = filledAnswers[index];
    return typeof value === 'string' && value.length === 1;
  });
}

function updateSubmitEnabled() {
  if (settings.input !== 'answer') return;
  els.submitBtn.disabled = !acceptingAnswers || !allBlanksFilled();
}

function focusNextBlank(afterIndex) {
  const hidden = getHiddenIndexes();
  const start = afterIndex == null ? -1 : afterIndex;
  const next = hidden.find((index) => index > start && !filledAnswers[index]);
  const target = next ?? hidden.find((index) => !filledAnswers[index]) ?? null;
  if (target == null) return;

  const input = els.wordDisplay.querySelector(`input[data-index="${target}"]`);
  if (input && !input.disabled) {
    input.focus();
    input.select();
  }
}

function setFilledLetter(index, letter) {
  filledAnswers[index] = letter.toLowerCase();

  const letterEl = els.wordDisplay.querySelector(`.word-slot[data-index="${index}"] .word-filled`);
  if (letterEl) {
    letterEl.textContent = letter.toLowerCase();
  }

  const input = els.wordDisplay.querySelector(`input[data-index="${index}"]`);
  if (input) {
    input.value = letter.toLowerCase();
  }

  for (const btn of els.wordDisplay.querySelectorAll(
    `.letter-choices[data-index="${index}"] .choice-btn`,
  )) {
    btn.classList.toggle('selected', btn.dataset.value === letter.toLowerCase());
  }
}

function renderWordDisplay() {
  els.wordDisplay.replaceChildren();
  els.wordDisplay.className = 'word-display';
  els.wordDisplay.setAttribute('aria-label', 'Fill in the missing letters');

  for (const slot of currentQuestion.slots) {
    const col = document.createElement('div');
    col.className = 'word-slot';
    col.dataset.index = String(slot.index);

    const letterEl = document.createElement('div');
    letterEl.className = slot.hidden ? 'word-blank' : 'word-letter';
    if (slot.hidden) {
      letterEl.classList.add('word-filled');
      letterEl.textContent = filledAnswers[slot.index] ?? '_';
    } else {
      letterEl.textContent = slot.letter;
    }
    col.appendChild(letterEl);

    if (slot.hidden) {
      if (settings.input === 'answer') {
        const label = document.createElement('label');
        label.className = 'sr-only';
        label.htmlFor = `letterInput-${slot.index}`;
        label.textContent = `Letter ${slot.index + 1}`;

        const input = document.createElement('input');
        input.type = 'text';
        input.id = `letterInput-${slot.index}`;
        input.className = 'letter-input';
        input.maxLength = 1;
        input.autocomplete = 'off';
        input.autocapitalize = 'off';
        input.spellcheck = false;
        input.inputMode = 'text';
        input.dataset.index = String(slot.index);
        input.value = filledAnswers[slot.index] ?? '';
        input.disabled = !acceptingAnswers;

        input.addEventListener('input', (event) => {
          if (!acceptingAnswers) return;
          const raw = String(event.target.value).replace(/[^a-zA-Z]/g, '');
          const letter = raw.slice(-1).toLowerCase();
          event.target.value = letter;
          if (letter) {
            setFilledLetter(slot.index, letter);
            focusNextBlank(slot.index);
          } else {
            delete filledAnswers[slot.index];
            letterEl.textContent = '_';
          }
          updateSubmitEnabled();
        });

        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSubmitTyped();
          } else if (event.key === 'Backspace' && !event.target.value) {
            const hidden = getHiddenIndexes();
            const pos = hidden.indexOf(slot.index);
            if (pos > 0) {
              event.preventDefault();
              const prev = hidden[pos - 1];
              delete filledAnswers[prev];
              const prevLetter = els.wordDisplay.querySelector(
                `.word-slot[data-index="${prev}"] .word-filled`,
              );
              if (prevLetter) prevLetter.textContent = '_';
              const prevInput = els.wordDisplay.querySelector(`input[data-index="${prev}"]`);
              if (prevInput) {
                prevInput.value = '';
                prevInput.focus();
              }
              updateSubmitEnabled();
            }
          }
        });

        col.append(label, input);
      } else {
        const choices = document.createElement('div');
        choices.className = 'letter-choices';
        choices.dataset.index = String(slot.index);

        const options = currentQuestion.choicesByIndex[slot.index] ?? [];
        for (const letter of options) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'choice-btn letter-choice-btn';
          btn.textContent = letter;
          btn.dataset.value = letter;
          btn.disabled = !acceptingAnswers;
          if (filledAnswers[slot.index] === letter) {
            btn.classList.add('selected');
          }
          btn.addEventListener('click', () => onLetterChoice(slot.index, letter, btn));
          choices.appendChild(btn);
        }

        col.appendChild(choices);
      }
    }

    els.wordDisplay.appendChild(col);
  }
}

function onLetterChoice(index, letter, btn) {
  if (!acceptingAnswers) return;

  setFilledLetter(index, letter);

  const choices = btn.parentElement;
  if (choices) {
    for (const child of choices.querySelectorAll('.choice-btn')) {
      child.classList.toggle('selected', child === btn);
    }
  }

  if (allBlanksFilled()) {
    checkAnswer();
  }
}

function showQuestion() {
  clearAdvanceTimeout();
  clearFeedback();
  acceptingAnswers = true;
  filledAnswers = {};
  currentQuestion = generateQuestion(settings, wordList);
  renderWordDisplay();

  if (settings.input === 'answer') {
    els.typedAnswer.hidden = false;
    updateSubmitEnabled();
    focusNextBlank(null);
  } else {
    els.typedAnswer.hidden = true;
  }
}

function lockInputs() {
  acceptingAnswers = false;
  els.submitBtn.disabled = true;
  for (const input of els.wordDisplay.querySelectorAll('.letter-input')) {
    input.disabled = true;
  }
  for (const btn of els.wordDisplay.querySelectorAll('.choice-btn')) {
    btn.disabled = true;
  }
}

function checkAnswer() {
  if (!acceptingAnswers || !currentQuestion) return;
  if (!allBlanksFilled()) {
    showFeedback('Fill in every blank.', 'incorrect');
    return;
  }

  lockInputs();

  const correct = getHiddenIndexes().every(
    (index) => filledAnswers[index] === currentQuestion.slots[index].letter,
  );

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
  }, 1100);
}

function onSubmitTyped() {
  checkAnswer();
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
    els.wordDisplay.textContent = 'Could not load word list.';
    showFeedback('Refresh the page to try again.', 'incorrect');
  }
}

init();
