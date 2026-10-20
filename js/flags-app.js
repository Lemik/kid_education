import { cheer } from './profile.js';
import {
  parseSettingsFromUrl,
  settingsToUrl,
  readSettingsFromForm,
  applySettingsToForm,
  buildLevelSettings,
  isLevelMode,
} from './flags-settings.js';
import { FLAGS_LEVELS } from './flags-levels.js';
import { LEVEL_UP_TARGET } from './levels.js';
import { createLadder, createLevelStore } from './level-progress.js';
import { generateQuestion, generateMatchBoard, flagEmoji } from './flags-generator.js';
import {
  getScore,
  incrementScore,
  getWrong,
  incrementWrong,
  resetSession,
  getOrCreateStartedAt,
} from './flags-storage.js';
import { commitSettingsChange } from './apply-settings.js';
import { recordCorrect, recordWrong, withStreakFire, isHotStreak } from './streak.js';

const els = {
  timerWrap: document.getElementById('timerWrap'),
  timer: document.getElementById('timer'),
  score: document.getElementById('score'),
  wrongScore: document.getElementById('wrongScore'),
  settingsBtn: document.getElementById('settingsBtn'),
  prompt: document.getElementById('prompt'),
  choices: document.getElementById('choices'),
  matchBoard: document.getElementById('matchBoard'),
  matchFlags: document.getElementById('matchFlags'),
  matchNames: document.getElementById('matchNames'),
  feedback: document.getElementById('feedback'),
  settingsModal: document.getElementById('settingsModal'),
  settingsForm: document.getElementById('settingsForm'),
  settingsError: document.getElementById('settingsError'),
  pairsField: document.getElementById('pairsField'),
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
  levels: FLAGS_LEVELS,
  target: LEVEL_UP_TARGET,
  store: createLevelStore('flags'),
});

let settings = parseSettingsFromUrl(window.location.search, ladder.saved());
let flagData = null;
let currentQuestion = null;
let acceptingAnswers = true;
let timerInterval = null;
let advanceTimeout = null;

const match = {
  selectedFlag: null,
  selectedName: null,
  remaining: 0,
  busy: false,
};

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

/** Pay for and count one correct answer; returns a message on level-up. */
function recordWin(fromEl) {
  const streak = recordCorrect();
  if (isLevelMode(settings)) {
    ladder.pay({ level: settings.level, streak, fromEl });
  }
  return recordLevelCorrect();
}

function recordMiss() {
  if (isLevelMode(settings)) ladder.recordMiss(settings.level);
}

function populateLevelSelect() {
  ladder.fillSelect(els.levelSelect);
  els.levelHint.textContent =
    `Moves up a level after ${LEVEL_UP_TARGET} correct answers in a row. ` +
    'Finished levels show a check. Playing a finished level again does not earn coins.';
}

function updateModeFields() {
  const levelMode = els.settingsForm.querySelector('input[name="play"]:checked')?.value === 'level';
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

function showCorrectFeedback(message) {
  showFeedback(withStreakFire(message), isHotStreak() ? 'correct streak-hot' : 'correct');
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

/* ---------- Multiple choice ---------- */

function renderPrompt(question) {
  els.prompt.replaceChildren();

  if (question.kind === 'flag') {
    const flag = document.createElement('div');
    flag.className = 'flag-big';
    flag.textContent = flagEmoji(question.country.id);
    flag.setAttribute('role', 'img');
    flag.setAttribute('aria-label', 'Mystery flag');

    const text = document.createElement('p');
    text.className = 'flag-question';
    text.textContent = 'Which country has this flag?';

    els.prompt.append(flag, text);
  } else {
    const text = document.createElement('p');
    text.className = 'flag-question';
    text.append('Which flag belongs to ');
    const name = document.createElement('strong');
    name.className = 'flag-country-name';
    name.textContent = `${question.country.name}?`;
    text.append(name);
    els.prompt.append(text);
  }
}

function renderChoices(question) {
  els.choices.replaceChildren();
  els.choices.classList.toggle('flag-choices', question.kind === 'name');

  for (const choice of question.choices) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice-btn';
    btn.dataset.id = choice.id;

    if (question.kind === 'name') {
      btn.classList.add('flag-choice-btn');
      btn.textContent = choice.flag;
      btn.setAttribute('aria-label', 'Flag option');
    } else {
      btn.textContent = choice.name;
    }

    btn.addEventListener('click', () => onChoiceSelected(btn));
    els.choices.appendChild(btn);
  }
}

function showQuestion() {
  clearAdvanceTimeout();
  clearFeedback();
  acceptingAnswers = true;
  currentQuestion = generateQuestion(settings, flagData, currentQuestion?.country.id ?? null);
  renderPrompt(currentQuestion);
  renderChoices(currentQuestion);
}

function onChoiceSelected(btn) {
  if (!acceptingAnswers || !currentQuestion) return;
  acceptingAnswers = false;

  const correctId = currentQuestion.country.id;
  const correct = btn.dataset.id === correctId;

  for (const child of els.choices.querySelectorAll('.choice-btn')) {
    child.disabled = true;
    if (child.dataset.id === correctId) child.classList.add('choice-correct');
  }
  if (!correct) btn.classList.add('choice-wrong');

  let levelMessage = null;
  if (correct) {
    incrementScore();
    levelMessage = recordWin(btn);
    if (levelMessage) {
      showFeedback(levelMessage, 'correct level-up');
    } else {
      showCorrectFeedback(`Great job! That's ${currentQuestion.country.name}.`);
    }
  } else {
    incrementWrong();
    recordWrong();
    recordMiss();
    const answer = currentQuestion.kind === 'flag'
      ? currentQuestion.country.name
      : `${flagEmoji(correctId)} ${currentQuestion.country.name}`;
    showFeedback(`Not quite — the answer was ${answer}.`, 'incorrect');
  }
  updateScoreDisplay();
  updateLevelDisplay();

  let delay = correct ? 1300 : 3100;
  if (levelMessage) delay = 2600;
  advanceTimeout = setTimeout(showRound, delay);
}

/* ---------- Match ---------- */

function makeMatchItem(country, side) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `flag-match-item flag-match-${side}`;
  btn.dataset.id = country.id;
  btn.dataset.side = side;

  if (side === 'flag') {
    btn.textContent = country.flag;
    btn.setAttribute('aria-label', 'Flag');
  } else {
    btn.textContent = country.name;
  }

  btn.addEventListener('click', () => onMatchItemTapped(btn));
  return btn;
}

function showMatchBoard() {
  clearAdvanceTimeout();
  clearFeedback();

  const board = generateMatchBoard(settings, flagData);
  match.selectedFlag = null;
  match.selectedName = null;
  match.remaining = board.flags.length;
  match.busy = false;

  els.prompt.replaceChildren();
  const text = document.createElement('p');
  text.className = 'flag-question';
  text.textContent = 'Tap a flag, then tap its country.';
  els.prompt.append(text);

  els.matchFlags.replaceChildren(...board.flags.map((c) => makeMatchItem(c, 'flag')));
  els.matchNames.replaceChildren(...board.names.map((c) => makeMatchItem(c, 'name')));
}

function onMatchItemTapped(btn) {
  if (match.busy || btn.classList.contains('matched')) return;

  const key = btn.dataset.side === 'flag' ? 'selectedFlag' : 'selectedName';
  if (match[key] === btn) {
    btn.classList.remove('selected');
    match[key] = null;
    return;
  }

  match[key]?.classList.remove('selected');
  match[key] = btn;
  btn.classList.add('selected');

  if (match.selectedFlag && match.selectedName) {
    checkMatch();
  }
}

function checkMatch() {
  const flagBtn = match.selectedFlag;
  const nameBtn = match.selectedName;
  match.selectedFlag = null;
  match.selectedName = null;

  for (const btn of [flagBtn, nameBtn]) btn.classList.remove('selected');

  if (flagBtn.dataset.id === nameBtn.dataset.id) {
    for (const btn of [flagBtn, nameBtn]) {
      btn.classList.add('matched');
      btn.disabled = true;
    }
    match.remaining -= 1;
    incrementScore();
    const levelMessage = recordWin(nameBtn);
    updateScoreDisplay();
    updateLevelDisplay();

    if (levelMessage) {
      match.busy = true;
      showFeedback(levelMessage, 'correct level-up');
      advanceTimeout = setTimeout(showRound, 2600);
    } else if (match.remaining === 0) {
      showCorrectFeedback('You matched them all!');
      advanceTimeout = setTimeout(showRound, 1800);
    } else {
      showCorrectFeedback('Match!');
    }
    return;
  }

  incrementWrong();
  recordWrong();
  recordMiss();
  updateScoreDisplay();
  updateLevelDisplay();
  showFeedback('Not a match — try again.', 'incorrect');

  match.busy = true;
  for (const btn of [flagBtn, nameBtn]) btn.classList.add('wrong-flash');
  setTimeout(() => {
    for (const btn of [flagBtn, nameBtn]) btn.classList.remove('wrong-flash');
    match.busy = false;
  }, 700);
}

/* ---------- Rounds & settings ---------- */

function showRound() {
  const isMatch = settings.mode === 'match';
  els.choices.hidden = isMatch;
  els.matchBoard.hidden = !isMatch;

  if (isMatch) {
    els.choices.replaceChildren();
    showMatchBoard();
  } else {
    els.matchFlags.replaceChildren();
    els.matchNames.replaceChildren();
    showQuestion();
  }
}

function syncPairsField() {
  const mode = new FormData(els.settingsForm).get('mode');
  els.pairsField.hidden = mode !== 'match';
}

function openSettingsModal() {
  populateLevelSelect();
  applySettingsToForm(els.settingsForm, settings, ladder.saved());
  updateModeFields();
  syncPairsField();
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
  currentQuestion = null;
  updateScoreDisplay();
  updateLevelDisplay();
  startTimer();
  if (flagData) showRound();
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

  for (const radio of els.settingsForm.querySelectorAll('input[name="play"]')) {
    radio.addEventListener('change', updateModeFields);
  }

  els.settingsForm.addEventListener('change', syncPairsField);
  els.settingsForm.addEventListener('submit', onSettingsSubmit);
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
    const response = await fetch('../data/flags.json');
    if (!response.ok) throw new Error(`Failed to load flags: ${response.status}`);
    flagData = await response.json();
  } catch (err) {
    els.prompt.textContent = 'Could not load flag data.';
    console.error(err);
    return;
  }

  showRound();
}

init();
