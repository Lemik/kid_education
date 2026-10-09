/**
 * Find a Llama boards: an n × n grid split into n connected color regions,
 * with n llamas placed one per row, column, and color, never touching
 * (not even diagonally). Every generated board has exactly one solution,
 * so the child can always find the llamas by reasoning alone.
 */

const MAX_RESTARTS = 400;
const MAX_FIXES = 200;

function randomInt(n) {
  return Math.floor(Math.random() * n);
}

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function neighbors(index, n) {
  const row = Math.floor(index / n);
  const col = index % n;
  const out = [];
  if (row > 0) out.push(index - n);
  if (row < n - 1) out.push(index + n);
  if (col > 0) out.push(index - 1);
  if (col < n - 1) out.push(index + 1);
  return out;
}

/** Column for each row; neighboring rows never use neighboring columns. */
function placeLlamas(n) {
  const cols = [];
  const used = new Set();

  function place(row) {
    if (row === n) return true;
    for (const col of shuffle([...Array(n).keys()])) {
      if (used.has(col)) continue;
      if (row > 0 && Math.abs(cols[row - 1] - col) <= 1) continue;
      cols.push(col);
      used.add(col);
      if (place(row + 1)) return true;
      cols.pop();
      used.delete(col);
    }
    return false;
  }

  return place(0) ? cols : null;
}

/**
 * Grow one region from each llama until the grid is full.
 * Compact grows the smallest region from any edge; twisty keeps extending
 * from the newest square so regions snake around.
 */
function growRegions(n, llamaCols, shape, lockedRegion) {
  const regions = new Array(n * n).fill(-1);
  const members = llamaCols.map((col, row) => {
    const index = row * n + col;
    regions[index] = row;
    return [index];
  });
  let left = n * n - n;

  function frontier(region, from) {
    const out = [];
    for (const index of from) {
      for (const next of neighbors(index, n)) {
        if (regions[next] === -1) out.push(next);
      }
    }
    return out;
  }

  while (left > 0) {
    const order = shape === 'twisty'
      ? shuffle([...Array(n).keys()])
      : shuffle([...Array(n).keys()]).sort((a, b) => members[a].length - members[b].length);

    let grown = false;
    for (const region of order) {
      if (region === lockedRegion) continue;
      const cells = members[region];
      let options = shape === 'twisty' ? frontier(region, [cells[cells.length - 1]]) : [];
      if (options.length === 0) options = frontier(region, cells);
      if (options.length === 0) continue;
      const pick = options[randomInt(options.length)];
      regions[pick] = region;
      cells.push(pick);
      left -= 1;
      grown = true;
      break;
    }
    if (!grown) return null;
  }

  return regions;
}

/** Up to `limit` solutions, each a column per row. */
export function findSolutions(n, regions, limit = 2) {
  const solutions = [];
  const cols = [];
  const usedCols = new Set();
  const usedRegions = new Set();

  function search(row) {
    if (solutions.length >= limit) return;
    if (row === n) {
      solutions.push([...cols]);
      return;
    }
    for (let col = 0; col < n; col += 1) {
      if (usedCols.has(col)) continue;
      if (row > 0 && Math.abs(cols[row - 1] - col) <= 1) continue;
      const region = regions[row * n + col];
      if (usedRegions.has(region)) continue;
      cols.push(col);
      usedCols.add(col);
      usedRegions.add(region);
      search(row + 1);
      cols.pop();
      usedCols.delete(col);
      usedRegions.delete(region);
    }
  }

  search(0);
  return solutions;
}

/** True when `region` stays connected after removing `removed`. */
function staysConnected(n, regions, region, removed) {
  const cells = [];
  regions.forEach((r, index) => {
    if (r === region && index !== removed) cells.push(index);
  });
  if (cells.length === 0) return false;

  const seen = new Set([cells[0]]);
  const stack = [cells[0]];
  while (stack.length > 0) {
    const index = stack.pop();
    for (const next of neighbors(index, n)) {
      if (next === removed || seen.has(next) || regions[next] !== region) continue;
      seen.add(next);
      stack.push(next);
    }
  }
  return seen.size === cells.length;
}

/**
 * Move one square of a wrong solution into a neighboring color so that
 * solution stops working. Returns false when no square can move.
 */
function breakSolution(n, regions, llamaSet, wrongCols, lockedRegion) {
  const candidates = shuffle(
    wrongCols.map((col, row) => row * n + col).filter((index) => !llamaSet.has(index)),
  );

  for (const index of candidates) {
    const from = regions[index];
    const targets = shuffle(
      [...new Set(neighbors(index, n).map((next) => regions[next]))].filter((r) => r !== from && r !== lockedRegion),
    );
    if (targets.length === 0) continue;
    if (!staysConnected(n, regions, from, index)) continue;
    regions[index] = targets[0];
    return true;
  }
  return false;
}

/**
 * Build a board for `settings` ({ size, shape, single }).
 * With `single`, one color is a lone square, so that llama is a sure start.
 * Returns { size, regions, llamas } where `regions[i]` is the color of square i
 * and `llamas` is the set of square indexes hiding a llama.
 */
export function generateBoard(settings) {
  const n = settings.size;

  for (let attempt = 0; attempt < MAX_RESTARTS; attempt += 1) {
    const cols = placeLlamas(n);
    if (!cols) continue;
    const lockedRegion = settings.single ? randomInt(n) : -1;
    const regions = growRegions(n, cols, settings.shape, lockedRegion);
    if (!regions) continue;
    const llamaSet = new Set(cols.map((col, row) => row * n + col));

    for (let fix = 0; fix < MAX_FIXES; fix += 1) {
      const solutions = findSolutions(n, regions, 2);
      if (solutions.length === 1) {
        return { size: n, regions, llamas: llamaSet };
      }
      const wrong = solutions.find((sol) => sol.some((col, row) => col !== cols[row]));
      if (!wrong || !breakSolution(n, regions, llamaSet, wrong, lockedRegion)) break;
    }
  }

  throw new Error(`Could not build a ${n} × ${n} llama board`);
}
