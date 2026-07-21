import { generateChoices } from './generator.js';

const TERM_COUNT = 4; // 3 shown + 1 answer
const VISIBLE_COUNT = TERM_COUNT - 1;
const MAX_ANSWER = 500;
const MUL_FACTORS = new Set([2, 3, 5, 10]);

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(array) {
  return array[randomInt(0, array.length - 1)];
}

/**
 * Parse a start-range spec like "1-20" into { min, max }.
 */
function parseStartRange(spec) {
  const [lo, hi] = String(spec).split('-').map(Number);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi) {
    return { min: 1, max: 20 };
  }
  return { min: lo, max: hi };
}

function buildAddition(start, step) {
  const terms = [];
  for (let i = 0; i < TERM_COUNT; i += 1) {
    terms.push(start + i * step);
  }
  return terms;
}

function buildSubtraction(start, step) {
  const terms = [];
  for (let i = 0; i < TERM_COUNT; i += 1) {
    terms.push(start - i * step);
  }
  return terms;
}

function buildMultiplication(start, factor) {
  const terms = [];
  let value = start;
  for (let i = 0; i < TERM_COUNT; i += 1) {
    terms.push(value);
    value *= factor;
  }
  return terms;
}

function isValidTerms(terms) {
  if (terms.length !== TERM_COUNT) return false;
  for (const term of terms) {
    if (!Number.isInteger(term) || term < 1) return false;
  }
  if (terms[TERM_COUNT - 1] > MAX_ANSWER) return false;
  return true;
}

function generateAddition(settings) {
  const { min, max } = parseStartRange(settings.start);
  const step = pick(settings.step);
  const start = randomInt(min, max);
  return { rule: '+', step, terms: buildAddition(start, step) };
}

function generateSubtraction(settings) {
  const { min, max } = parseStartRange(settings.start);
  const step = pick(settings.step);
  // Answer (term at index 3) must stay >= 1: start - 3*step >= 1 → start >= 1 + 3*step
  const minStart = Math.max(min, 1 + VISIBLE_COUNT * step);
  if (minStart > max) {
    // Range too small for this step; bump start above range minimum.
    const start = minStart;
    return { rule: '-', step, terms: buildSubtraction(start, step) };
  }
  const start = randomInt(minStart, max);
  return { rule: '-', step, terms: buildSubtraction(start, step) };
}

function generateMultiplication(settings) {
  const { min, max } = parseStartRange(settings.start);
  const factors = settings.step.filter((n) => MUL_FACTORS.has(n) && n >= 2);
  const factor = pick(factors.length > 0 ? factors : [2, 3, 5]);

  // start * factor^3 <= MAX_ANSWER → start <= floor(MAX_ANSWER / factor^3)
  const maxStartByCap = Math.floor(MAX_ANSWER / factor ** VISIBLE_COUNT);
  const effectiveMax = Math.min(max, Math.max(1, maxStartByCap));
  const effectiveMin = Math.min(min, effectiveMax);
  const start = randomInt(effectiveMin, effectiveMax);
  return { rule: '*', step: factor, terms: buildMultiplication(start, factor) };
}

function generateOnce(settings) {
  const rule = pick(settings.rule);

  if (rule === '-') {
    return generateSubtraction(settings);
  }
  if (rule === '*') {
    return generateMultiplication(settings);
  }
  return generateAddition(settings);
}

/**
 * Generate a number-pattern question matching rule, step, and start-range settings.
 * Returns { terms, answer, display, rule, step }.
 */
export function generateQuestion(settings, maxAttempts = 50) {
  let last = null;

  for (let i = 0; i < maxAttempts; i += 1) {
    const candidate = generateOnce(settings);
    last = candidate;

    if (!isValidTerms(candidate.terms)) continue;

    const answer = candidate.terms[TERM_COUNT - 1];
    const shown = candidate.terms.slice(0, VISIBLE_COUNT);
    return {
      terms: candidate.terms,
      answer,
      display: `${shown.join(', ')}, ?`,
      rule: candidate.rule,
      step: candidate.step,
    };
  }

  // Soft fallback: simple +2 pattern.
  if (last && isValidTerms(last.terms)) {
    const answer = last.terms[TERM_COUNT - 1];
    const shown = last.terms.slice(0, VISIBLE_COUNT);
    return {
      terms: last.terms,
      answer,
      display: `${shown.join(', ')}, ?`,
      rule: last.rule,
      step: last.step,
    };
  }

  return {
    terms: [2, 4, 6, 8],
    answer: 8,
    display: '2, 4, 6, ?',
    rule: '+',
    step: 2,
  };
}

export { generateChoices, TERM_COUNT, VISIBLE_COUNT, MAX_ANSWER };
