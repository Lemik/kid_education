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
 * Sum coin groups: [{ id, count, cents }, ...] ? total cents.
 */
export function totalCents(coins) {
  return coins.reduce((sum, coin) => sum + coin.count * coin.cents, 0);
}

/**
 * Format parts like "2 quarters + 1 dime".
 */
export function formatEquation(coins, catalogById) {
  const parts = coins
    .filter((coin) => coin.count > 0)
    .map((coin) => {
      const def = catalogById[coin.id];
      const name = coin.count === 1 ? def.label : def.plural;
      return `${coin.count} ${name}`;
    });
  return parts.join(' + ');
}

function catalogMap(coinCatalog) {
  const map = {};
  for (const coin of coinCatalog) {
    map[coin.id] = coin;
  }
  return map;
}

function enabledCoins(settings, coinCatalog) {
  const allowed = new Set(settings.coins);
  return coinCatalog.filter((coin) => allowed.has(coin.id));
}

/**
 * Pick a random coin group within maxCoins per type and maxTotal cents.
 * Guarantees at least minTotalCoins coins when possible.
 */
export function pickCoins(settings, coinCatalog, { minTotalCoins = 2 } = {}) {
  const pool = enabledCoins(settings, coinCatalog);
  if (pool.length === 0) {
    return [];
  }

  const maxCoins = settings.maxCoins;
  const maxTotal = settings.maxTotal;
  const byId = catalogMap(coinCatalog);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const counts = {};
    for (const coin of pool) {
      counts[coin.id] = 0;
    }

    // Always include at least one coin type with a positive count.
    const first = pick(pool);
    counts[first.id] = randomInt(1, maxCoins);

    // Optionally add more types.
    for (const coin of shuffle(pool)) {
      if (coin.id === first.id) continue;
      if (Math.random() < 0.55) {
        counts[coin.id] = randomInt(1, maxCoins);
      }
    }

    let coins = pool
      .filter((coin) => counts[coin.id] > 0)
      .map((coin) => ({
        id: coin.id,
        count: counts[coin.id],
        cents: byId[coin.id].cents,
      }));

    let total = totalCents(coins);
    let totalCount = coins.reduce((sum, c) => sum + c.count, 0);

    // Trim expensive coins if over maxTotal.
    while (total > maxTotal && coins.length > 0) {
      // Prefer reducing the highest-value coin first.
      coins.sort((a, b) => b.cents - a.cents);
      const top = coins[0];
      if (top.count > 1) {
        top.count -= 1;
      } else {
        coins.shift();
      }
      total = totalCents(coins);
      totalCount = coins.reduce((sum, c) => sum + c.count, 0);
    }

    if (coins.length === 0 || total < 1 || total > maxTotal) continue;
    if (totalCount < minTotalCoins && pool.length > 0) {
      // Try bumping a small coin if under min count.
      const cheapest = [...pool].sort((a, b) => a.cents - b.cents)[0];
      const existing = coins.find((c) => c.id === cheapest.id);
      if (existing && existing.count < maxCoins) {
        const nextTotal = total + cheapest.cents;
        if (nextTotal <= maxTotal) {
          existing.count += 1;
          total = nextTotal;
          totalCount += 1;
        }
      } else if (!existing && cheapest.cents <= maxTotal - total) {
        coins.push({ id: cheapest.id, count: 1, cents: cheapest.cents });
        total += cheapest.cents;
        totalCount += 1;
      }
    }

    if (totalCount >= Math.min(minTotalCoins, 1) && total >= 1 && total <= maxTotal) {
      // Stable order: by cents descending (largest coins first).
      coins.sort((a, b) => b.cents - a.cents || a.id.localeCompare(b.id));
      return coins;
    }
  }

  // Soft fallback: single cheapest enabled coin.
  const cheapest = [...pool].sort((a, b) => a.cents - b.cents)[0];
  return [{ id: cheapest.id, count: 1, cents: cheapest.cents }];
}

function generateCount(settings, coinCatalog) {
  const coins = pickCoins(settings, coinCatalog, { minTotalCoins: 2 });
  return {
    type: 'count',
    coins,
    answer: totalCents(coins),
    prompt: 'How much is this?',
  };
}

function generateEquation(settings, coinCatalog) {
  const coins = pickCoins(settings, coinCatalog, { minTotalCoins: 2 });
  const byId = catalogMap(coinCatalog);
  const text = formatEquation(coins, byId);
  return {
    type: 'equation',
    coins,
    answer: totalCents(coins),
    display: `${text} = ?`,
    prompt: 'How much is this?',
  };
}

function compareAnswer(totalA, totalB) {
  if (totalA > totalB) return 'A';
  if (totalB > totalA) return 'B';
  return 'same';
}

function generateCompare(settings, coinCatalog) {
  let groupA = pickCoins(settings, coinCatalog, { minTotalCoins: 1 });
  let groupB = pickCoins(settings, coinCatalog, { minTotalCoins: 1 });
  let totalA = totalCents(groupA);
  let totalB = totalCents(groupB);

  // Prefer unequal groups when possible (retry a few times).
  for (let i = 0; i < 12 && totalA === totalB; i += 1) {
    groupB = pickCoins(settings, coinCatalog, { minTotalCoins: 1 });
    totalB = totalCents(groupB);
  }

  return {
    type: 'compare',
    groupA,
    groupB,
    answer: compareAnswer(totalA, totalB),
    totals: { A: totalA, B: totalB },
    prompt: 'Which is bigger?',
  };
}

/**
 * Generate a money question matching enabled types and coin settings.
 */
export function generateQuestion(settings, coinCatalog, maxAttempts = 30) {
  const types = settings.type.length > 0 ? settings.type : ['count'];
  const type = pick(types);

  for (let i = 0; i < maxAttempts; i += 1) {
    let question;
    if (type === 'compare') {
      question = generateCompare(settings, coinCatalog);
    } else if (type === 'equation') {
      question = generateEquation(settings, coinCatalog);
    } else {
      question = generateCount(settings, coinCatalog);
    }

    if (question.type === 'compare') {
      return question;
    }
    if (Number.isFinite(question.answer) && question.answer >= 1) {
      return question;
    }
  }

  // Soft fallback.
  const byId = catalogMap(coinCatalog);
  const dime = byId.dime || coinCatalog[0];
  const coins = [{ id: dime.id, count: 2, cents: dime.cents }];
  return {
    type: 'count',
    coins,
    answer: totalCents(coins),
    prompt: 'How much is this?',
  };
}

/**
 * Multiple-choice options for cent totals (coin-friendly distractors).
 */
export function generateCentChoices(correctAnswer, count = 4) {
  const choices = new Set([correctAnswer]);
  const offsets = [-25, -20, -15, -10, -5, 5, 10, 15, 20, 25, -50, 50];

  let guard = 0;
  while (choices.size < count && guard < 80) {
    guard += 1;
    let wrong;
    if (Math.random() < 0.75) {
      wrong = correctAnswer + pick(offsets);
    } else {
      wrong = correctAnswer + randomInt(-30, 30);
    }
    if (wrong > 0 && wrong !== correctAnswer) {
      choices.add(wrong);
    }
  }

  while (choices.size < count) {
    const next = correctAnswer + choices.size * 5;
    if (next > 0) choices.add(next);
    else choices.add(correctAnswer + choices.size + 1);
  }

  return shuffle([...choices]);
}

export { shuffle, pick, randomInt };
