const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

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

/**
 * Parse a length spec like "3", "3-5", "4-6" into a concrete length.
 */
function resolveLength(spec) {
  if (spec.includes('-')) {
    const [lo, hi] = spec.split('-').map(Number);
    return randomInt(lo, hi);
  }
  return Number(spec);
}

/**
 * Resolve how many letters to hide for a given word length.
 */
function resolveHideCount(hideSpec, wordLength, protectFirst) {
  const maxHide = protectFirst ? Math.max(1, wordLength - 1) : wordLength;
  let count;

  if (hideSpec === 'auto') {
    count = Math.floor(wordLength / 2);
  } else {
    count = Number(hideSpec);
  }

  count = Math.max(1, Math.min(count, maxHide));
  return count;
}

/**
 * Build 4 letter choices for a blank: correct letter + 3 distractors.
 * Prefers same vowel/consonant class when possible.
 */
export function generateLetterChoices(correctLetter, count = 4) {
  const correct = correctLetter.toLowerCase();
  const choices = new Set([correct]);
  const preferVowels = VOWELS.has(correct);
  const preferred = ALPHABET.filter(
    (letter) => letter !== correct && VOWELS.has(letter) === preferVowels,
  );
  const others = ALPHABET.filter(
    (letter) => letter !== correct && VOWELS.has(letter) !== preferVowels,
  );

  // Prefer same vowel/consonant class first, then fall back to the rest.
  for (const letter of [...shuffle(preferred), ...shuffle(others)]) {
    if (choices.size >= count) break;
    choices.add(letter);
  }

  while (choices.size < count) {
    choices.add(ALPHABET[choices.size % ALPHABET.length]);
  }

  return shuffle([...choices]);
}

/**
 * Collect candidate words matching the length setting.
 */
function collectWords(wordList, lengthSpec) {
  if (lengthSpec.includes('-')) {
    const [lo, hi] = lengthSpec.split('-').map(Number);
    const words = [];
    for (let len = lo; len <= hi; len += 1) {
      const bucket = wordList[String(len)];
      if (Array.isArray(bucket)) {
        words.push(...bucket);
      }
    }
    return words;
  }

  const bucket = wordList[lengthSpec];
  return Array.isArray(bucket) ? [...bucket] : [];
}

/**
 * Generate a fill-in-the-blank word question.
 */
export function generateQuestion(settings, wordList) {
  const candidates = collectWords(wordList, settings.len);
  const fallback = ['cat', 'dog', 'sun', 'run', 'hat'];
  const pool = candidates.length > 0 ? candidates : fallback;
  const word = pick(pool).toLowerCase();

  const protectFirst = settings.first === 'y';
  const hideCount = resolveHideCount(settings.hide, word.length, protectFirst);

  const eligible = [];
  for (let i = 0; i < word.length; i += 1) {
    if (protectFirst && i === 0) continue;
    eligible.push(i);
  }

  // Always leave at least one blank when possible.
  const hideIndexes = new Set(shuffle(eligible).slice(0, hideCount));
  if (hideIndexes.size === 0 && word.length > 0) {
    hideIndexes.add(protectFirst && word.length > 1 ? 1 : 0);
  }

  const slots = [];
  const choicesByIndex = {};

  for (let i = 0; i < word.length; i += 1) {
    const letter = word[i];
    const hidden = hideIndexes.has(i);
    slots.push({ index: i, letter, hidden });
    if (hidden && settings.input === 'multichoice') {
      choicesByIndex[i] = generateLetterChoices(letter);
    }
  }

  return { word, slots, choicesByIndex };
}
