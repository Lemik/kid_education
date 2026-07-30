let streak = 0;
let dismissTimeout = null;
let counterEl = null;
let counterValueEl = null;
let popEl = null;

const ENCOURAGEMENT = [
  'Nice try! Start a new streak!',
  "You've got this!",
  "Almost! Let's go again!",
  'Keep practicing — you can do it!',
  'No worries — next one!',
  'Shake it off and try again!',
];

const SUPPORT_EMOJIS = ['💪', '🙌', '🌈', '🍀', '🚀', '🐢', '❤️', '🌟', '🤗'];

const CELEBRATION_EMOJIS = ['⭐', '✨', '🎉', '🔥', '💫', '🏆', '🎊'];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
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
      message: 'Streak!',
      tier: 'small',
      extras: makeFlameRow(1),
    };
  }
  if (n === 3) {
    return {
      message: '3 in a row!',
      tier: 'small',
      extras: makeFlameRow(2),
    };
  }
  if (n === 4) {
    return {
      message: 'Keep going!',
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
      message: 'You earned a star!',
      tier: 'small',
      extras,
    };
  }
  if (n >= 6 && n <= 9) {
    return {
      message: `${n} in a row!`,
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
      message: `Unstoppable! ${n}!`,
      tier: 'huge',
      extras,
    };
  }
  if (n >= 10 && n % 10 === 0) {
    const extras = document.createDocumentFragment();
    extras.appendChild(makeBurst(CELEBRATION_EMOJIS, 8));
    return {
      message: `Amazing! ${n} in a row!`,
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
}

export function recordWrong() {
  const lost = streak;
  streak = 0;
  updateCounter();

  if (lost < 2) return;

  const emoji = pick(SUPPORT_EMOJIS);
  showPopup({
    message: pick(ENCOURAGEMENT),
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
