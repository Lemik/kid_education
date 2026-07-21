const OP_SYMBOLS = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(array) {
  return array[randomInt(0, array.length - 1)];
}

/**
 * Parse a digit spec like "1", "2-3", "2-4" into a concrete digit count.
 */
function resolveDigitCount(spec) {
  if (spec.includes('-')) {
    const [lo, hi] = spec.split('-').map(Number);
    return randomInt(lo, hi);
  }
  return Number(spec);
}

/**
 * Inclusive min/max for an n-digit positive integer.
 * 1 digit uses 1–9 (no leading zero).
 */
function digitRange(digits) {
  if (digits <= 1) return { min: 1, max: 9 };
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  return { min, max };
}

function randomByDigits(spec) {
  const digits = resolveDigitCount(spec);
  const { min, max } = digitRange(digits);
  return randomInt(min, max);
}

function compute(a, b, op) {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return a / b;
    default:
      throw new Error(`Unknown op: ${op}`);
  }
}

function matchesSign(answer, sign) {
  if (answer === 0) return false;
  if (sign === 'positive') return answer > 0;
  if (sign === 'negative') return answer < 0;
  return true; // both
}

/**
 * Build an integer-division pair: a / b = quotient (whole number).
 * a has digit count from settings.a; b from settings.b when possible.
 */
function generateDivision(settings) {
  const bDigits = resolveDigitCount(settings.b);
  const aDigits = resolveDigitCount(settings.a);
  const bRange = digitRange(bDigits);
  const aRange = digitRange(aDigits);

  // Prefer quotients that keep a within the target digit range.
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const b = randomInt(bRange.min, bRange.max);
    const maxQ = Math.floor(aRange.max / b);
    const minQ = Math.max(1, Math.ceil(aRange.min / b));
    if (maxQ < minQ) continue;

    const quotient = randomInt(minQ, maxQ);
    const a = b * quotient;
    if (a < aRange.min || a > aRange.max) continue;

    return { a, b, op: '/', answer: quotient };
  }

  // Fallback: pick divisor and quotient, accept resulting a digits.
  const b = randomInt(bRange.min, bRange.max);
  const quotientDigits = Math.max(1, aDigits - bDigits + 1);
  const qRange = digitRange(Math.min(4, quotientDigits));
  const quotient = randomInt(qRange.min, Math.min(qRange.max, 99));
  const a = b * quotient;
  return { a, b, op: '/', answer: quotient };
}

function generateOnce(settings) {
  const op = pick(settings.op);

  if (op === '/') {
    return generateDivision(settings);
  }

  const a = randomByDigits(settings.a);
  const b = randomByDigits(settings.b);
  const answer = compute(a, b, op);
  return { a, b, op, answer };
}

/**
 * Generate a question matching digit, operation, and answer-sign settings.
 */
export function generateQuestion(settings, maxAttempts = 50) {
  let last = null;

  for (let i = 0; i < maxAttempts; i += 1) {
    const candidate = generateOnce(settings);
    last = candidate;

    if (!Number.isInteger(candidate.answer)) continue;
    if (!matchesSign(candidate.answer, settings.sign)) continue;

    return {
      a: candidate.a,
      b: candidate.b,
      op: candidate.op,
      answer: candidate.answer,
      display: `${candidate.a} ${OP_SYMBOLS[candidate.op]} ${candidate.b} = ?`,
    };
  }

  // Soft fallback: return last generated integer answer, or a simple addition.
  if (last && Number.isInteger(last.answer)) {
    return {
      a: last.a,
      b: last.b,
      op: last.op,
      answer: last.answer,
      display: `${last.a} ${OP_SYMBOLS[last.op]} ${last.b} = ?`,
    };
  }

  return {
    a: 1,
    b: 1,
    op: '+',
    answer: 2,
    display: '1 + 1 = ?',
  };
}

/**
 * Build multiple-choice options: correct answer + 3 plausible wrongs.
 */
export function generateChoices(correctAnswer, count = 4) {
  const choices = new Set([correctAnswer]);
  const offsets = [-10, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 10];

  let guard = 0;
  while (choices.size < count && guard < 80) {
    guard += 1;
    let wrong;
    if (Math.random() < 0.7) {
      wrong = correctAnswer + pick(offsets);
    } else {
      wrong = correctAnswer + randomInt(-20, 20);
    }
    if (wrong !== correctAnswer) {
      choices.add(wrong);
    }
  }

  while (choices.size < count) {
    choices.add(correctAnswer + choices.size + 1);
  }

  return shuffle([...choices]);
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export { OP_SYMBOLS };
