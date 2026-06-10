# DB Query Playground (live engine)

An interactive playground for practising **PostgreSQL**, **MongoDB** and **Redis** queries — with **real query execution** and **automatic grading**. Built for the *IT 2008 Database Systems* course.

You write a query, press **Check**, and the app runs it for real, shows the actual result **table/records**, and tells you if it's **correct (green)** or **wrong (red)** by comparing your output to the model answer on the same seed data.

---

## What it's for

- Hands-on practice of the three databases that appear on the practical exam.
- Three difficulty phases, three databases, real execution, instant feedback.
- No accounts, no database servers to install — everything runs in the browser.

## How to run

You only need to serve the folder over HTTP (WebAssembly won't load from a bare `file://` double-click). From inside the project folder, start a tiny static server with **Python**:

```bash
python -m http.server 8000
# if "python" is not found, try:
py -m http.server 8000
```

Then open **http://localhost:8000** in a modern browser (Chrome, Edge, Firefox).

> Alternative: in VS Code, install the **Live Server** extension and right-click `index.html` → *Open with Live Server*.

> **Internet is needed on first load** — the PostgreSQL engine (PGlite) and MongoDB engine (mingo) are pulled from a CDN. See *Making it fully offline* below to remove that requirement.

## How to use it

1. Pick a **phase**: Beginner → Intermediate → Hard.
2. Pick a **database**: PostgreSQL / MongoDB / Redis. The sidebar shows the schema/keyspace you query against.
3. Choose a task, type your query, press **Check** (or `Ctrl/Cmd+Enter`).
   - ✅ **Green** + your records = correct.
   - ❌ **Red** + your records, with the **expected result** shown underneath = wrong.
4. **Run only** executes your query without grading (handy for experimenting).
   **Show answer** fills in the model solution. **Hint** shows the start of it.
5. The sidebar dots track progress (green solved / red attempted); progress is saved in your browser.
6. When a phase has more than one page of tasks, use **“See next 20”** (Beginner/Intermediate) or **“See next 10”** (Hard) to page through them.

## How it works (grading)

The key idea: the app runs **your answer** *and* the **model answer** against the **same seed data**, then compares the results. So correctness is judged on real output, not on how you worded the query.

| Tab | Engine | What runs | How "correct" is decided |
|-----|--------|-----------|--------------------------|
| **PostgreSQL** | **PGlite** — real PostgreSQL compiled to WebAssembly | your actual SQL | result rows compared as a multiset (read queries) or full table state (UPDATE/DELETE/INSERT) |
| **MongoDB** | **mingo** — real MongoDB query/aggregation engine in JS | your actual `find`/`aggregate`/… | returned documents compared (or resulting collection for updates/deletes) |
| **Redis** | a small **built-in command emulator** | your actual commands | last reply **and** resulting keyspace compared |

Because both your answer and the model answer go through the **same** engine, grading is consistent. PostgreSQL and MongoDB use genuine engines; the Redis layer is a faithful emulator covering the commands used in the tasks.

Comparison is intentionally a little lenient: it ignores column **order** and **aliases** for SQL, and row order for unordered queries — so a correct query written a different way still passes. If you think your answer is right but it's marked wrong, press **Show answer** to compare.

## Project structure

```
db-playground/
├── index.html   # UI + styles
├── app.js       # engines, seed data, grading, tasks, UI logic
└── README.md
```

All tasks live in the `TASKS_RAW` array in `app.js` as `[phase, db, prompt, modelAnswer]`. **Adding tasks is easy** — append rows; pages (“See next …”) appear automatically once a phase has more than one page.

## Seed data

- **PostgreSQL:** 14 `employees`, 4 `departments`, 6 `projects` (defined in `PG_SEED`).
- **MongoDB:** 14 `books`, 10 `authors` (`MONGO_SEED`).
- **Redis:** strings, a hash, a list, two sets, two sorted sets, a TTL key, a bitmap and a HyperLogLog (`redisSeed()`).

The seed is reset before every check, so tasks never interfere with each other.

## Tech

- [PGlite](https://github.com/electric-sql/pglite) — PostgreSQL in WebAssembly.
- [mingo](https://github.com/kofrasa/mingo) — MongoDB query language in JavaScript.
- A custom Redis command emulator (in `app.js`).
- Plain HTML/CSS/JS — no build step, no framework.

## Making it fully offline (optional)

To remove the CDN dependency so it works with zero internet:

1. Download the two libraries and place them in a local `vendor/` folder:
   ```bash
   npm i @electric-sql/pglite mingo
   ```
2. In `app.js`, change the two dynamic `import('https://esm.sh/…')` lines to point at your local copies (e.g. `./vendor/pglite/index.js`).
3. Commit `vendor/` to the repo. Now `git clone` + a static server works with no internet.

## Notes / limitations

- A few advanced MongoDB operators (e.g. `$setWindowFields`) may not be supported by the in-browser engine; those tasks will show an engine error rather than grade. Everything else runs.
- The Redis layer is an emulator, not a real Redis server (so it isn't measuring performance — only correctness of the commands).

---

*Made for IT 2008 Database Systems. Free to use and adapt for teaching.*
