# Kid Education

A kid-friendly practice site for subjects, starting with **Mathematics**. Each subject is its own tab/page with its own settings. Settings live in the URL (bookmarkable and shareable). Score, wrong count, and timer stay in the browser tab via `sessionStorage`.

Built with plain HTML, CSS, and JavaScript — no build step. Ready for **GitHub Pages**.

## Project layout

```text
kid_education/
├── index.html          # Redirects to math/ (preserves query params)
├── math/
│   └── index.html      # Mathematics practice page
├── css/
│   └── styles.css      # Shared styles
├── js/
│   ├── app.js          # Math UI (timer, score, answers, settings modal)
│   ├── settings.js     # URL settings parse/serialize
│   ├── generator.js    # Question generation
│   ├── levels.js       # Math level ladder (one spec per level)
│   ├── storage.js      # sessionStorage (score, wrong, timer) + localStorage (level progress)
│   └── times-*.js      # Times Tables game (app, settings, storage, levels)
└── README.md
```

## Local preview

From the project root:

```bash
python3 -m http.server 8080
```

Then open:

- [http://localhost:8080/math/](http://localhost:8080/math/) — Mathematics
- [http://localhost:8080/](http://localhost:8080/) — redirects to `math/` and keeps any `?…` settings

## GitHub Pages

1. Push this repo to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, set:
   - **Source:** Deploy from a branch
   - **Branch:** `main` (or your default) → `/ (root)`
4. Save. The site will be at:

   `https://<username>.github.io/kid_education/math/`

   The root URL redirects to the Mathematics tab.

## Subjects / tabs

The tab bar at the top switches subjects. Each subject is a folder with its own `index.html` and URL settings.

| Tab            | Path     | Status   |
|----------------|----------|----------|
| Mathematics    | `math/`  | Available |
| Times Tables   | `times/` | Available |

To add a new subject later:

1. Create a folder (e.g. `reading/`) with its own `index.html`.
2. Add a tab link on every subject page’s tab bar.
3. Keep subject-specific settings in that page’s URL; reuse shared `css/` / `js/` when helpful.

## Mathematics

### Using the page

1. Read the equation and type an answer or pick a choice.
2. **Score** goes up by 1 for each correct answer.
3. When **Show results** is **Both** (or in Level mode), a **Wrong** counter also appears and goes up for incorrect answers.
4. When **Time** is **Yes**, an elapsed timer is shown (`mm:ss`, or `h:mm:ss` after one hour).
5. Open **Settings** (gear, top right) to pick a level, or switch to **Custom** to choose digits, operations, and results yourself. Timer, answer mode, and number layout apply to every mode.
6. Click **Go** to apply settings instantly, reset score / wrong / timer, and update the URL.

Score, wrong count, and timer start time are stored in `sessionStorage` for the current browser tab only.

### Levels

Level mode is the default. The ladder lives in `js/levels.js` and climbs in small steps so a child can stay on one concept as long as needed:

| Levels | Concept |
|--------|---------|
| 1–8    | Addition and subtraction within 5, 10, 20 |
| 9–10   | Missing numbers (`? + 3 = 7`) within 10 and 20 |
| 11–16  | Two-digit addition and subtraction within 100 |
| 17–29  | Times tables one at a time (×2, ×5, ×10, ×3, ×4, … ×9), then all to 10 and 12 |
| 30–34  | Division as the inverse of the tables, mixed ×/÷, missing factor |
| 35–40  | 3-digit +/−, 2-digit × and ÷ by 1-digit, all four operations, 3–4 digit +/− |

- **Auto-increase:** after 10 correct answers in a row (`LEVEL_UP_TARGET` in `js/levels.js`), the level goes up. A wrong answer restarts the count. The top bar shows the level number and progress (e.g. `4/10`), and the level name appears above the question.
- **Resume:** the current level and progress are saved in `localStorage`, so opening `/math/` again continues where the child left off.
- **Pick a level:** in Settings choose **Level** and any level from the list. Changing the level restarts the progress count.
- Levels are plain data — reorder, split, or add entries in `LEVELS` to change the ladder.

### URL settings

Base path: `/math/`

| Param    | Values                               | Meaning |
|----------|--------------------------------------|---------|
| `level`  | `1`–`40`                             | Level mode at this level. Uses only `time`, `input`, `layout` from the other params. With no `level`, `mode`, `a`, `b`, or `op` in the URL, the saved level is resumed |
| `mode`   | `level`, `default` (omit = custom when `a`/`b`/`op` are set) | Force level or custom mode. Old `mode=times-table` links redirect to the Times Tables game |
| `a`      | `1`, `2`, `3`, `4`, `2-3`, `2-4`     | Digit count for the first number |
| `b`      | same                                 | Digit count for the second number |
| `op`     | `+`, `-`, `*`, `/` (comma-separated) | Allowed operations (one or more) |
| `sign`   | `positive`, `both`                   | Answer sign filter. With `both`, also show the **Wrong** counter |
| `time`   | `y`, `n`                             | Show or hide the elapsed session timer |
| `input`  | `answer`, `multichoice`              | Type the answer or pick from choices |
| `layout` | `side`, `column`                     | Side-by-side (`12 + 5 = ?`) or stacked column with answer under the line |
| `missing`| `y`, `n`                             | Missing-number mode: randomly hide the 1st number, 2nd number, result, or operation (`5 + ? = 12`, `? − 3 = 7`, `5 ? 7 = 12`). With `n`, always ask for the result |

**Defaults** when a param is missing: level mode at the saved level (custom mode as soon as `a`, `b`, or `op` is present), `a=1`, `b=1`, `op=+`, `sign=both`, `time=y`, `input=answer`, `layout=side`, `missing=n`.

Digit specs:

- `1` → 1–9
- `2` → 10–99
- `3` → 100–999
- `4` → 1000–9999
- `2-3` / `2-4` → randomly pick a digit count in that range each question

Notes:

- Division always has an integer answer.
- Encode `+` in `op` as `%2B` in URLs (e.g. `op=%2B,-`).

### Example URLs

Level 7, multiple choice, column layout:

```text
/math/?level=7&time=y&input=multichoice&layout=column
```

Easy addition (multiple choice):

```text
/math/?a=1&b=1&op=%2B&sign=positive&time=y&input=multichoice&layout=side
```

Harder mixed practice (typed answer, column layout, score + wrong):

```text
/math/?a=2-4&b=2-3&op=%2B,-,*&sign=both&time=y&input=answer&layout=column
```

Subtraction with either-sign answers allowed:

```text
/math/?a=2&b=2&op=-&sign=both&time=y&input=answer&layout=column
```

## Times Tables

Its own game at `/times/`, built like Mathematics (same top bar, answer modes, layouts, and level system) but only multiplication.

### Levels

The ladder lives in `js/times-levels.js` (17 levels): ×2, ×10, ×5, then ×2/×5/×10 mixed, ×3, ×4, ×2–×5 and ×10 mixed, ×6, ×7, ×8, ×9, all tables to 10, ×11, ×12, all tables to 12, and finally missing factor (`? × 4 = 24`) to 10 and to 12. A single-table level asks that table times 1–10 (1–12 for ×11 and ×12), in either order.

Auto-increase works the same as Mathematics: 10 correct in a row moves up a level, a wrong answer restarts the count. Progress is saved separately from Mathematics (`kidTimes.*` keys in `localStorage`).

### Custom mode

In Settings choose **Custom** and tick any tables from 1 to 12, pick **Multiply up to** ×10 or ×12, and optionally turn on **Missing number** (hides either factor or the result).

### URL settings

Base path: `/times/`

| Param     | Values                    | Meaning |
|-----------|---------------------------|---------|
| `level`   | `1`–`17`                  | Level mode at this level. Without `level` or `tables`, the saved level is resumed |
| `tables`  | `1`–`12` (comma-separated)| Custom mode with these tables |
| `max`     | `10`, `12`                | Custom mode: largest other factor |
| `missing` | `y`, `n`                  | Custom mode: hide a factor or the result |
| `time`    | `y`, `n`                  | Show or hide the elapsed session timer |
| `input`   | `answer`, `multichoice`   | Type the answer or pick from choices |
| `layout`  | `side`, `column`          | Side-by-side or stacked column |

Examples:

```text
/times/?level=9&time=y&input=multichoice&layout=column
/times/?tables=6,7,8&max=12&missing=n&time=y&input=answer&layout=side
```
