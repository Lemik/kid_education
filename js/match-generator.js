const PICTURE_GROUPS = [
  ['animals', [
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
    ['elephant', '🐘'],
    ['giraffe', '🦒'],
    ['zebra', '🦓'],
    ['snake', '🐍'],
    ['snail', '🐌'],
    ['butterfly', '🦋'],
    ['ladybug', '🐞'],
    ['spider', '🕷️'],
    ['ant', '🐜'],
    ['shark', '🦈'],
    ['octopus', '🐙'],
    ['dolphin', '🐬'],
    ['koala', '🐨'],
    ['kangaroo', '🦘'],
    ['camel', '🐫'],
    ['sheep', '🐑'],
    ['goat', '🐐'],
    ['squirrel', '🐿️'],
    ['hedgehog', '🦔'],
    ['flamingo', '🦩'],
    ['parrot', '🦜'],
    ['bat', '🦇'],
    ['raccoon', '🦝'],
    ['hippo', '🦛'],
    ['rhino', '🦏'],
    ['crocodile', '🐊'],
    ['lizard', '🦎'],
    ['turkey', '🦃'],
    ['peacock', '🦚'],
    ['llama', '🦙'],
    ['gorilla', '🦍'],
    ['rooster', '🐓'],
    ['swan', '🦢'],
    ['seal', '🦭'],
    ['otter', '🦦'],
    ['sloth', '🦥'],
    ['skunk', '🦨'],
    ['badger', '🦡'],
    ['beaver', '🦫'],
  ]],
  ['food', [
    ['apple', '🍎'],
    ['banana', '🍌'],
    ['cake', '🎂'],
    ['cookie', '🍪'],
    ['pizza', '🍕'],
    ['egg', '🥚'],
    ['bread', '🍞'],
    ['grapes', '🍇'],
    ['strawberry', '🍓'],
    ['watermelon', '🍉'],
    ['lemon', '🍋'],
    ['pear', '🍐'],
    ['pineapple', '🍍'],
    ['coconut', '🥥'],
    ['kiwi', '🥝'],
    ['mango', '🥭'],
    ['corn', '🌽'],
    ['carrot', '🥕'],
    ['broccoli', '🥦'],
    ['potato', '🥔'],
    ['tomato', '🍅'],
    ['pepper', '🌶️'],
    ['cucumber', '🥒'],
    ['avocado', '🥑'],
    ['cheese', '🧀'],
    ['pretzel', '🥨'],
    ['pancakes', '🥞'],
    ['bacon', '🥓'],
    ['burger', '🍔'],
    ['fries', '🍟'],
    ['hot dog', '🌭'],
    ['taco', '🌮'],
    ['popcorn', '🍿'],
    ['donut', '🍩'],
    ['cupcake', '🧁'],
    ['candy', '🍬'],
    ['lollipop', '🍭'],
    ['chocolate', '🍫'],
    ['honey', '🍯'],
    ['milk', '🥛'],
    ['ice cream', '🍦'],
    ['soup', '🍲'],
    ['salad', '🥗'],
    ['sushi', '🍣'],
    ['rice', '🍚'],
    ['pie', '🥧'],
    ['sandwich', '🥪'],
    ['waffle', '🧇'],
    ['bagel', '🥯'],
    ['juice', '🧃'],
  ]],
  ['nature', [
    ['sun', '☀️'],
    ['moon', '🌙'],
    ['star', '⭐'],
    ['cloud', '☁️'],
    ['flower', '🌸'],
    ['tree', '🌳'],
    ['rainbow', '🌈'],
    ['snow', '❄️'],
    ['snowman', '⛄'],
    ['rain', '🌧️'],
    ['fire', '🔥'],
    ['leaf', '🍃'],
    ['mountain', '⛰️'],
    ['wave', '🌊'],
    ['cactus', '🌵'],
    ['mushroom', '🍄'],
    ['volcano', '🌋'],
    ['shell', '🐚'],
    ['rock', '🪨'],
    ['palm', '🌴'],
    ['sprout', '🌱'],
    ['tulip', '🌷'],
    ['rose', '🌹'],
    ['sunflower', '🌻'],
    ['clover', '🍀'],
    ['maple', '🍁'],
    ['earth', '🌍'],
    ['comet', '☄️'],
    ['planet', '🪐'],
    ['island', '🏝️'],
    ['water', '💧'],
  ]],
  ['travel', [
    ['car', '🚗'],
    ['bus', '🚌'],
    ['train', '🚂'],
    ['bike', '🚲'],
    ['boat', '⛵'],
    ['plane', '✈️'],
    ['rocket', '🚀'],
    ['truck', '🚚'],
    ['ship', '🚢'],
    ['helicopter', '🚁'],
    ['scooter', '🛴'],
    ['canoe', '🛶'],
    ['sled', '🛷'],
    ['tractor', '🚜'],
    ['ambulance', '🚑'],
    ['fire truck', '🚒'],
  ]],
  ['home', [
    ['book', '📚'],
    ['key', '🔑'],
    ['gift', '🎁'],
    ['bell', '🔔'],
    ['bed', '🛏️'],
    ['chair', '🪑'],
    ['lamp', '💡'],
    ['door', '🚪'],
    ['clock', '⏰'],
    ['cup', '☕'],
    ['spoon', '🥄'],
    ['soap', '🧼'],
    ['broom', '🧹'],
    ['basket', '🧺'],
    ['couch', '🛋️'],
    ['TV', '📺'],
    ['phone', '📱'],
    ['camera', '📷'],
    ['computer', '💻'],
    ['window', '🪟'],
    ['bathtub', '🛁'],
    ['toothbrush', '🪥'],
    ['mirror', '🪞'],
    ['candle', '🕯️'],
    ['umbrella', '☂️'],
    ['lock', '🔒'],
  ]],
  ['school', [
    ['pencil', '✏️'],
    ['crayon', '🖍️'],
    ['scissors', '✂️'],
    ['backpack', '🎒'],
    ['ruler', '📏'],
    ['paint', '🎨'],
  ]],
  ['places', [
    ['house', '🏠'],
    ['school', '🏫'],
    ['castle', '🏰'],
    ['tent', '⛺'],
    ['hospital', '🏥'],
    ['store', '🏪'],
  ]],
  ['play', [
    ['ball', '⚽'],
    ['balloon', '🎈'],
    ['crown', '👑'],
    ['heart', '❤️'],
    ['kite', '🪁'],
    ['drum', '🥁'],
    ['guitar', '🎸'],
    ['piano', '🎹'],
    ['violin', '🎻'],
    ['trumpet', '🎺'],
    ['dice', '🎲'],
    ['puzzle', '🧩'],
    ['teddy bear', '🧸'],
    ['robot', '🤖'],
    ['yo-yo', '🪀'],
    ['basketball', '🏀'],
    ['baseball', '⚾'],
    ['tennis', '🎾'],
    ['football', '🏈'],
    ['trophy', '🏆'],
    ['medal', '🏅'],
  ]],
  ['people', [
    ['hat', '🎩'],
    ['cap', '🧢'],
    ['shoe', '👟'],
    ['boot', '👢'],
    ['shirt', '👕'],
    ['dress', '👗'],
    ['socks', '🧦'],
    ['glasses', '👓'],
    ['bow', '🎀'],
    ['baby', '👶'],
    ['boy', '👦'],
    ['girl', '👧'],
    ['princess', '👸'],
    ['king', '🤴'],
    ['ghost', '👻'],
    ['alien', '👽'],
    ['wizard', '🧙'],
    ['fairy', '🧚'],
    ['mermaid', '🧜'],
    ['smile', '😀'],
    ['eye', '👁️'],
    ['ear', '👂'],
    ['hand', '✋'],
    ['foot', '🦶'],
  ]],
];

function itemId(word) {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const PICTURE_ITEMS = PICTURE_GROUPS.flatMap(([group, items]) =>
  items.map(([word, emoji]) => ({ id: itemId(word), word, emoji, group })),
);

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
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const NUMBER_MAX = 100;
const COUNT_MAX = 10;

export function numberWord(n) {
  if (n === 100) return 'one hundred';
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

function picturePair(item, faces, prefix) {
  return {
    pairId: `${prefix}-${item.id}`,
    family: 'picture',
    group: item.group,
    faces,
  };
}

function colorPair(item, faces, prefix) {
  return {
    pairId: `${prefix}-${item.id}`,
    family: 'picture',
    group: 'colors',
    faces,
  };
}

function numberPair(n, faces, prefix) {
  return {
    pairId: `${prefix}-${n}`,
    family: 'number',
    group: 'numbers',
    faces,
  };
}

function pairOptions(settings) {
  const mix = settings.mix === 'y';
  const { pictures, numbers, words } = settings;
  const options = [];

  if (!mix) {
    if (pictures) {
      for (const item of PICTURE_ITEMS) {
        options.push(picturePair(item, [emojiFace(item), emojiFace(item)], 'pic'));
      }
      for (const item of COLOR_ITEMS) {
        options.push(colorPair(item, [colorFace(item), colorFace(item)], 'color'));
      }
    }
    if (words) {
      for (const item of PICTURE_ITEMS) {
        options.push(picturePair(item, [wordFace(item.word), wordFace(item.word)], 'word'));
      }
      for (const item of COLOR_ITEMS) {
        options.push(colorPair(item, [wordFace(item.word), wordFace(item.word)], 'word'));
      }
    }
    if (numbers) {
      for (let n = 1; n <= NUMBER_MAX; n += 1) {
        options.push(numberPair(n, [numberFace(n), numberFace(n)], 'num'));
      }
    }
    return options;
  }

  if (pictures && words) {
    for (const item of PICTURE_ITEMS) {
      options.push(picturePair(item, [emojiFace(item), wordFace(item.word)], 'mix'));
    }
    for (const item of COLOR_ITEMS) {
      options.push(colorPair(item, [colorFace(item), wordFace(item.word)], 'mix'));
    }
  }

  if (numbers && words) {
    for (let n = 1; n <= NUMBER_MAX; n += 1) {
      options.push(numberPair(n, [numberFace(n), wordFace(numberWord(n))], 'mix-n'));
    }
  } else if (pictures && numbers) {
    for (let n = 1; n <= COUNT_MAX; n += 1) {
      options.push(numberPair(n, [dotsFace(n), numberFace(n)], 'count'));
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

/** Round-robin across picture groups so one board mixes categories. */
function spreadByGroup(items) {
  const buckets = new Map();
  for (const item of items) {
    if (!buckets.has(item.group)) buckets.set(item.group, []);
    buckets.get(item.group).push(item);
  }

  const names = shuffle([...buckets.keys()]);
  const spread = [];
  let pending = true;
  while (pending) {
    pending = false;
    for (const name of names) {
      const bucket = buckets.get(name);
      if (bucket.length === 0) continue;
      spread.push(bucket.pop());
      pending = true;
    }
  }
  return spread;
}

/**
 * Split pictures and numbers evenly, and spread picture categories.
 * Numbers stay one shuffled pool so a short game can still be small numbers.
 */
function takeVaried(options, needed) {
  const pictures = [];
  const numbers = [];
  for (const option of shuffle(options)) {
    if (option.family === 'number') numbers.push(option);
    else pictures.push(option);
  }

  const streams = [];
  if (pictures.length > 0) streams.push(spreadByGroup(pictures));
  if (numbers.length > 0) streams.push(numbers);

  const order = shuffle(streams);
  const chosen = [];
  while (chosen.length < needed) {
    let added = false;
    for (const stream of order) {
      if (stream.length === 0) continue;
      chosen.push(stream.shift());
      added = true;
      if (chosen.length === needed) break;
    }
    if (!added) break;
  }
  return chosen;
}

/**
 * Build a shuffled board where every card has exactly one match.
 */
export function generateBoard(settings) {
  const needed = settings.cards / 2;
  const chosen = takeVaried(pairOptions(settings), needed);
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
