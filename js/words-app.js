import { cheer } from './profile.js';
import {
  parseSettingsFromUrl,
  settingsToUrl,
  readSettingsFromForm,
  applySettingsToForm,
  buildLevelSettings,
  isLevelMode,
} from './words-settings.js';
import { WORDS_LEVELS } from './words-levels.js';
import { LEVEL_UP_TARGET } from './levels.js';
import { createLadder, createLevelStore } from './level-progress.js';
import { generateQuestion } from './words-generator.js';
import {
  getScore,
  incrementScore,
  getWrong,
  incrementWrong,
  resetSession,
  getOrCreateStartedAt,
} from './words-storage.js';
import { commitSettingsChange } from './apply-settings.js';
import { recordCorrect, recordWrong, withStreakFire, isHotStreak } from './streak.js';

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
  levels: WORDS_LEVELS,
  target: LEVEL_UP_TARGET,
  store: createLevelStore('words'),
});

let settings = parseSettingsFromUrl(window.location.search, ladder.saved());
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
    checkAnswer(btn);
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

/** Where coins fly from when the typed answer is right: the focused letter box, else the word. */
function typedAnswerEl() {
  const active = document.activeElement;
  return active?.classList?.contains('letter-input') ? active : els.wordDisplay;
}

function checkAnswer(fromEl = typedAnswerEl()) {
  if (!acceptingAnswers || !currentQuestion) return;
  if (!allBlanksFilled()) {
    showFeedback('Fill in every blank.', 'incorrect');
    return;
  }

  lockInputs();

  const correct = getHiddenIndexes().every(
    (index) => filledAnswers[index] === currentQuestion.slots[index].letter,
  );

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

function onSubmitTyped() {
  checkAnswer();
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
    els.wordDisplay.textContent = 'Could not load word list.';
    showFeedback('Refresh the page to try again.', 'incorrect');
  }
}

init();
