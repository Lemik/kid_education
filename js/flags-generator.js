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

const REGIONAL_INDICATOR_A = 0x1f1e6;

/** Turn a two-letter ISO code ("fr") into its emoji flag. */
export function flagEmoji(id) {
  return [...id.toUpperCase()]
    .map((letter) => String.fromCodePoint(REGIONAL_INDICATOR_A + letter.charCodeAt(0) - 65))
    .join('');
}

/**
 * Countries allowed by the region setting.
 */
export function collectPool(flagData, settings) {
  const all = flagData.countries ?? [];
  if (settings.region === 'world') return all;
  if (settings.region === 'popular') return all.filter((c) => c.tier === 1);
  return all.filter((c) => c.continent === settings.region);
}

function resolveKind(settings) {
  if (settings.mode === 'mixed') return pick(['flag', 'name']);
  return settings.mode;
}

/**
 * Wrong answers: same continent first (harder to tell apart), then the rest of the world.
 */
function pickDistractors(country, pool, flagData, count) {
  const others = pool.filter((c) => c.id !== country.id);
  const sameContinent = others.filter((c) => c.continent === country.continent);
  const elsewhere = others.filter((c) => c.continent !== country.continent);
  const ordered = [...shuffle(sameContinent), ...shuffle(elsewhere)];

  if (ordered.length < count) {
    const used = new Set([country.id, ...ordered.map((c) => c.id)]);
    for (const c of shuffle(flagData.countries ?? [])) {
      if (!used.has(c.id)) ordered.push(c);
    }
  }

  return ordered.slice(0, count);
}

/**
 * Build a multiple-choice question.
 * kind "flag": show a flag, choices are country names.
 * kind "name": show a country name, choices are flags.
 */
export function generateQuestion(settings, flagData, previousId = null, choiceCount = 4) {
  const pool = collectPool(flagData, settings);
  const candidates = pool.length > 1 ? pool.filter((c) => c.id !== previousId) : pool;
  const country = pick(candidates);
  const kind = resolveKind(settings);
  const options = shuffle([country, ...pickDistractors(country, pool, flagData, choiceCount - 1)]);

  return {
    kind,
    country,
    choices: options.map((c) => ({ id: c.id, name: c.name, flag: flagEmoji(c.id) })),
  };
}

/**
 * Build a match board: the same countries in two independently shuffled columns.
 */
export function generateMatchBoard(settings, flagData) {
  const pool = collectPool(flagData, settings);
  const size = Math.min(settings.pairs, pool.length);
  const chosen = shuffle(pool).slice(0, size).map((c) => ({
    id: c.id,
    name: c.name,
    flag: flagEmoji(c.id),
  }));

  return {
    flags: shuffle(chosen),
    names: shuffle(chosen),
  };
}
