import { resolveItemIds } from './geography-settings.js';

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

const PLACE_TOPICS = ['capital', 'capital-reverse', 'abbrev', 'abbrev-reverse'];
const ALL_TOPICS = [...PLACE_TOPICS, 'facts'];

/**
 * Filter provinces/territories by settings subset / items.
 */
export function collectPool(geoData, settings) {
  const ids = new Set(resolveItemIds(settings));
  const list = geoData.provincesAndTerritories ?? [];
  return list.filter((item) => ids.has(item.id));
}

function resolveTopic(settings) {
  if (settings.topic === 'mixed') {
    return pick(ALL_TOPICS);
  }
  return settings.topic;
}

function buildCapitalQuestion(item) {
  return {
    display: `What is the capital of ${item.name}?`,
    answer: item.capital,
    topic: 'capital',
    itemId: item.id,
    answerType: 'text',
  };
}

function buildCapitalReverseQuestion(item) {
  return {
    display: `${item.capital} is the capital of which province or territory?`,
    answer: item.name,
    topic: 'capital-reverse',
    itemId: item.id,
    answerType: 'text',
  };
}

function buildAbbrevQuestion(item) {
  return {
    display: `What province or territory is ${item.abbrev}?`,
    answer: item.name,
    topic: 'abbrev',
    itemId: item.id,
    answerType: 'text',
  };
}

function buildAbbrevReverseQuestion(item) {
  return {
    display: `What is the postal abbreviation for ${item.name}?`,
    answer: item.abbrev,
    topic: 'abbrev-reverse',
    itemId: item.id,
    answerType: 'text',
  };
}

function buildFactQuestion(fact) {
  return {
    display: fact.prompt,
    answer: String(fact.answer),
    topic: 'facts',
    itemId: fact.id,
    answerType: fact.answerType,
  };
}

/**
 * Generate a geography question matching topic + subset settings.
 */
export function generateQuestion(settings, geoData) {
  const topic = resolveTopic(settings);

  if (topic === 'facts') {
    const facts = geoData.nationalFacts ?? [];
    if (facts.length === 0) {
      return {
        display: 'What is the capital of Canada?',
        answer: 'Ottawa',
        topic: 'facts',
        itemId: 'capital-canada',
        answerType: 'text',
      };
    }
    return buildFactQuestion(pick(facts));
  }

  const pool = collectPool(geoData, settings);
  const fallback = (geoData.provincesAndTerritories ?? [])[0] ?? {
    id: 'on',
    name: 'Ontario',
    capital: 'Toronto',
    abbrev: 'ON',
    type: 'province',
    region: 'central',
    famousCities: ['Ottawa'],
  };
  const item = pool.length > 0 ? pick(pool) : fallback;

  switch (topic) {
    case 'capital':
      return buildCapitalQuestion(item);
    case 'capital-reverse':
      return buildCapitalReverseQuestion(item);
    case 'abbrev':
      return buildAbbrevQuestion(item);
    case 'abbrev-reverse':
      return buildAbbrevReverseQuestion(item);
    default:
      return buildCapitalQuestion(item);
  }
}

/**
 * Collect distractor strings for a place-based question.
 */
function placeDistractors(correct, pool, topic, correctItem) {
  const candidates = [];

  // Same-region first
  const sameRegion = pool.filter(
    (item) => item.id !== correctItem?.id && item.region === correctItem?.region,
  );
  const others = pool.filter(
    (item) => item.id !== correctItem?.id && item.region !== correctItem?.region,
  );

  const ordered = [...shuffle(sameRegion), ...shuffle(others)];

  for (const item of ordered) {
    if (topic === 'capital') {
      candidates.push(item.capital);
    } else if (topic === 'capital-reverse' || topic === 'abbrev') {
      candidates.push(item.name);
    } else if (topic === 'abbrev-reverse') {
      candidates.push(item.abbrev);
    }
  }

  // Famous wrong cities for capital questions (e.g. Vancouver for BC)
  if (topic === 'capital' && correctItem) {
    for (const city of correctItem.famousCities ?? []) {
      candidates.unshift(city);
    }
    // Also pull famous cities from other places in the pool
    for (const item of ordered) {
      for (const city of item.famousCities ?? []) {
        candidates.push(city);
      }
    }
  }

  return candidates;
}

/**
 * Numeric fact distractors (off-by-one and nearby).
 */
function numberDistractors(correctAnswer) {
  const n = Number(correctAnswer);
  if (!Number.isFinite(n)) return [];
  return [n - 1, n + 1, n - 2, n + 2, n + 3, 9, 11, 12, 14]
    .filter((v) => v > 0 && String(v) !== String(correctAnswer))
    .map(String);
}

/**
 * Build multiple-choice options with geography-aware distractors.
 */
export function generateGeographyChoices(question, geoData, settings, count = 4) {
  const correct = String(question.answer);
  const choices = new Set([correct]);
  const pool = collectPool(geoData, settings);
  const correctItem = pool.find((item) => item.id === question.itemId)
    ?? (geoData.provincesAndTerritories ?? []).find((item) => item.id === question.itemId);

  let candidates = [];

  if (question.topic === 'facts' && question.answerType === 'number') {
    candidates = numberDistractors(correct);
  } else if (question.topic === 'facts') {
    // Text national facts (e.g. capital of Canada) — use provincial capitals + famous cities
    for (const item of shuffle(geoData.provincesAndTerritories ?? [])) {
      candidates.push(item.capital);
      for (const city of item.famousCities ?? []) {
        candidates.push(city);
      }
    }
    candidates.push('Toronto', 'Montreal', 'Vancouver', 'Calgary');
  } else {
    candidates = placeDistractors(correct, pool, question.topic, correctItem);
  }

  for (const c of candidates) {
    const value = String(c);
    if (value && value !== correct) {
      choices.add(value);
      if (choices.size >= count) break;
    }
  }

  // Fallback fillers from full Canada list
  if (choices.size < count) {
    const all = geoData.provincesAndTerritories ?? [];
    for (const item of shuffle(all)) {
      let filler;
      if (question.topic === 'capital') filler = item.capital;
      else if (question.topic === 'abbrev-reverse') filler = item.abbrev;
      else filler = item.name;

      if (filler && filler !== correct) {
        choices.add(filler);
        if (choices.size >= count) break;
      }
    }
  }

  while (choices.size < count) {
    choices.add(`${correct} (${choices.size})`);
  }

  return shuffle([...choices]).slice(0, count);
}
