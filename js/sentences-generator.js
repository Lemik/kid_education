const FALLBACK_TEMPLATE = {
  id: 'fallback',
  before: 'The ',
  after: ' sits on the rug.',
  words: ['cat', 'dog', 'fox', 'pig'],
};

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
 * Expand a length spec like "3" or "3-5" into a set of allowed lengths.
 */
function allowedLengths(spec) {
  if (spec.includes('-')) {
    const [lo, hi] = spec.split('-').map(Number);
    const lengths = new Set();
    for (let len = lo; len <= hi; len += 1) {
      lengths.add(len);
    }
    return lengths;
  }
  return new Set([Number(spec)]);
}

function templateWords(template) {
  return (template.words ?? []).map((word) => word.toLowerCase());
}

/**
 * Build word choices: the correct word + distractors that do NOT fit the
 * sentence (words of the same length taken from the word bank, excluding
 * every word that would also make sense in this template).
 */
export function generateWordChoices(correctWord, template, wordList, count = 4) {
  const correct = correctWord.toLowerCase();
  const valid = new Set(templateWords(template));
  const bucket = wordList[String(correct.length)] ?? [];

  const distractors = shuffle(
    bucket.map((word) => word.toLowerCase()).filter((word) => !valid.has(word)),
  );

  const choices = new Set([correct]);
  for (const word of distractors) {
    if (choices.size >= count) break;
    choices.add(word);
  }

  // Pad from other template words if the bank bucket is too small.
  for (const word of shuffle([...valid])) {
    if (choices.size >= count) break;
    choices.add(word);
  }

  return shuffle([...choices]);
}

/**
 * Templates that have at least one answer word of an allowed length.
 */
function filterTemplates(templates, lengths) {
  return templates.filter((template) =>
    templateWords(template).some((word) => lengths.has(word.length)),
  );
}

/**
 * Generate a fill-in-the-blank sentence question.
 * The answer always comes from the template's curated word list, so the
 * completed sentence makes sense.
 */
export function generateQuestion(settings, wordList, templates) {
  const lengths = allowedLengths(settings.len);

  let eligible = filterTemplates(templates, lengths);
  if (eligible.length === 0) {
    eligible = templates.length > 0 ? templates : [FALLBACK_TEMPLATE];
  }

  const template = pick(eligible);
  const fitting = templateWords(template).filter((word) => lengths.has(word.length));
  const answerPool = fitting.length > 0 ? fitting : templateWords(template);
  const answer = pick(answerPool);

  const question = {
    templateId: template.id ?? `${template.before}${template.after}`,
    before: template.before,
    after: template.after,
    answer,
    // Any of these words completes the sentence correctly (used to accept
    // typed answers beyond the randomly chosen one).
    validWords: templateWords(template),
  };

  if (settings.input === 'multichoice') {
    question.choices = generateWordChoices(answer, template, wordList);
  }

  return question;
}
