export const OP_SYMBOLS = Object.freeze({ '+': '+', '-': '−', '*': '×', '/': '÷' });

export const PARTS = 5;
const PART_RANGE = 40;
const MAX_VALUE = 9999;

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function range(min, max) {
  const out = [];
  for (let v = min; v <= max; v += 1) out.push(v);
  return out;
}

export function applyOp(op, a, b) {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return a % b === 0 ? a / b : NaN;
    default: return NaN;
  }
}

/**
 * How values[index] is made from two other entries ({ op, a, b, aIndex, bIndex }), or null.
 * Entries are compared by position, so repeated values count separately.
 */
export function findMaking(values, index, ops) {
  const target = values[index];
  for (let j = 0; j < values.length; j += 1) {
    if (j === index) continue;
    for (let k = 0; k < values.length; k += 1) {
      if (k === index || k === j) continue;
      for (const op of ops) {
        if (applyOp(op, values[j], values[k]) === target) {
          return { op, a: values[j], b: values[k], aIndex: j, bIndex: k };
        }
      }
    }
  }
  return null;
}

export function validTargetIndices(values, ops) {
  const out = [];
  for (let i = 0; i < values.length; i += 1) {
    if (findMaking(values, i, ops)) out.push(i);
  }
  return out;
}

/**
 * Every z that would form a relation {p, q, z} under the selected ops
 * (z made from p and q, or p or q made from z and the other).
 * + and − share the same triples, as do × and ÷.
 */
function relatedValues(p, q, ops) {
  const out = [];
  if (ops.includes('+') || ops.includes('-')) {
    out.push(p + q, Math.abs(p - q));
  }
  if (ops.includes('*') || ops.includes('/')) {
    out.push(p * q);
    if (p % q === 0) out.push(p / q);
    if (q % p === 0) out.push(q / p);
  }
  return out;
}

/** Ways to write p = op(a, b) with a, b distinct, ≥ 2, different from p. */
function coresFor(p, op) {
  const out = [];
  switch (op) {
    case '+':
      for (let u = 2; u < p - u; u += 1) out.push([u, p - u]);
      break;
    case '-':
      for (let y = 2; y <= 30; y += 1) if (y !== p) out.push([p + y, y]);
      break;
    case '*':
      for (let d = 2; d * d < p; d += 1) if (p % d === 0) out.push([p / d, d]);
      break;
    case '/':
      for (let y = 2; y <= 12; y += 1) if (y !== p) out.push([p * y, y]);
      break;
    default:
      break;
  }
  return out.filter(([a, b]) => a <= MAX_VALUE && b <= MAX_VALUE);
}

const readyCache = new Map();

/**
 * Can p sit in an object `k` levels above the bottom? k < 0: always.
 * Otherwise p needs a core (p = op(a, b)) whose parts are themselves ready at k − 1,
 * so the object below can be built from it.
 */
function isReady(p, k, ops) {
  if (k < 0) return true;
  if (p < 2 || p > MAX_VALUE) return false;
  const key = `${ops.join('')}|${k}|${p}`;
  if (readyCache.has(key)) return readyCache.get(key);
  let ready = false;
  for (const op of ops) {
    if (coresFor(p, op).some(([a, b]) => isReady(a, k - 1, ops) && isReady(b, k - 1, ops))) {
      ready = true;
      break;
    }
  }
  readyCache.set(key, ready);
  return ready;
}

/** Add distinct fillers that never form a new relation with anything already there. */
function fillTerritories(core, ops, k, hiStart) {
  const values = [...core];
  const used = new Set(values);
  const forbidden = new Set();
  for (let i = 0; i < values.length; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) {
      for (const z of relatedValues(values[i], values[j], ops)) forbidden.add(z);
    }
  }

  let hi = hiStart;
  let candidates = shuffle(range(2, hi));
  while (values.length < PARTS) {
    if (candidates.length === 0) {
      const nextHi = Math.ceil(hi * 1.5);
      candidates = shuffle(range(hi + 1, nextHi));
      hi = nextHi;
      continue;
    }
    const v = candidates.pop();
    if (used.has(v) || forbidden.has(v) || !isReady(v, k, ops)) continue;
    for (const w of values) {
      for (const z of relatedValues(v, w, ops)) forbidden.add(z);
    }
    values.push(v);
    used.add(v);
  }
  return shuffle(values);
}

function finishObject(answer, core, ops, k) {
  const hi = Math.max(PART_RANGE, Math.max(...core) + 10);
  const values = fillTerritories(core, ops, k, hi);
  return {
    values,
    planned: values.indexOf(answer),
    targets: validTargetIndices(values, ops),
  };
}

/** An object whose planned answer is `answer`; its numbers must be ready at level k. */
function objectFor(answer, ops, k) {
  const options = [];
  for (const op of ops) {
    for (const [a, b] of coresFor(answer, op)) {
      if (isReady(a, k, ops) && isReady(b, k, ops)) options.push([a, b]);
    }
  }
  // Prefer the smaller cores so numbers stay kid-sized.
  options.sort((x, y) => Math.max(...x) - Math.max(...y));
  const [a, b] = pick(options.slice(0, Math.max(4, Math.ceil(options.length / 4))));
  return finishObject(answer, [answer, a, b], ops, k);
}

/** The top object: any core whose numbers are all ready at level k. */
function topObject(ops, k) {
  for (const window of [12, 24, 48, 100, 200, 400, 1000]) {
    const ready = range(2, window).filter((v) => isReady(v, k, ops));
    if (ready.length < 2) continue;
    for (let attempt = 0; attempt < 300; attempt += 1) {
      const op = pick(ops);
      const a = pick(ready);
      const b = pick(ready);
      // Core is [answer, first, second] with answer = op(first, second).
      let core;
      if (op === '-') core = [a, a + b, b];
      else if (op === '/') core = [a, a * b, b];
      else core = [applyOp(op, a, b), a, b];
      if (new Set(core).size !== 3 || core.some((v) => v < 2 || v > MAX_VALUE)) continue;
      if (core.every((v) => isReady(v, k, ops))) return finishObject(core[0], core, ops, k);
    }
  }
  throw new Error('Could not build the top object');
}

/**
 * The whole puzzle as a tree: the top object's numbers are the answers of the
 * objects below it, and so on down `levels` levels. Leaves are what the kid sees first.
 * Node: { object: { values, planned, targets }, children: Node[] | null }.
 */
export function generateTree(levels, ops) {
  const build = (answer, depth) => {
    const k = levels - depth - 1;
    const object = answer == null ? topObject(ops, k) : objectFor(answer, ops, k);
    const children = depth < levels ? object.values.map((v) => build(v, depth + 1)) : null;
    return { object, children };
  };
  return build(null, 0);
}
