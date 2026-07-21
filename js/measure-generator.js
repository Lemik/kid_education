function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(array) {
  return array[randomInt(0, array.length - 1)];
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function unitLabel(unit, amount) {
  return amount === 1 ? unit.name : unit.plural;
}

/**
 * Collect pairs matching sys + selected pair ids.
 */
export function collectPairs(unitsData, settings) {
  const systems =
    settings.sys === 'both'
      ? ['metric', 'us', 'time']
      : [settings.sys];

  const selected = new Set(settings.pairs);
  const pool = [];

  for (const key of systems) {
    const list = unitsData[key];
    if (!Array.isArray(list)) continue;
    for (const pair of list) {
      if (selected.has(pair.id)) {
        pool.push(pair);
      }
    }
  }

  return pool;
}

/**
 * Resolve question subtype from mode setting.
 * Returns 'fact' | 'convert' | 'reverse'
 */
function resolveSubtype(mode) {
  if (mode === 'fact') return 'fact';
  if (mode === 'convert') return 'convert';
  if (mode === 'both') {
    return Math.random() < 0.5 ? 'fact' : 'convert';
  }
  // all: fact, convert (large?small), or reverse (small?large)
  return pick(['fact', 'convert', 'reverse']);
}

/**
 * Resolve conversion direction from dir setting + subtype.
 */
function resolveDirection(dir, subtype) {
  if (subtype === 'fact') return 'large-to-small';
  if (subtype === 'reverse') return 'small-to-large';
  // convert
  if (dir === 'large-to-small') return 'large-to-small';
  if (dir === 'small-to-large') return 'small-to-large';
  return Math.random() < 0.5 ? 'large-to-small' : 'small-to-large';
}

/**
 * Amount of large units for large?small questions.
 */
function pickLargeAmount(qty, subtype) {
  if (subtype === 'fact' || qty === '1') return 1;
  if (qty === 'easy') return randomInt(2, 10);
  return randomInt(1, 10);
}

/**
 * Amount of small units for small?large questions (always a multiple of factor).
 */
function pickSmallAmount(factor, qty) {
  let multipliers;
  if (qty === '1') {
    multipliers = [1, 2];
  } else if (qty === 'easy') {
    multipliers = [1, 2, 5];
  } else {
    multipliers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  }
  return pick(multipliers) * factor;
}

function buildPrompt(askUnit, givenAmount, givenUnit) {
  return `How many ${askUnit.plural} are in ${givenAmount} ${unitLabel(givenUnit, givenAmount)}?`;
}

/**
 * Generate a measurement conversion question.
 */
export function generateQuestion(settings, unitsData) {
  const pool = collectPairs(unitsData, settings);
  const fallback = {
    id: 'cm-m',
    large: { short: 'm', name: 'meter', plural: 'meters' },
    small: { short: 'cm', name: 'centimeter', plural: 'centimeters' },
    factor: 100,
  };
  const pair = pool.length > 0 ? pick(pool) : fallback;

  const subtype = resolveSubtype(settings.mode);
  const direction = resolveDirection(settings.dir, subtype);

  let amount;
  let answer;
  let prompt;
  let questionMode;

  if (direction === 'large-to-small') {
    amount = pickLargeAmount(settings.qty, subtype);
    answer = amount * pair.factor;
    prompt = buildPrompt(pair.small, amount, pair.large);
    questionMode = subtype === 'fact' && amount === 1 ? 'fact' : 'convert';
  } else {
    amount = pickSmallAmount(pair.factor, settings.qty);
    answer = amount / pair.factor;
    prompt = buildPrompt(pair.large, amount, pair.small);
    questionMode = 'reverse';
  }

  return {
    prompt,
    display: prompt,
    answer,
    pairId: pair.id,
    mode: questionMode,
    direction,
    amount,
    factor: pair.factor,
  };
}

/**
 * Build multiple-choice options with conversion-aware distractors.
 */
export function generateMeasureChoices(correctAnswer, factor, direction, amount, count = 4) {
  const choices = new Set([correctAnswer]);

  const candidates = [];

  // Wrong factor scale (e.g. 10 or 1000 when factor is 100)
  if (direction === 'large-to-small') {
    candidates.push(amount * 10, amount * 1000, amount * (factor / 10), amount * (factor * 10));
    candidates.push(amount); // forgot to multiply
    if (factor > 1) {
      candidates.push(amount * (factor - 1), amount * (factor + 1));
    }
  } else {
    // small?large: wrong divisions / forgot to divide
    candidates.push(amount, amount * factor);
    if (factor > 1) {
      candidates.push(Math.round(amount / 10), Math.round(amount / 100));
    }
    candidates.push(correctAnswer - 1, correctAnswer + 1);
  }

  // Off-by-one around correct
  candidates.push(correctAnswer - 1, correctAnswer + 1, correctAnswer - 2, correctAnswer + 2);

  for (const c of candidates) {
    if (Number.isFinite(c) && Number.isInteger(c) && c > 0 && c !== correctAnswer) {
      choices.add(c);
      if (choices.size >= count) break;
    }
  }

  let guard = 0;
  while (choices.size < count && guard < 80) {
    guard += 1;
    const wrong = correctAnswer + randomInt(-10, 10);
    if (wrong > 0 && wrong !== correctAnswer) {
      choices.add(wrong);
    }
  }

  while (choices.size < count) {
    choices.add(correctAnswer + choices.size + 1);
  }

  return shuffle([...choices]).slice(0, count);
}
