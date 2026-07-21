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
│   └── storage.js      # sessionStorage (score, wrong, timer start)
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

To add a new subject later:

1. Create a folder (e.g. `reading/`) with its own `index.html`.
2. Add a tab link on every subject page’s tab bar.
3. Keep subject-specific settings in that page’s URL; reuse shared `css/` / `js/` when helpful.

## Mathematics

### Using the page

1. Read the equation and type an answer or pick a choice.
2. **Score** goes up by 1 for each correct answer.
3. When **Show results** is **Both**, a **Wrong** counter also appears and goes up for incorrect answers.
4. When **Time** is **Yes**, an elapsed timer is shown (`mm:ss`, or `h:mm:ss` after one hour).
5. Open **Settings** (gear, top right) to change digits, operations, results, timer, answer mode, and number layout.
6. Click **Go** to apply settings, reset score / wrong / timer, and reload with the new URL.

Score, wrong count, and timer start time are stored in `sessionStorage` for the current browser tab only.

### URL settings

Base path: `/math/`

| Param    | Values                               | Meaning |
|----------|--------------------------------------|---------|
| `a`      | `1`, `2`, `3`, `4`, `2-3`, `2-4`     | Digit count for the first number |
| `b`      | same                                 | Digit count for the second number |
| `op`     | `+`, `-`, `*`, `/` (comma-separated) | Allowed operations (one or more) |
| `sign`   | `positive`, `both`                   | Answer sign filter. With `both`, also show the **Wrong** counter |
| `time`   | `y`, `n`                             | Show or hide the elapsed session timer |
| `input`  | `answer`, `multichoice`              | Type the answer or pick from choices |
| `layout` | `side`, `column`                     | Side-by-side (`12 + 5 = ?`) or stacked column with answer under the line |

**Defaults** when a param is missing: `a=1`, `b=1`, `op=+`, `sign=both`, `time=y`, `input=answer`, `layout=side`.

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
