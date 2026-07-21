# Kid Math Practice

A kid-friendly, one-page math practice site. Settings live in the URL so you can bookmark or share a practice mode. Score and timer stay in the browser tab via `sessionStorage`.

Built with plain HTML, CSS, and JavaScript — no build step. Ready for **GitHub Pages**.

## Local preview

From the project root:

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

(Or use any static server / VS Code Live Server.)

## GitHub Pages

1. Push this repo to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, set:
   - **Source:** Deploy from a branch
   - **Branch:** `main` (or your default) → `/ (root)`
4. Save. The site will be at:

   `https://<username>.github.io/kid_education/`

## URL settings

| Param   | Values                                      | Meaning                                      |
|---------|---------------------------------------------|----------------------------------------------|
| `a`     | `1`, `2`, `3`, `4`, `2-3`, `2-4`            | Digit count for the first number             |
| `b`     | same                                        | Digit count for the second number            |
| `op`    | `+`, `-`, `*`, `/` (comma-separated)        | Allowed operations (one or more)             |
| `sign`  | `positive`, `both`                          | Answer must be positive or may have either sign. With `both`, the top bar also shows the count of incorrect answers |
| `time`  | `y`, `n`                                    | Show elapsed session timer                   |
| `input` | `answer`, `multichoice`                     | Type the answer or pick from choices         |
| `layout`| `side`, `column`                            | Show numbers side by side or stacked         |

**Defaults** when a param is missing: `a=1`, `b=1`, `op=+`, `sign=both`, `time=y`, `input=answer`, `layout=side`.

Digit specs:

- `1` → numbers 1–9  
- `2` → 10–99  
- `3` → 100–999  
- `4` → 1000–9999  
- `2-3` / `2-4` → randomly pick a digit count in that range each question  

Division always has an integer answer.

### Example URLs

Easy addition (multiple choice):

```text
?a=1&b=1&op=+&sign=positive&time=y&input=multichoice&layout=side
```

Harder mixed practice (typed answer):

```text
?a=2-4&b=2-3&op=+,-,*&sign=both&time=y&input=answer&layout=column
```

Subtraction with negative results allowed:

```text
?a=2&b=2&op=-&sign=both&time=y&input=answer&layout=column
```

## Using the page

1. Read the equation and enter or choose an answer.
2. Score goes up by 1 for each correct answer.
3. Open **Settings** (top right) to change digits, operations, result sign, timer, answer mode, and number layout.
4. Click **Go** to apply settings, reset the session score/timer, and reload with the new URL.

Score and timer are stored in `sessionStorage` for the current tab only. Changing settings via **Go** resets them.
