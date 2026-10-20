import { coinsAreShown, getCoins as readCoins, setCoins as writeCoins } from './profile.js';

// Coins live on the profile, shared by every game and kept across visits.
const MAX_FLYING = 10;

let purseEl = null;
let valueEl = null;
let practiceEl = null;
let gainEl = null;
let gainTimeout = null;

export function getCoins() {
  return readCoins();
}

function setCoins(total) {
  writeCoins(total);
}

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function ensureDom() {
  if (purseEl) return;
  const topBar = document.querySelector('header.top-bar');
  if (!topBar) return;

  purseEl = document.createElement('div');
  purseEl.className = 'coin-wrap';
  purseEl.title = 'Coins';
  purseEl.innerHTML =
    '<span class="coin-icon" aria-hidden="true">★</span>' +
    '<span class="coin-value" aria-live="polite"></span>' +
    '<span class="coin-practice" hidden>Practice</span>' +
    '<span class="coin-gain" aria-hidden="true"></span>';
  valueEl = purseEl.querySelector('.coin-value');
  practiceEl = purseEl.querySelector('.coin-practice');
  gainEl = purseEl.querySelector('.coin-gain');
  valueEl.textContent = String(getCoins());
  valueEl.setAttribute('aria-label', `${getCoins()} coins`);
  purseEl.hidden = !coinsAreShown();

  const spacer = topBar.querySelector('.top-bar-spacer');
  if (spacer) {
    spacer.after(purseEl);
  } else {
    purseEl.classList.add('coin-wrap--end');
    topBar.appendChild(purseEl);
  }
}

function showTotal(total) {
  valueEl.textContent = String(total);
  valueEl.setAttribute('aria-label', `${total} coins`);
  purseEl.classList.remove('coin-bounce');
  void purseEl.offsetWidth;
  purseEl.classList.add('coin-bounce');
}

function showGain(amount) {
  if (gainTimeout != null) clearTimeout(gainTimeout);
  gainEl.textContent = `+${amount}`;
  gainEl.classList.remove('coin-gain--show');
  void gainEl.offsetWidth;
  gainEl.classList.add('coin-gain--show');
  gainTimeout = setTimeout(() => {
    gainEl.classList.remove('coin-gain--show');
    gainTimeout = null;
  }, 1400);
}

function centerOf(el) {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Animate `count` coins from `from` into the purse; resolves when the last one lands. */
function flyCoins(from, count) {
  const to = centerOf(purseEl.querySelector('.coin-icon'));
  const flights = [];

  for (let i = 0; i < count; i += 1) {
    const coin = document.createElement('span');
    coin.className = 'coin-fly';
    coin.textContent = '★';
    coin.setAttribute('aria-hidden', 'true');
    coin.style.left = `${from.x}px`;
    coin.style.top = `${from.y}px`;
    document.body.appendChild(coin);

    const spreadX = (Math.random() - 0.5) * 80;
    const lift = 60 + Math.random() * 60;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const animation = coin.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
        {
          transform: `translate(calc(-50% + ${spreadX}px), calc(-50% - ${lift}px)) scale(1.25)`,
          opacity: 1,
          offset: 0.35,
        },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.7)`, opacity: 1 },
      ],
      { duration: 750, delay: i * 70, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'backwards' },
    );
    flights.push(
      animation.finished.catch(() => {}).finally(() => coin.remove()),
    );
  }

  return Promise.all(flights);
}

/**
 * Add coins to the purse. `fromEl` is where the coins fly from (the tapped
 * answer or the feedback line). An amount of 0 does nothing.
 */
export function awardCoins({ amount, fromEl = null }) {
  const gained = Math.max(0, Math.floor(amount));
  if (gained === 0) return;

  ensureDom();
  const total = getCoins() + gained;
  setCoins(total);
  if (!purseEl) return;

  valueEl.textContent = String(total);
  valueEl.setAttribute('aria-label', `${total} coins`);
  if (purseEl.hidden) return;

  if (reducedMotion() || !fromEl || !fromEl.isConnected) {
    showTotal(total);
    showGain(gained);
    return;
  }

  flyCoins(centerOf(fromEl), Math.min(gained, MAX_FLYING)).then(() => {
    showTotal(getCoins());
    showGain(gained);
  });
}

/** Practice levels and custom settings show a tag on the purse and pay nothing. */
export function setCoinPractice(practice) {
  ensureDom();
  if (practiceEl) practiceEl.hidden = !practice;
}

/** Extra coins for a fire streak (right answers in a row on this page). */
export function streakBonus(streak) {
  if (streak >= 20) return 5;
  if (streak >= 10) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1;
  return 0;
}

/**
 * Coins for one win at `level`. Short ladders pay the level number;
 * long ladders spread 1 to 5 coins across all their levels.
 */
export function levelCoins(level, ladderLength) {
  if (ladderLength > 10) return 1 + Math.floor(((level - 1) * 5) / ladderLength);
  return Math.max(1, level);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureDom);
} else {
  ensureDom();
}
