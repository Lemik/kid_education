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
 * Shuffle letters, retrying so the result is not already the word.
 */
function scrambleLetters(letters) {
  if (letters.length <= 1) return [...letters];

  const original = letters.map((letter) => letter.char).join('');
  let scrambled = shuffle(letters);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (scrambled.map((letter) => letter.char).join('') !== original) {
      return scrambled;
    }
    scrambled = shuffle(letters);
  }

  return scrambled;
}

/**
 * Generate an unscramble question.
 * Returns { word, letters, scrambled, fixedPrefix }.
 */
export function generateQuestion(settings, wordList) {
  const candidates = collectWords(wordList, settings.len);
  const fallback = ['cat', 'dog', 'sun', 'run', 'hat'];
  const pool = candidates.length > 0 ? candidates : fallback;
  const word = pick(pool).toLowerCase();

  const letters = word.split('').map((char, id) => ({ id, char }));
  const fixedPrefix = settings.first === 'y' ? 1 : 0;

  const poolLetters = letters.slice(fixedPrefix);
  const scrambled = scrambleLetters(poolLetters);

  return { word, letters, scrambled, fixedPrefix };
}
