import { cheer, getName } from './profile.js';

let streak = 0;
let dismissTimeout = null;
let counterEl = null;
let counterValueEl = null;
let popEl = null;

const ENCOURAGEMENT = [
  ['Nice try! Start a new streak!', (name) => `Nice try, ${name}! Start a new streak!`],
  ["You've got this!", (name) => `You've got this, ${name}!`],
  ["Almost! Let's go again!", (name) => `Almost, ${name}! Let's go again!`],
  ['Keep practicing — you can do it!', (name) => `Keep practicing, ${name} — you can do it!`],
  ['No worries — next one!', (name) => `No worries, ${name} — next one!`],
  ['Shake it off and try again!', (name) => `Shake it off, ${name}, and try again!`],
];

const SUPPORT_EMOJIS = ['💪', '🙌', '🌈', '🍀', '🚀', '🐢', '❤️', '🌟', '🤗'];

const CELEBRATION_EMOJIS = ['⭐', '✨', '🎉', '🔥', '💫', '🏆', '🎊'];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function line(plain, personal) {
  const name = getName();
  return name ? personal(name) : plain;
}

function encourage() {
  const [plain, personal] = pick(ENCOURAGEMENT);
  return line(plain, personal);
}

function ensureDom() {
  if (counterEl && popEl) return;

  const topBar = document.querySelector('header.top-bar');
  if (topBar && !counterEl) {
    counterEl = document.createElement('div');
    counterEl.className = 'streak-wrap';
    counterEl.hidden = true;
    counterEl.setAttribute('aria-live', 'polite');
    counterEl.innerHTML =
      '<span class="streak-flame" aria-hidden="true">🔥</span>' +
      '<span class="streak-value" id="streakValue">0</span>';
    counterValueEl = counterEl.querySelector('.streak-value');

    const scoreWrap = topBar.querySelector('.score-wrap');
    if (scoreWrap) {
      topBar.insertBefore(counterEl, scoreWrap);
    } else {
      topBar.appendChild(counterEl);
    }
  }

  if (!popEl) {
    popEl = document.createElement('div');
    popEl.className = 'streak-pop';
    popEl.hidden = true;
    popEl.setAttribute('aria-live', 'assertive');
    popEl.setAttribute('role', 'status');
    document.body.appendChild(popEl);
  }
}

function updateCounter() {
  ensureDom();
  if (!counterEl || !counterValueEl) return;

  if (streak >= 2) {
    counterEl.hidden = false;
    counterValueEl.textContent = String(streak);
    counterEl.classList.remove('streak-pulse');
    // Force reflow so the pulse animation can restart.
    void counterEl.offsetWidth;
    counterEl.classList.add('streak-pulse');
  } else {
    counterEl.hidden = true;
    counterValueEl.textContent = '0';
    counterEl.classList.remove('streak-pulse');
  }
}

function clearDismiss() {
  if (dismissTimeout != null) {
    clearTimeout(dismissTimeout);
    dismissTimeout = null;
  }
}

function makeBurst(emojis, count) {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.className = 'streak-burst-emoji';
    span.textContent = pick(emojis);
    span.style.setProperty('--i', String(i));
    span.style.setProperty('--angle', `${(360 / count) * i}deg`);
    span.setAttribute('aria-hidden', 'true');
    fragment.appendChild(span);
  }
  return fragment;
}

function makeFlameRow(count) {
  const row = document.createElement('div');
  row.className = 'streak-flames';
  row.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const flame = document.createElement('span');
    flame.className = 'streak-flame-item';
    flame.textContent = '🔥';
    flame.style.setProperty('--i', String(i));
    row.appendChild(flame);
  }
  return row;
}

function makeFloatEmojis(emoji, count) {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.className = 'streak-float-emoji';
    span.textContent = emoji;
    span.style.setProperty('--i', String(i));
    span.style.setProperty('--angle', `${(360 / count) * i}deg`);
    span.setAttribute('aria-hidden', 'true');
    fragment.appendChild(span);
  }
  return fragment;
}

function showPopup({ message, tier, extras }) {
  ensureDom();
  if (!popEl) return;

  clearDismiss();
  popEl.hidden = false;
  popEl.className = `streak-pop streak-pop--${tier}`;
  popEl.replaceChildren();

  if (extras) {
    popEl.appendChild(extras);
  }

  const text = document.createElement('span');
  text.className = 'streak-pop-text';
  text.textContent = message;
  popEl.appendChild(text);

  // Restart enter animation.
  void popEl.offsetWidth;
  popEl.classList.add('streak-pop--show');

  const duration = tier === 'big' || tier === 'huge' ? 2500 : tier === 'lost' ? 2200 : 1500;
  dismissTimeout = setTimeout(() => {
    popEl.classList.remove('streak-pop--show');
    popEl.hidden = true;
    dismissTimeout = null;
  }, duration);
}

function milestoneFor(n) {
  if (n === 2) {
    return {
      message: line('Streak!', (name) => `Streak, ${name}!`),
      tier: 'small',
      extras: makeFlameRow(1),
    };
  }
  if (n === 3) {
    return {
      message: line('3 in a row!', (name) => `3 in a row, ${name}!`),
      tier: 'small',
      extras: makeFlameRow(2),
    };
  }
  if (n === 4) {
    return {
      message: line('Keep going!', (name) => `Hey ${name}, keep going!`),
      tier: 'small',
      extras: makeFlameRow(3),
    };
  }
  if (n === 5) {
    const extras = document.createDocumentFragment();
    extras.appendChild(makeBurst(['⭐', '✨'], 6));
    const star = document.createElement('span');
    star.className = 'streak-star';
    star.textContent = '⭐';
    star.setAttribute('aria-hidden', 'true');
    extras.appendChild(star);
    return {
      message: line('You earned a star!', (name) => `Good job, ${name}! You earned a star!`),
      tier: 'small',
      extras,
    };
  }
  if (n >= 6 && n <= 9) {
    return {
      message: line(`${n} in a row!`, (name) => `${n} in a row, ${name}!`),
      tier: 'small',
      extras: makeFlameRow(n - 4),
    };
  }
  if (n >= 20 && n % 10 === 0) {
    const extras = document.createDocumentFragment();
    extras.appendChild(makeBurst(CELEBRATION_EMOJIS, 12));
    const trophy = document.createElement('span');
    trophy.className = 'streak-trophy';
    trophy.textContent = '🏆';
    trophy.setAttribute('aria-hidden', 'true');
    extras.appendChild(trophy);
    return {
      message: line(`Unstoppable! ${n}!`, (name) => `Unstoppable, ${name}! ${n}!`),
      tier: 'huge',
      extras,
    };
  }
  if (n >= 10 && n % 10 === 0) {
    const extras = document.createDocumentFragment();
    extras.appendChild(makeBurst(CELEBRATION_EMOJIS, 8));
    return {
      message: line(`Amazing! ${n} in a row!`, (name) => `Amazing, ${name}! ${n} in a row!`),
      tier: 'big',
      extras,
    };
  }
  return null;
}

export function recordCorrect() {
  streak += 1;
  updateCounter();

  const milestone = milestoneFor(streak);
  if (milestone) {
    showPopup(milestone);
  }
  return streak;
}

export function isHotStreak() {
  return streak >= 10;
}

/** Wrap correct feedback with fire once the streak hits 10+. */
export function withStreakFire(message) {
  const text = cheer(message);
  if (!isHotStreak()) return text;
  return `🔥 ${text} 🔥`;
}

export function recordWrong() {
  const lost = streak;
  streak = 0;
  updateCounter();

  if (lost < 2) return;

  const emoji = pick(SUPPORT_EMOJIS);
  showPopup({
    message: encourage(),
    tier: 'lost',
    extras: makeFloatEmojis(emoji, 5),
  });
}

// Inject DOM as soon as the module loads (apps import this at top level).
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureDom);
} else {
  ensureDom();
}
