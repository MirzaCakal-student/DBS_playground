# Extending the DB Query Playground (instructor / AI guide)

This guide is written so an instructor can **hand it to an AI assistant (e.g. Claude)** together with the project files and say *"do X"*. It explains how the playground is built and gives ready-made instructions for the most common changes: adding tasks, changing the sample data, adding a whole new database system, and updating the diagrams.

> **How to use this file with an AI:** open a chat, attach `app.js` (and this file), and paste one of the *Prompt templates* at the bottom, filling in what you want. The AI has everything it needs here to make the change safely.

---

## 1. What the project is

A single-page, browser-only playground for practising **PostgreSQL, MongoDB and Redis**. It runs queries **for real** (no server install) and grades them by comparing the student's result to a model answer on the same seed data.

```
db-playground/
├── index.html     # markup (tabs, editor, result area)
├── styles.css     # all styling + the animated-diagram CSS
├── app.js         # EVERYTHING ELSE: engines, seed data, tasks, grading, UI
├── README.md      # how to run / how it works (for students)
└── EXTENDING.md   # this file (for instructors + AI)
```

Run it with `python -m http.server 8000` from the folder, then open `http://localhost:8000`.

## 2. Engines (how queries actually run)

| Database | Engine | Loaded in `app.js` |
|----------|--------|--------------------|
| PostgreSQL | **PGlite** (real Postgres in WebAssembly) | `initPG()` |
| MongoDB | **mingo** (real Mongo query/aggregation engine) | `initMongo()` |
| Redis | a built-in **command emulator** | `execRedisLine()` / `redisRun()` |

Both engines are pulled from a CDN. The three status dots top-right (`#st-pg`, `#st-mongo`, `#st-redis`) turn green when an engine is ready.

## 3. How a task is defined

All tasks live in one array in `app.js` called **`TASKS_RAW`**. Each task is a 4-element row:

```js
[ phase, db, prompt, modelAnswer ]
```

- **phase** — `1` Beginner · `2` Intermediate · `3` Hard
- **db** — `'pg'` · `'mongo'` · `'redis'`
- **prompt** — the question shown to the student (a string; use backticks)
- **modelAnswer** — a **correct** query that the engine can run; the student's answer is graded against *its* result

Example rows:

```js
[1,'pg',`Find products priced above 500.`,`SELECT * FROM products WHERE price > 500;`],
[2,'mongo',`Average review rating per book.`,`db.reviews.aggregate([ { $group: { _id: '$book', avgRating: { $avg: '$rating' } } } ])`],
[1,'redis',`Get the value of pageviews.`,`GET pageviews`],
```

> **Golden rule:** the `modelAnswer` must actually execute against the seed data. If it errors, that task can't be graded. (For Mongo, also stick to operators mingo supports — `$group $match $sort $limit $project $unwind $lookup $bucket $addFields` etc.)

## 4. How grading works (so you trust it)

In `grade()` the app:
1. runs the **model answer** on a fresh copy of the seed,
2. runs the **student answer** on a fresh copy,
3. compares the two results — match → green, differ → red (and shows the expected result).

It's deliberately lenient: SQL comparison ignores column order/aliases and (for unordered queries) row order. Redis compares the last reply **and** the resulting keyspace. So a correct query written differently still passes.

## 5. The sample data (seeds)

- **PostgreSQL** — the SQL string **`PG_SEED`** (tables `employees, departments, projects, products, customers, orders, order_items`).
- **MongoDB** — the object **`MONGO_SEED`** (collections `books, authors, reviews`).
- **Redis** — the function **`redisSeed()`** (strings, hash, list, sets, sorted sets, ttl key, bitmap, hll).

The seed is reset before every check, so tasks never interfere.

## 6. The sidebar diagram

The animated entity diagrams come from the **`DIAGRAMS`** object in `app.js` (`pg`, `mongo`, `redis`), rendered by `renderSchema()`. The plain-text schema shown under it comes from **`SCHEMAS`**. If you change a seed, update both so the picture matches.

---

## 7. Recipe A — add more tasks

1. Open `app.js`, find `const TASKS_RAW = [`.
2. Append rows in the `[phase, db, prompt, modelAnswer]` format (mind the commas).
3. Make sure each `modelAnswer` runs against the seed.

Pages appear automatically: each level shows 20 tasks per page (10 for Hard), with a **"See next 20/10"** button once there's more than one page.

## 8. Recipe B — change or grow the sample data

- Postgres: edit `PG_SEED` (add `CREATE TABLE` / `INSERT`, and a matching `DROP TABLE IF EXISTS` at the top).
- Mongo: add documents/collections to `MONGO_SEED`.
- Redis: add keys in `redisSeed()`.
- Then update `SCHEMAS` + `DIAGRAMS` for that database so the sidebar matches.

## 9. Recipe C — add a whole new database system (e.g. Neo4j, SQLite, Cassandra…)

This is the bigger change. Steps, all in the two front-end files:

1. **Add a tab** in `index.html` inside `#dbTabs`:
   ```html
   <div class="dbtab" data-db="neo4j">Neo4j</div>
   ```
   and a status dot in the header `.status` block: `<span><span class="dot-s" id="st-neo4j"></span>Neo4j</span>`.
2. **Pick an engine** that runs in the browser (or write an emulator like the Redis one). Add an `initNeo4j()` that loads it and turns the dot green (`stEl.neo4j.classList.add('up')`).
3. **Add a `run` path**: a function that takes the student's text, executes it, and returns rows (or a reply). Model it on `pgRun` / `mongoRun` / `redisRun`.
4. **Add a grading branch** inside `grade()` for `db==='neo4j'` that runs student + model and compares results (reuse `canonMongo`/`bagPG`-style comparison).
5. **Add seed data**, plus entries in `SCHEMAS` and `DIAGRAMS` for `neo4j`.
6. **Add tasks** with `db:'neo4j'` in `TASKS_RAW`.
7. Update `labelDb()` so the new key maps to a display name.

That's the full surface area — the UI, pagination, persistence and progress tracking all work automatically once the new `db` key is wired in.

## 10. Recipe D — change difficulty sizes / page sizes

- Page size lives in `pageSize()` (returns `phase===3 ? 10 : 20`). Change those numbers to re-page.
- "How many tasks per level" is just how many rows you put in `TASKS_RAW` for that `(phase, db)`.

---

## 11. Prompt templates to give the AI

Paste one of these into a chat **with `app.js` and this file attached**, filling in the brackets:

- **Add tasks**
  > "Using EXTENDING.md, add [N] new [Beginner/Intermediate/Hard] **[PostgreSQL/MongoDB/Redis]** tasks to `TASKS_RAW`. They should cover [topic, e.g. window functions / `$lookup` joins / sorted sets]. Make sure every model answer runs against the existing seed."

- **Add a table/collection and tasks for it**
  > "Add a new [table `invoices` / collection `customers`] to the [PG_SEED / MONGO_SEED] with ~[N] sample rows, update SCHEMAS and DIAGRAMS to show it, then add [N] tasks that use it."

- **Add a new database system**
  > "Following Recipe C in EXTENDING.md, add a new database tab for **[Neo4j/SQLite/…]** using [engine/library]. Wire up the tab, status dot, engine init, run function, a grading branch in `grade()`, seed data, SCHEMAS/DIAGRAMS entries, and 10 sample tasks."

- **Tune difficulty**
  > "Make each level have [40/40/20] tasks per database, and change the Hard page size to [10]."

- **Re-style**
  > "Keep the logic the same but restyle the UI to [light theme / our university colours #RRGGBB], editing only styles.css."

## 12. Gotchas

- **Must be served over HTTP** (WebAssembly won't load from a double-clicked `file://`). Use `python -m http.server`.
- **Internet on first load** (engines come from a CDN). See *Making it fully offline* in README.md to vendor them.
- **Every model answer must execute** — test new tasks in the running page (open it, paste the model answer, press *Run only*) before shipping a batch.
- A few advanced Mongo operators (e.g. `$setWindowFields`) may not be supported by the in-browser engine; prefer the supported ones listed in §3.

---

*Hand this file to an AI assistant with `app.js` attached and describe what you want — the structure above is all it needs.*
