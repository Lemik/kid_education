import { awardCoins, levelCoins, streakBonus, setCoinPractice } from './coins.js';
import { getGameProgress, markLevelDone, setGameProgress } from './profile.js';

/** Saved level and progress toward the next one, kept on the profile. */
export function createLevelStore(game) {
  return {
    getLevel: () => getGameProgress(game).level,
    setLevel: (level) => setGameProgress(game, { level }),
    getStreak: () => getGameProgress(game).streak,
    setStreak: (count) => setGameProgress(game, { streak: count }),
    setMastered: (done) => setGameProgress(game, { mastered: done }),
    completed: () => getGameProgress(game).completed,
    markDone: (level) => markLevelDone(game, level),
  };
}

/**
 * A level ladder. Every level can be played. Finishing one marks it done.
 * A done level can be played again and pays nothing. `levels` is a list of
 * `{ label }` specs.
 */
export function createLadder({ levels, target, store }) {
  const clamp = (level) => {
    const n = Math.floor(Number(level));
    return Number.isFinite(n) ? Math.min(levels.length, Math.max(1, n)) : 1;
  };

  const ladder = {
    levels,
    target,
    saved: () => clamp(store.getLevel()),
    streak: () => store.getStreak(),

    isDone: (level) => store.completed().includes(clamp(level)),

    /**
     * The chosen level, clamped to the ladder. Starting an unfinished level
     * makes it the one in progress and clears the streak from the previous one.
     */
    resolve(requested) {
      const level = clamp(requested == null ? ladder.saved() : requested);
      if (!ladder.isDone(level) && level !== ladder.saved()) {
        store.setLevel(level);
        store.setStreak(0);
      }
      return level;
    },

    isCurrent: (level) => level === ladder.saved(),

    /** A done level, or anything outside level mode, earns nothing. */
    syncPractice(level, levelMode = true) {
      setCoinPractice(!levelMode || ladder.isDone(level));
    },

    progressText: () => `${store.getStreak()}/${target}`,

    /** Show the level chip and label (hidden outside level mode) and the purse's practice tag. */
    render({ wrap, value, progress, label }, level, levelMode) {
      ladder.syncPractice(level, levelMode);
      wrap.hidden = !levelMode;
      if (label) label.hidden = !levelMode;
      if (!levelMode) return;
      const spec = levels[clamp(level) - 1];
      value.textContent = String(level);
      progress.textContent = ladder.isDone(level) ? '✓' : ladder.progressText();
      if (label) label.textContent = spec.label;
      wrap.title = `Level ${level}: ${spec.label}`;
    },

    /**
     * Count one win at `level`. Returns `{ next }` when the child moves up,
     * `{ mastered: true }` at the top, or null otherwise. A done level does not count.
     */
    recordWin(level) {
      const n = clamp(level);
      if (ladder.isDone(n)) return null;
      if (!ladder.isCurrent(n)) {
        store.setLevel(n);
        store.setStreak(0);
      }
      const streak = store.getStreak() + 1;
      if (streak < target) {
        store.setStreak(streak);
        return null;
      }
      store.setStreak(0);
      store.markDone(n);
      if (n >= levels.length) {
        store.setMastered?.(true);
        return { mastered: true };
      }
      store.setLevel(n + 1);
      return { next: n + 1 };
    },

    recordMiss(level) {
      const n = clamp(level);
      if (!ladder.isDone(n) && ladder.isCurrent(n)) store.setStreak(0);
    },

    /**
     * Pay for a win at `level`. A done level pays nothing. Returns the amount paid.
     * Call before `recordWin`, which may move the saved level past `level`.
     */
    pay({ level, streak = 0, fromEl = null, multiplier = 1 }) {
      if (ladder.isDone(level)) return 0;
      const amount = levelCoins(level, levels.length) * multiplier + streakBonus(streak);
      awardCoins({ amount, fromEl });
      return amount;
    },

    /** Fill a level select. Finished levels show a check and stay playable. */
    fillSelect(select) {
      const saved = ladder.saved();
      select.replaceChildren(
        ...levels.map((spec, index) => {
          const n = index + 1;
          const option = document.createElement('option');
          option.value = String(n);
          const mark = ladder.isDone(n) ? '✓ ' : '';
          option.textContent = `${mark}${n} — ${spec.label}`;
          option.selected = n === saved;
          return option;
        }),
      );
    },
  };
  return ladder;
}

/**
 * Settings for one level of a preset ladder: the level's `preset` fields
 * override `base` (which keeps display choices like time and answer mode).
 */
export function presetLevelSettings(levels, level, base) {
  const n = Math.min(levels.length, Math.max(1, Math.floor(Number(level)) || 1));
  const spec = levels[n - 1];
  return { ...base, ...spec.preset, mode: 'level', level: n, label: spec.label };
}
