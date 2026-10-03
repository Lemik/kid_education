const PICTURE_ITEMS = [
  ['cat', '🐱'],
  ['dog', '🐶'],
  ['fox', '🦊'],
  ['bear', '🐻'],
  ['lion', '🦁'],
  ['frog', '🐸'],
  ['duck', '🦆'],
  ['bird', '🐦'],
  ['fish', '🐟'],
  ['pig', '🐷'],
  ['cow', '🐮'],
  ['horse', '🐴'],
  ['rabbit', '🐰'],
  ['turtle', '🐢'],
  ['bee', '🐝'],
  ['owl', '🦉'],
  ['panda', '🐼'],
  ['penguin', '🐧'],
  ['whale', '🐳'],
  ['crab', '🦀'],
  ['mouse', '🐭'],
  ['tiger', '🐯'],
  ['monkey', '🐵'],
  ['chicken', '🐔'],
  ['unicorn', '🦄'],
  ['sun', '☀️'],
  ['moon', '🌙'],
  ['star', '⭐'],
  ['cloud', '☁️'],
  ['flower', '🌸'],
  ['tree', '🌳'],
  ['apple', '🍎'],
  ['banana', '🍌'],
  ['cake', '🎂'],
  ['cookie', '🍪'],
  ['pizza', '🍕'],
  ['egg', '🥚'],
  ['bread', '🍞'],
  ['car', '🚗'],
  ['bus', '🚌'],
  ['house', '🏠'],
  ['ball', '⚽'],
  ['book', '📚'],
  ['key', '🔑'],
  ['gift', '🎁'],
  ['bell', '🔔'],
  ['balloon', '🎈'],
  ['train', '🚂'],
  ['crown', '👑'],
  ['heart', '❤️'],
].map(([word, emoji]) => ({ id: word, word, emoji }));

const COLOR_ITEMS = [
  ['red', '#ef4444'],
  ['blue', '#3b82f6'],
  ['green', '#16a34a'],
  ['yellow', '#facc15'],
  ['orange', '#f97316'],
  ['purple', '#a855f7'],
  ['pink', '#ec4899'],
  ['brown', '#92400e'],
  ['black', '#111827'],
  ['white', '#ffffff'],
  ['gray', '#9ca3af'],
  ['gold', '#eab308'],
].map(([word, color]) => ({ id: word, word, color }));

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const TEENS = [
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];

const NUMBER_MAX = 50;
const COUNT_MAX = 10;

export function numberWord(n) {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return one === 0 ? TENS[ten] : `${TENS[ten]}-${ONES[one]}`;
}

function emojiFace(item) {
  return { kind: 'emoji', label: item.word, emoji: item.emoji };
}

function colorFace(item) {
  return { kind: 'color', label: item.word, color: item.color };
}

function wordFace(word) {
  return { kind: 'word', label: word, text: word };
}

function numberFace(n) {
  return { kind: 'number', label: String(n), text: String(n) };
}

function dotsFace(n) {
  return { kind: 'dots', label: `${n} dots`, count: n };
}

function pairOptions(settings) {
  const mix = settings.mix === 'y';
  const { pictures, numbers, words } = settings;
  const options = [];

  if (!mix) {
    if (pictures) {
      for (const item of PICTURE_ITEMS) {
        options.push({
          pairId: `pic-${item.id}`,
          faces: [emojiFace(item), emojiFace(item)],
        });
      }
      for (const item of COLOR_ITEMS) {
        options.push({
          pairId: `color-${item.id}`,
          faces: [colorFace(item), colorFace(item)],
        });
      }
    }
    if (words) {
      for (const item of PICTURE_ITEMS) {
        options.push({
          pairId: `word-${item.id}`,
          faces: [wordFace(item.word), wordFace(item.word)],
        });
      }
      for (const item of COLOR_ITEMS) {
        options.push({
          pairId: `word-${item.id}`,
          faces: [wordFace(item.word), wordFace(item.word)],
        });
      }
    }
    if (numbers) {
      for (let n = 1; n <= NUMBER_MAX; n += 1) {
        options.push({
          pairId: `num-${n}`,
          faces: [numberFace(n), numberFace(n)],
        });
      }
    }
    return options;
  }

  if (pictures && words) {
    for (const item of PICTURE_ITEMS) {
      options.push({
        pairId: `mix-${item.id}`,
        faces: [emojiFace(item), wordFace(item.word)],
      });
    }
    for (const item of COLOR_ITEMS) {
      options.push({
        pairId: `mix-${item.id}`,
        faces: [colorFace(item), wordFace(item.word)],
      });
    }
  }

  if (numbers && words) {
    for (let n = 1; n <= NUMBER_MAX; n += 1) {
      options.push({
        pairId: `mix-n-${n}`,
        faces: [numberFace(n), wordFace(numberWord(n))],
      });
    }
  } else if (pictures && numbers) {
    for (let n = 1; n <= COUNT_MAX; n += 1) {
      options.push({
        pairId: `count-${n}`,
        faces: [dotsFace(n), numberFace(n)],
      });
    }
  }

  return options;
}

/** How many unique pairs these settings can build. */
export function maxPairs(settings) {
  return pairOptions(settings).length;
}

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = copy[i];
    copy[i] = copy[j];
    copy[j] = swap;
  }
  return copy;
}

/**
 * Build a shuffled board where every card has exactly one match.
 */
export function generateBoard(settings) {
  const needed = settings.cards / 2;
  const chosen = shuffle(pairOptions(settings)).slice(0, needed);
  const cards = [];

  for (const pair of chosen) {
    for (const face of pair.faces) {
      cards.push({
        pairId: pair.pairId,
        kind: face.kind,
        label: face.label,
        emoji: face.emoji || '',
        color: face.color || '',
        text: face.text || '',
        count: face.count || 0,
      });
    }
  }

  return shuffle(cards);
}
