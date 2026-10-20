import { cheer } from './profile.js';
import {
  parseSettingsFromUrl,
  settingsToUrl,
  readSettingsFromForm,
  applySettingsToForm,
  buildLevelSettings,
  isLevelMode,
} from './subset-settings.js';
import { SUBSET_LEVELS } from './subset-levels.js';
import { LEVEL_UP_TARGET } from './levels.js';
import { createLadder, createLevelStore } from './level-progress.js';
import { generateTree, findMaking, OP_SYMBOLS, PARTS } from './subset-generator.js';
import {
  getScore,
  incrementScore,
  getWrong,
  incrementWrong,
  resetSession,
  getOrCreateStartedAt,
} from './subset-storage.js';
import { commitSettingsChange } from './apply-settings.js';
import { recordCorrect, recordWrong, withStreakFire, isHotStreak } from './streak.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 94;

const THEMES = [
  { color: '#ef4444', light: '#fee2e2', emoji: '🍎' },
  { color: '#f97316', light: '#ffedd5', emoji: '🦊' },
  { color: '#eab308', light: '#fef9c3', emoji: '🌻' },
  { color: '#22c55e', light: '#dcfce7', emoji: '🐸' },
  { color: '#14b8a6', light: '#ccfbf1', emoji: '🐢' },
  { color: '#06b6d4', light: '#cffafe', emoji: '🐳' },
  { color: '#3b82f6', light: '#dbeafe', emoji: '🦋' },
  { color: '#8b5cf6', light: '#ede9fe', emoji: '🔮' },
  { color: '#ec4899', light: '#fce7f3', emoji: '🌸' },
  { color: '#84cc16', light: '#ecfccb', emoji: '🍀' },
  { color: '#a855f7', light: '#f3e8ff', emoji: '🦄' },
  { color: '#f43f5e', light: '#ffe4e6', emoji: '🍓' },
];

const TOP_THEME = { color: '#f59e0b', light: '#fef3c7', emoji: '🏆' };

/** Outline: radius = 1 − amp · (1 − wave(angle)) / 2, with wave in [−1, 1]. */
const SHAPES = [
  { amp: 0, wave: () => 1 },
  { amp: 0.24, wave: (t) => Math.cos(6 * t) },
  { amp: 0.22, wave: (t) => Math.sin(t) },
  { amp: 0.2, wave: (t) => 0.5 * Math.sin(3 * t + 1) + 0.5 * Math.cos(5 * t) },
  { amp: 0.26, wave: (t) => Math.cos(5 * t) },
];

const els = {
  timerWrap: document.getElementById('timerWrap'),
  timer: document.getElementById('timer'),
  score: document.getElementById('score'),
  wrongScore: document.getElementById('wrongScore'),
  settingsBtn: document.getElementById('settingsBtn'),
  progress: document.getElementById('progress'),
  hint: document.getElementById('hint'),
  levelsArea: document.getElementById('levelsArea'),
  feedback: document.getElementById('feedback'),
  winSign: document.getElementById('winSign'),
  winDetail: document.getElementById('winDetail'),
  playAgainBtn: document.getElementById('playAgainBtn'),
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
  levels: SUBSET_LEVELS,
  target: LEVEL_UP_TARGET,
  store: createLevelStore('subset'),
});

let settings = parseSettingsFromUrl(window.location.search, ladder.saved());
let timerInterval = null;
const pendingTimeouts = new Set();

/**
 * Tree nodes from generateTree, extended with
 * { parent, indexInParent, depth, theme, outline, answer, card, slot, groupEl }.
 */
const round = {
  root: null,
  ops: [],
  total: 0,
  solved: 0,
  done: false,
};

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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

/** Count a correct find toward the next level; returns `{ message, levelUp }` or null. */
function recordLevelCorrect() {
  if (!isLevelMode(settings)) return null;
  const result = ladder.recordWin(settings.level);
  if (!result) return null;
  if (result.mastered) {
    return { message: cheer(`You mastered the top level — ${settings.label}!`), levelUp: false };
  }

  settings = buildLevelSettings(result.next, settings);
  history.replaceState(null, '', settingsToUrl(settings));
  return { message: cheer(`Level up! Level ${settings.level} — ${settings.label}`), levelUp: true };
}

function populateLevelSelect() {
  ladder.fillSelect(els.levelSelect);
  els.levelHint.textContent =
    `Moves up a level after ${LEVEL_UP_TARGET} correct finds in a row. ` +
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

function later(fn, ms) {
  const id = setTimeout(() => {
    pendingTimeouts.delete(id);
    fn();
  }, ms);
  pendingTimeouts.add(id);
}

function clearPendingTimeouts() {
  for (const id of pendingTimeouts) clearTimeout(id);
  pendingTimeouts.clear();
}

function opsText(ops) {
  const symbols = ops.map((op) => OP_SYMBOLS[op]);
  if (symbols.length === 1) return symbols[0];
  return `${symbols.slice(0, -1).join(', ')} or ${symbols[symbols.length - 1]}`;
}

function equationText(result, making) {
  return `${result} = ${making.a} ${OP_SYMBOLS[making.op]} ${making.b}`;
}

/* ---------- Object geometry ---------- */

/** A center disc plus a ring of PARTS − 1 sectors. */
function buildRegions(outline) {
  const width = RADIUS / 2;
  const shape = (angle) => 1 - (outline.amp * (1 - outline.wave(angle))) / 2;
  const point = (angle, r) => {
    const rr = r * shape(angle);
    return [CENTER + rr * Math.cos(angle), CENTER + rr * Math.sin(angle)];
  };
  const arc = (from, to, r) => {
    const steps = Math.max(2, Math.ceil(Math.abs(to - from) / 0.04));
    const pts = [];
    for (let s = 0; s <= steps; s += 1) pts.push(point(from + ((to - from) * s) / steps, r));
    return pts;
  };
  const toPath = (pts) =>
    `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`;

  const regions = [
    {
      d: toPath(arc(0, Math.PI * 2, width).slice(0, -1)),
      label: [CENTER, CENTER],
      arcLen: width * 2,
      width: width * 1.6,
    },
  ];

  const count = PARTS - 1;
  const step = (Math.PI * 2) / count;
  const offset = -Math.PI / 2 - step / 2;
  for (let s = 0; s < count; s += 1) {
    const from = offset + s * step;
    const to = from + step;
    const mid = (from + to) / 2;
    const midR = width * 1.5;
    regions.push({
      d: toPath([...arc(from, to, width * 2), ...arc(to, from, width)]),
      label: point(mid, midR),
      arcLen: midR * step * shape(mid),
      width: width * shape(mid),
    });
  }

  return regions;
}

function fontSizeFor(region, text) {
  const digits = Math.max(1, String(text).length);
  const size = Math.min(36, region.width * 0.62, (region.arcLen * 0.8) / (0.62 * digits));
  return Math.max(12, size);
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

/** Draw one object card. `partColors[i]` tints part i (the object it came from). */
function buildCard(values, theme, outline, label, partColors = null) {
  const el = document.createElement('div');
  el.className = 'subset-card';
  el.style.setProperty('--obj', theme.color);
  el.style.setProperty('--obj-light', theme.light);

  const svg = svgEl('svg', {
    class: 'subset-svg',
    viewBox: `0 0 ${SIZE} ${SIZE}`,
    role: 'group',
    'aria-label': label,
  });

  buildRegions(outline).forEach((region, index) => {
    const path = svgEl('path', { d: region.d, class: 'subset-region', 'data-index': index });
    if (partColors) path.style.setProperty('--part', partColors[index]);
    const text = svgEl('text', {
      x: region.label[0].toFixed(1),
      y: region.label[1].toFixed(1),
      class: 'subset-num',
      'data-index': index,
      'font-size': fontSizeFor(region, values[index]).toFixed(1),
    });
    text.textContent = String(values[index]);
    svg.append(path, text);
  });

  const caption = document.createElement('p');
  caption.className = 'subset-caption';

  el.append(svg, caption);
  return { el, svg, caption };
}

function makeTappable(target, label, onTap) {
  target.setAttribute('tabindex', '0');
  target.setAttribute('role', 'button');
  target.setAttribute('aria-label', label);
  target.addEventListener('click', onTap);
  target.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onTap();
    }
  });
}

function untap(target) {
  target.removeAttribute('tabindex');
  target.removeAttribute('role');
}

function partEls(svg, index) {
  return [
    svg.querySelector(`.subset-region[data-index="${index}"]`),
    svg.querySelector(`.subset-num[data-index="${index}"]`),
  ];
}

/** Bring a part (shape + number) to the front so its thick outline isn't covered. */
function raisePart(svg, index, className) {
  for (const el of partEls(svg, index)) {
    if (!el) continue;
    el.classList.add(className);
    svg.appendChild(el);
  }
}

function shake(el) {
  el.classList.remove('wrong');
  void el.getBoundingClientRect();
  el.classList.add('wrong');
  setTimeout(() => el.classList.remove('wrong'), 600);
}

/* ---------- Layout ---------- */

/**
 * One section per level, bottom level first. Each section holds one group per
 * parent; a group has PARTS slots that fill in as its objects appear.
 */
function buildLayout(root) {
  const byDepth = [];
  const walk = (node, depth) => {
    node.depth = depth;
    (byDepth[depth] ??= []).push(node);
    node.children?.forEach((child, i) => {
      child.parent = node;
      child.indexInParent = i;
      walk(child, depth + 1);
    });
  };
  walk(root, 0);

  const sections = [];
  for (let depth = byDepth.length - 1; depth >= 0; depth -= 1) {
    const section = document.createElement('section');
    section.className = 'subset-level';
    section.hidden = true;

    if (depth === 0) {
      const group = document.createElement('div');
      group.className = 'subset-group subset-group-top';
      root.slot = document.createElement('div');
      root.slot.className = 'subset-slot';
      group.appendChild(root.slot);
      section.appendChild(group);
    } else {
      for (const parent of byDepth[depth - 1]) {
        const group = document.createElement('div');
        group.className = 'subset-group';
        group.hidden = true;
        for (const child of parent.children) {
          child.slot = document.createElement('div');
          child.slot.className = 'subset-slot';
          group.appendChild(child.slot);
        }
        parent.groupEl = group;
        section.appendChild(group);
      }
    }

    for (const node of byDepth[depth]) node.section = section;
    sections.push(section);
  }

  els.levelsArea.replaceChildren(...sections);
  return byDepth;
}

/* ---------- Round flow ---------- */

function startRound() {
  clearPendingTimeouts();
  clearFeedback();
  els.winSign.hidden = true;

  const root = generateTree(settings.levels, settings.op);
  const byDepth = buildLayout(root);
  const themes = shuffle(THEMES);
  const shapes = shuffle(SHAPES);
  let count = 0;
  for (const level of byDepth) {
    for (const node of level) {
      node.theme = node === root ? TOP_THEME : themes[count % themes.length];
      node.outline = shapes[count % shapes.length];
      node.answer = null;
      count += 1;
    }
  }

  round.root = root;
  round.ops = settings.op;
  round.total = count;
  round.solved = 0;
  round.done = false;

  for (const leaf of byDepth[byDepth.length - 1]) revealNode(leaf, false);

  els.hint.textContent =
    `Tap the number you can make from two other numbers with ${opsText(round.ops)}. ` +
    'Every 5 answers make a new object.';
  updateProgress();
}

function updateProgress() {
  els.progress.textContent = `Solved ${round.solved} of ${round.total}`;
}

function revealNode(node, animate) {
  const { values } = node.object;
  const partColors = node.children ? node.children.map((child) => child.theme.light) : null;
  const label = node.parent ? 'Object' : 'Last object';
  const card = buildCard(values, node.theme, node.outline, label, partColors);
  node.card = card;
  card.el.classList.add('is-active');
  if (!node.parent) card.el.classList.add('subset-card-top');
  if (node.children) card.caption.textContent = 'Made from the answers above';

  values.forEach((value, index) => {
    const [path] = partEls(card.svg, index);
    makeTappable(path, String(value), () => onPartTapped(node, index, path));
  });

  node.slot.appendChild(card.el);
  if (node.parent) node.parent.groupEl.hidden = false;
  node.section.hidden = false;

  if (animate) {
    card.el.classList.add('is-new');
    card.el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function onPartTapped(node, index, path) {
  if (round.done || node.answer != null) return;
  const { values, targets, planned } = node.object;

  if (!targets.includes(index)) {
    incrementWrong();
    recordWrong();
    if (isLevelMode(settings)) ladder.recordMiss(settings.level);
    updateScoreDisplay();
    updateLevelDisplay();
    shake(path);
    showFeedback(`${values[index]} can't be made from two other numbers here. Try again!`, 'incorrect');
    return;
  }

  // Lower objects feed the one above, so only the planned answer can be used there.
  if (node.parent && index !== planned) {
    const twin = equationText(values[index], findMaking(values, index, round.ops));
    showFeedback(`That's true too: ${twin}! But find another one.`, 'hint');
    return;
  }

  incrementScore();
  const streak = recordCorrect();
  if (isLevelMode(settings)) {
    ladder.pay({ level: settings.level, streak, fromEl: path });
  }
  const levelResult = recordLevelCorrect();
  updateScoreDisplay();
  updateLevelDisplay();

  const making = findMaking(values, index, round.ops);
  const equation = equationText(values[index], making);
  if (levelResult) {
    showFeedback(levelResult.message, 'correct level-up');
  } else {
    showCorrectFeedback(`Yes! ${equation}`);
  }

  const card = node.card;
  node.answer = values[index];
  card.el.classList.remove('is-active');
  card.el.classList.add('is-solved');
  for (const part of card.svg.querySelectorAll('.subset-region')) untap(part);
  raisePart(card.svg, making.aIndex, 'operand');
  raisePart(card.svg, making.bIndex, 'operand');
  raisePart(card.svg, index, 'picked');
  card.caption.textContent = `${node.theme.emoji} ${equation}`;

  round.solved += 1;
  updateProgress();

  // The board was built for the old level, so start a new one at the new level.
  if (levelResult?.levelUp) {
    round.done = true;
    later(startRound, 2600);
    return;
  }

  const parent = node.parent;
  if (!parent) {
    finishRound(equation);
  } else if (parent.children.every((child) => child.answer != null)) {
    later(() => revealNode(parent, true), 900);
  }
}

function finishRound(equation) {
  round.done = true;
  els.winDetail.textContent = `You solved all ${round.total} objects. Last one: ${equation}`;
  later(() => {
    els.winSign.hidden = false;
    els.playAgainBtn.focus();
  }, 1400);
}

/* ---------- Settings ---------- */

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
  stopTimer();
  settings = next;
  updateScoreDisplay();
  updateLevelDisplay();
  startTimer();
  startRound();
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
  els.playAgainBtn.addEventListener('click', startRound);

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
  startRound();
}

init();
