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
  if (settings.mode === 'times-table') {
    const a = randomInt(1, 12);
    const b = randomInt(1, 12);
    return { a, b, op: '*', answer: a * b };
  }

  const op = pick(settings.op);

  if (op === '/') {
    return generateDivision(settings);
  }

  const a = randomByDigits(settings.a);
  const b = randomByDigits(settings.b);
  const answer = compute(a, b, op);
  return { a, b, op, answer };
}

const MISSING = ['a', 'b', 'result', 'op'];
const ALL_OPS = ['+', '-', '*', '/'];

function opsMatching(a, b, result, allowedOps) {
  return allowedOps.filter((o) => compute(a, b, o) === result);
}

function buildQuestion({ a, b, op, result, missing }) {
  const sym = OP_SYMBOLS[op];
  let answer;
  let display;

  switch (missing) {
    case 'a':
      answer = a;
      display = `? ${sym} ${b} = ${result}`;
      break;
    case 'b':
      answer = b;
      display = `${a} ${sym} ? = ${result}`;
      break;
    case 'result':
      answer = result;
      display = `${a} ${sym} ${b} = ?`;
      break;
    case 'op':
      answer = op;
      display = `${a} ? ${b} = ${result}`;
      break;
    default:
      throw new Error(`Unknown missing slot: ${missing}`);
  }

  return { a, b, op, result, missing, answer, display };
}

/**
 * Generate a question matching digit, operation, and answer-sign settings.
 * With settings.missing === 'y', randomly hides the 1st number, 2nd number,
 * result, or operation; otherwise always hides the result.
 */
export function generateQuestion(settings, maxAttempts = 50) {
  let last = null;

  for (let i = 0; i < maxAttempts; i += 1) {
    const candidate = generateOnce(settings);
    const result = candidate.answer;

    if (!Number.isInteger(result)) continue;

    last = { a: candidate.a, b: candidate.b, op: candidate.op, result };

    const missing = settings.missing === 'y' ? pick(MISSING) : 'result';

    if (missing === 'op') {
      const matches = opsMatching(candidate.a, candidate.b, result, settings.op);
      if (matches.length !== 1 || matches[0] !== candidate.op) continue;
    }

    const question = buildQuestion({
      a: candidate.a,
      b: candidate.b,
      op: candidate.op,
      result,
      missing,
    });

    if (missing !== 'op' && !matchesSign(question.answer, settings.sign)) continue;

    return question;
  }

  // Soft fallback: result-missing from last integer candidate, or a simple addition.
  if (last) {
    return buildQuestion({ ...last, missing: 'result' });
  }

  return buildQuestion({ a: 1, b: 1, op: '+', result: 2, missing: 'result' });
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

/**
 * Build multiple-choice options for a missing operation.
 * Prefer other ops from allowedOps, then fill from any remaining ops.
 */
export function generateOpChoices(correctOp, allowedOps, count = 4) {
  const choices = [correctOp];
  const pool = [
    ...allowedOps.filter((o) => o !== correctOp),
    ...ALL_OPS.filter((o) => o !== correctOp && !allowedOps.includes(o)),
  ];

  for (const op of shuffle(pool)) {
    if (choices.length >= count) break;
    choices.push(op);
  }

  return shuffle(choices);
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
