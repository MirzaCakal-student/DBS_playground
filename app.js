/* ============================================================
   DB Query Playground — live engine
   PostgreSQL = PGlite (real Postgres in WASM)
   MongoDB    = mingo (real query/aggregation engine)
   Redis      = built-in command emulator
   Grading: run student answer AND model answer on the same seed,
            compare the results -> green (match) / red (differ).
   ============================================================ */

/* ---------- library imports (CDN) ---------- */
let PGlite, Query, Aggregator, mingoOK = false, pgOK = false;
const stEl = { pg: document.getElementById('st-pg'), mongo: document.getElementById('st-mongo'), redis: document.getElementById('st-redis') };
stEl.redis.classList.add('up'); // emulator always available

/* ---------- SEED DATA ---------- */
const PG_SEED = `
DROP VIEW  IF EXISTS game_sales_report CASCADE;
DROP TABLE IF EXISTS sessions  CASCADE;
DROP TABLE IF EXISTS reviews   CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS games     CASCADE;
DROP TABLE IF EXISTS players   CASCADE;
DROP TABLE IF EXISTS studios   CASCADE;
CREATE TABLE studios (studio_id SERIAL PRIMARY KEY, name TEXT NOT NULL, country TEXT NOT NULL, founded INT);
CREATE TABLE games (game_id SERIAL PRIMARY KEY, title TEXT NOT NULL, genre TEXT NOT NULL, studio_id INT REFERENCES studios(studio_id), price NUMERIC(6,2) NOT NULL, release_year INT, multiplayer BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE players (player_id SERIAL PRIMARY KEY, username TEXT NOT NULL, country TEXT NOT NULL, joined INT, premium BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE purchases (purchase_id SERIAL PRIMARY KEY, player_id INT NOT NULL REFERENCES players(player_id), game_id INT NOT NULL REFERENCES games(game_id), purchased_on DATE NOT NULL, amount_paid NUMERIC(6,2) NOT NULL);
CREATE TABLE reviews (review_id SERIAL PRIMARY KEY, game_id INT NOT NULL REFERENCES games(game_id), player_id INT NOT NULL REFERENCES players(player_id), rating INT CHECK (rating BETWEEN 1 AND 5), body TEXT NOT NULL, posted_on DATE NOT NULL);
CREATE TABLE sessions (session_id SERIAL PRIMARY KEY, player_id INT NOT NULL REFERENCES players(player_id), game_id INT NOT NULL REFERENCES games(game_id), played_on DATE NOT NULL, duration_min INT NOT NULL, score INT NOT NULL);
INSERT INTO studios (studio_id, name, country, founded) VALUES
  (1,'Orbit Games','Germany',2012),(2,'Mythos Studio','UK',2009),(3,'Cortex Labs','Spain',2015);
INSERT INTO games (game_id, title, genre, studio_id, price, release_year, multiplayer) VALUES
  (1,'Nebula Raiders','Shooter',1,29.99,2021,TRUE),(2,'Kingdom of Ash','RPG',2,49.99,2022,TRUE),
  (3,'Pixel Racer','Racing',1,0.00,2020,TRUE),(4,'Mind Maze','Puzzle',3,9.99,2019,FALSE),
  (5,'Frostbite Frontier','Survival',2,24.99,2023,TRUE),(6,'Galaxy Builder','Strategy',3,19.99,2021,FALSE),
  (7,'Shadow Clash','Shooter',1,0.00,2022,TRUE),(8,'Dragon Tactics','RPG',2,39.99,2020,FALSE),
  (9,'Block Stacker','Puzzle',3,4.99,2018,FALSE),(10,'Turbo Drift','Racing',1,14.99,2023,TRUE),
  (11,'Empire Rising','Strategy',2,34.99,2024,TRUE),(12,'Lost Expedition','Survival',3,22.50,2024,FALSE);
INSERT INTO players (player_id, username, country, joined, premium) VALUES
  (101,'shadowfox','Germany',2020,TRUE),(102,'ninaplays','Germany',2021,FALSE),
  (103,'carlos_v','Spain',2019,TRUE),(104,'dave99','UK',2022,FALSE),
  (105,'elenap','Romania',2020,TRUE),(106,'farouk_a','Germany',2023,FALSE);
INSERT INTO purchases (player_id, game_id, purchased_on, amount_paid) VALUES
  (101,1,'2024-01-05',29.99),(101,2,'2024-01-11',44.99),(103,1,'2024-01-14',29.99),
  (102,4,'2024-01-20',9.99),(104,10,'2024-02-01',14.99),(105,2,'2024-02-04',49.99),
  (106,5,'2024-02-13',24.99),(103,8,'2024-02-19',39.99),(105,11,'2024-03-04',34.99),
  (101,5,'2024-04-09',19.99),(103,8,'2024-04-19',34.99),(105,2,'2024-04-24',49.99),
  (104,6,'2024-05-01',19.99),(102,8,'2024-05-10',39.99);
INSERT INTO reviews (game_id, player_id, rating, body, posted_on) VALUES
  (1,101,5,'Fast paced space shooter with stunning visuals and tight controls. The multiplayer battles are intense and addictive.','2024-01-20'),
  (1,103,4,'Solid shooter, great space combat, though the campaign feels short. Multiplayer carries it.','2024-01-25'),
  (2,101,5,'An epic fantasy RPG with deep story and rich world building. Hundreds of hours of quests and dragons.','2024-02-01'),
  (2,105,4,'Beautiful RPG world and a memorable story, but the combat gets repetitive after a while.','2024-02-15'),
  (5,106,4,'Brutal survival game set in a frozen wilderness. Crafting and exploration are deeply rewarding.','2024-03-01'),
  (8,103,5,'Tactical RPG with dragons and clever turn-based combat. Challenging strategy at every battle.','2024-03-10'),
  (4,102,3,'A relaxing puzzle game, decent brain teasers but it gets a bit boring after the first hour.','2024-03-22'),
  (11,105,5,'Grand strategy at its finest. Build an empire, wage war, manage resources. Endlessly replayable.','2024-04-05'),
  (10,104,3,'Arcade racing fun but the track variety is limited. Drifting feels great though.','2024-04-18'),
  (7,102,4,'Free to play shooter that is surprisingly polished. Frantic multiplayer firefights everywhere.','2024-05-02'),
  (6,104,4,'Clever space strategy game. Building a galaxy spanning civilization is very satisfying.','2024-05-12');
INSERT INTO sessions (player_id, game_id, played_on, duration_min, score) VALUES
  (101,1,'2024-01-10',45,1200),(101,2,'2024-01-12',120,3400),(103,1,'2024-01-15',30,900),
  (102,7,'2024-01-18',60,1500),(104,3,'2024-02-02',25,400),(105,2,'2024-02-05',90,2800),
  (101,1,'2024-02-09',50,1600),(106,5,'2024-02-14',75,2100),(103,8,'2024-02-20',110,3000),
  (102,7,'2024-03-01',40,1100),(105,11,'2024-03-05',130,4200),(104,10,'2024-03-08',35,700),
  (101,2,'2024-03-12',95,2600),(106,1,'2024-03-15',55,1400),(103,1,'2024-03-20',60,1800),
  (102,4,'2024-03-25',20,600),(105,11,'2024-04-01',140,4500),(104,3,'2024-04-04',30,500),
  (101,5,'2024-04-10',80,2300),(106,7,'2024-04-15',45,1300),(103,8,'2024-04-20',105,2900),
  (105,2,'2024-04-25',100,3100),(102,7,'2024-05-02',65,1700),(101,1,'2024-05-08',40,1250),
  (104,10,'2024-05-12',50,950);
CREATE VIEW game_sales_report AS
SELECT p.purchase_id, pl.username, pl.country AS player_country, pl.premium,
       g.title AS game_title, g.genre, s.name AS studio, s.country AS studio_country,
       p.purchased_on, p.amount_paid
FROM purchases p
JOIN players pl ON pl.player_id = p.player_id
JOIN games g ON g.game_id = p.game_id
JOIN studios s ON s.studio_id = g.studio_id;
`;

const MONGO_SEED = {
  games: [
    {_id:1,title:'Nebula Raiders',genre:'Shooter',studio:'Orbit Games',price:29.99,releaseYear:2021,multiplayer:true},
    {_id:2,title:'Kingdom of Ash',genre:'RPG',studio:'Mythos Studio',price:49.99,releaseYear:2022,multiplayer:true},
    {_id:3,title:'Pixel Racer',genre:'Racing',studio:'Orbit Games',price:0,releaseYear:2020,multiplayer:true},
    {_id:4,title:'Mind Maze',genre:'Puzzle',studio:'Cortex Labs',price:9.99,releaseYear:2019,multiplayer:false},
    {_id:5,title:'Frostbite Frontier',genre:'Survival',studio:'Mythos Studio',price:24.99,releaseYear:2023,multiplayer:true},
    {_id:6,title:'Galaxy Builder',genre:'Strategy',studio:'Cortex Labs',price:19.99,releaseYear:2021,multiplayer:false},
    {_id:7,title:'Shadow Clash',genre:'Shooter',studio:'Orbit Games',price:0,releaseYear:2022,multiplayer:true},
    {_id:8,title:'Dragon Tactics',genre:'RPG',studio:'Mythos Studio',price:39.99,releaseYear:2020,multiplayer:false},
    {_id:9,title:'Block Stacker',genre:'Puzzle',studio:'Cortex Labs',price:4.99,releaseYear:2018,multiplayer:false},
    {_id:10,title:'Turbo Drift',genre:'Racing',studio:'Orbit Games',price:14.99,releaseYear:2023,multiplayer:true},
    {_id:11,title:'Empire Rising',genre:'Strategy',studio:'Mythos Studio',price:34.99,releaseYear:2024,multiplayer:true},
    {_id:12,title:'Lost Expedition',genre:'Survival',studio:'Cortex Labs',price:22.50,releaseYear:2024,multiplayer:false}
  ],
  players: [
    {_id:101,username:'shadowfox',country:'Germany',joined:2020,premium:true},
    {_id:102,username:'ninaplays',country:'Germany',joined:2021,premium:false},
    {_id:103,username:'carlos_v',country:'Spain',joined:2019,premium:true},
    {_id:104,username:'dave99',country:'UK',joined:2022,premium:false},
    {_id:105,username:'elenap',country:'Romania',joined:2020,premium:true},
    {_id:106,username:'farouk_a',country:'Germany',joined:2023,premium:false}
  ],
  sessions: [
    {_id:5001,username:'shadowfox',country:'Germany',premium:true,gameTitle:'Nebula Raiders',genre:'Shooter',studio:'Orbit Games',playedOn:new Date('2024-01-10'),durationMin:45,score:1200,tags:['solo','casual']},
    {_id:5002,username:'shadowfox',country:'Germany',premium:true,gameTitle:'Kingdom of Ash',genre:'RPG',studio:'Mythos Studio',playedOn:new Date('2024-01-12'),durationMin:120,score:3400,tags:['solo','ranked','streamed']},
    {_id:5003,username:'carlos_v',country:'Spain',premium:true,gameTitle:'Nebula Raiders',genre:'Shooter',studio:'Orbit Games',playedOn:new Date('2024-01-15'),durationMin:30,score:900,tags:['solo','casual','defeat']},
    {_id:5004,username:'ninaplays',country:'Germany',premium:false,gameTitle:'Shadow Clash',genre:'Shooter',studio:'Orbit Games',playedOn:new Date('2024-01-18'),durationMin:60,score:1500,tags:['co-op','casual','victory']},
    {_id:5005,username:'dave99',country:'UK',premium:false,gameTitle:'Pixel Racer',genre:'Racing',studio:'Orbit Games',playedOn:new Date('2024-02-02'),durationMin:25,score:400,tags:['co-op','casual','defeat']},
    {_id:5006,username:'elenap',country:'Romania',premium:true,gameTitle:'Kingdom of Ash',genre:'RPG',studio:'Mythos Studio',playedOn:new Date('2024-02-05'),durationMin:90,score:2800,tags:['solo','ranked','victory']},
    {_id:5007,username:'shadowfox',country:'Germany',premium:true,gameTitle:'Nebula Raiders',genre:'Shooter',studio:'Orbit Games',playedOn:new Date('2024-02-09'),durationMin:50,score:1600,tags:['solo','ranked','victory']},
    {_id:5008,username:'farouk_a',country:'Germany',premium:false,gameTitle:'Frostbite Frontier',genre:'Survival',studio:'Mythos Studio',playedOn:new Date('2024-02-14'),durationMin:75,score:2100,tags:['solo','casual','victory']},
    {_id:5009,username:'carlos_v',country:'Spain',premium:true,gameTitle:'Dragon Tactics',genre:'RPG',studio:'Mythos Studio',playedOn:new Date('2024-02-20'),durationMin:110,score:3000,tags:['solo','ranked','victory','streamed']},
    {_id:5010,username:'ninaplays',country:'Germany',premium:false,gameTitle:'Shadow Clash',genre:'Shooter',studio:'Orbit Games',playedOn:new Date('2024-03-01'),durationMin:40,score:1100,tags:['co-op','casual','defeat']},
    {_id:5011,username:'elenap',country:'Romania',premium:true,gameTitle:'Empire Rising',genre:'Strategy',studio:'Mythos Studio',playedOn:new Date('2024-03-05'),durationMin:130,score:4200,tags:['solo','ranked','victory','streamed']},
    {_id:5012,username:'dave99',country:'UK',premium:false,gameTitle:'Turbo Drift',genre:'Racing',studio:'Orbit Games',playedOn:new Date('2024-03-08'),durationMin:35,score:700,tags:['co-op','casual','victory']},
    {_id:5013,username:'shadowfox',country:'Germany',premium:true,gameTitle:'Kingdom of Ash',genre:'RPG',studio:'Mythos Studio',playedOn:new Date('2024-03-12'),durationMin:95,score:2600,tags:['solo','ranked','victory']},
    {_id:5014,username:'farouk_a',country:'Germany',premium:false,gameTitle:'Nebula Raiders',genre:'Shooter',studio:'Orbit Games',playedOn:new Date('2024-03-15'),durationMin:55,score:1400,tags:['solo','casual','victory']},
    {_id:5015,username:'carlos_v',country:'Spain',premium:true,gameTitle:'Nebula Raiders',genre:'Shooter',studio:'Orbit Games',playedOn:new Date('2024-03-20'),durationMin:60,score:1800,tags:['co-op','ranked','victory']},
    {_id:5016,username:'ninaplays',country:'Germany',premium:false,gameTitle:'Mind Maze',genre:'Puzzle',studio:'Cortex Labs',playedOn:new Date('2024-03-25'),durationMin:20,score:600,tags:['solo','casual','defeat']},
    {_id:5017,username:'elenap',country:'Romania',premium:true,gameTitle:'Empire Rising',genre:'Strategy',studio:'Mythos Studio',playedOn:new Date('2024-04-01'),durationMin:140,score:4500,tags:['solo','ranked','victory','streamed']},
    {_id:5018,username:'dave99',country:'UK',premium:false,gameTitle:'Pixel Racer',genre:'Racing',studio:'Orbit Games',playedOn:new Date('2024-04-04'),durationMin:30,score:500,tags:['co-op','casual','defeat']},
    {_id:5019,username:'shadowfox',country:'Germany',premium:true,gameTitle:'Frostbite Frontier',genre:'Survival',studio:'Mythos Studio',playedOn:new Date('2024-04-10'),durationMin:80,score:2300,tags:['solo','casual','victory']},
    {_id:5020,username:'farouk_a',country:'Germany',premium:false,gameTitle:'Shadow Clash',genre:'Shooter',studio:'Orbit Games',playedOn:new Date('2024-04-15'),durationMin:45,score:1300,tags:['co-op','ranked','defeat']},
    {_id:5021,username:'carlos_v',country:'Spain',premium:true,gameTitle:'Dragon Tactics',genre:'RPG',studio:'Mythos Studio',playedOn:new Date('2024-04-20'),durationMin:105,score:2900,tags:['solo','ranked','victory']},
    {_id:5022,username:'elenap',country:'Romania',premium:true,gameTitle:'Kingdom of Ash',genre:'RPG',studio:'Mythos Studio',playedOn:new Date('2024-04-25'),durationMin:100,score:3100,tags:['solo','ranked','victory','streamed']},
    {_id:5023,username:'ninaplays',country:'Germany',premium:false,gameTitle:'Shadow Clash',genre:'Shooter',studio:'Orbit Games',playedOn:new Date('2024-05-02'),durationMin:65,score:1700,tags:['co-op','casual','victory']},
    {_id:5024,username:'shadowfox',country:'Germany',premium:true,gameTitle:'Nebula Raiders',genre:'Shooter',studio:'Orbit Games',playedOn:new Date('2024-05-08'),durationMin:40,score:1250,tags:['solo','casual','victory']},
    {_id:5025,username:'dave99',country:'UK',premium:false,gameTitle:'Turbo Drift',genre:'Racing',studio:'Orbit Games',playedOn:new Date('2024-05-12'),durationMin:50,score:950,tags:['co-op','casual','defeat']}
  ]
};

const REDIS_SEED = `SET total_students 5
SET total_courses 4
HSET department:CS name "Computer Science" building "Block A"
HSET department:EE name "Electrical Engineering" building "Block B"
HSET student:1001 name "Alice Brown" year 2 gpa 3.6 status active
HSET student:1002 name "John Smith" year 1 gpa 3.2 status active
HSET student:1003 name "Maria Lopez" year 3 gpa 3.9 status active
HSET student:1004 name "Tom Becker" year 2 gpa 2.8 status active
HSET student:1005 name "Sara Khan" year 1 gpa 3.4 status active
HSET course:CS101 name "Data Structures" credits 6
HSET course:CS102 name "Databases" credits 6
HSET course:EE201 name "Circuits" credits 5
HSET course:CS103 name "Algorithms" credits 6
HSET instructor:5001 name "Dr. Miller" title "Professor"
HSET instructor:5002 name "Dr. Novak" title "Lecturer"
SADD university:departments CS EE
SADD department:CS:students 1001 1002 1003 1004
SADD department:EE:students 1005
SADD department:CS:courses CS101 CS102 CS103
SADD department:EE:courses EE201
SADD student:1001:courses CS101 CS102
SADD student:1002:courses CS101
SADD student:1003:courses CS101 CS102 CS103
SADD student:1004:courses CS103
SADD student:1005:courses EE201
SADD course:CS101:students 1001 1002 1003
SADD course:CS102:students 1001 1003
SADD course:CS103:students 1003 1004
SADD course:EE201:students 1005
SET course:CS101:instructor 5001
SET course:CS102:instructor 5001
SET course:CS103:instructor 5002
SET course:EE201:instructor 5002
RPUSH student:1001:activity "Logged in"
RPUSH student:1001:activity "Viewed course CS101"
RPUSH student:1001:activity "Enrolled in CS101"
RPUSH student:1001:activity "Enrolled in CS102"
ZADD course:CS101:grades 88 1001 75 1002 91 1003
ZADD course:CS102:grades 84 1001 95 1003
ZADD course:CS103:grades 67 1003 82 1004
SET session:1001 active EX 1800`;
function redisSeed(){
  const db = Object.create(null);
  REDIS_SEED.split(/\n+/).map(l=>l.trim()).filter(Boolean).forEach(line=>{ try{ execRedisLine(db, tokenize(line)); }catch(e){} });
  return db;
}

/* ================= POSTGRES (PGlite) ================= */
let pg = null;
async function initPG(){
  try{
    const mod = await import('https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js');
    PGlite = mod.PGlite;
    pg = (PGlite && PGlite.create) ? await PGlite.create() : new PGlite();
    await pg.exec(PG_SEED);
    pgOK = true; stEl.pg.classList.add('up'); stEl.pg.title = 'loaded';
  }catch(e){ stEl.pg.classList.add('down'); window.__pgErr = String((e&&e.message)||e); stEl.pg.title = window.__pgErr; console.error('PGlite init failed',e); }
}
async function pgReseed(){ await pg.exec(PG_SEED); }
async function pgSnapshot(){
  try{
    const q = async s => (await pg.query(s)).rows;
    return JSON.stringify([await q('SELECT * FROM games ORDER BY game_id'), await q('SELECT * FROM players ORDER BY player_id'), await q('SELECT * FROM purchases ORDER BY purchase_id')]);
  }catch(e){ return ''; }
}
async function pgRun(sql){
  // returns {rows, fields, state, error}
  let rows=[], fields=[], error=null;
  try{
    const res = await pg.exec(sql);
    const last = res[res.length-1];
    if(last){ rows = last.rows||[]; fields = (last.fields||[]).map(f=>f.name); }
  }catch(e){ error = String(e.message||e); }
  const state = await pgSnapshot();
  return {rows, fields, state, error};
}

/* ================= MONGODB (mingo) ================= */
async function initMongo(){
  try{
    const m = await import('https://esm.sh/mingo@6.4.4');
    Query = m.Query; Aggregator = m.Aggregator;
    await import('https://esm.sh/mingo@6.4.4/init/system');
    mingoOK = true; stEl.mongo.classList.add('up');
  }catch(e){ stEl.mongo.classList.add('down'); console.error('mingo init failed',e); }
}
function clone(x){ return JSON.parse(JSON.stringify(x)); }
function evalArgs(s){ return Function('"use strict"; return [' + s + '];')(); }

// parse db.coll.op( ... ) with optional .sort().skip().limit().count()
function parseMongo(text){
  text = text.trim().replace(/;+\s*$/,'');
  const head = text.match(/^db\.([A-Za-z_]\w*)\.([A-Za-z_]\w*)\(/);
  if(!head) throw new Error("Expected db.<collection>.<op>( ... )");
  const coll = head[1], op = head[2].toLowerCase();
  let i = head[0].length - 1; // at '('
  const argStr = balanced(text, i);
  let rest = text.slice(i + argStr.len + 2); // skip '(' ... ')'
  const args = evalArgs(argStr.inner);
  const chain = [];
  const re = /\.([A-Za-z_]\w*)\(/g; let mm;
  while((mm = re.exec(rest))){
    const at = mm.index + mm[0].length - 1;
    const b = balanced(rest, at);
    chain.push({name: mm[1].toLowerCase(), arg: b.inner.trim()? evalArgs(b.inner)[0] : undefined});
    re.lastIndex = at + b.len + 2;
  }
  return {coll, op, args, chain};
}
// given string and index of '(', return {inner, len} where len = length of inner
function balanced(s, openIdx){
  let depth=0, i=openIdx, inStr=null, start=openIdx+1;
  for(; i<s.length; i++){
    const c=s[i];
    if(inStr){ if(c===inStr && s[i-1]!=='\\') inStr=null; continue; }
    if(c==='"'||c==="'"||c==='`'){ inStr=c; continue; }
    if(c==='('||c==='['||c==='{') depth++;
    else if(c===')'||c===']'||c==='}'){ depth--; if(depth===0){ return {inner: s.slice(start,i), len: i-start}; } }
  }
  throw new Error("Unbalanced parentheses");
}

function mongoMatch(doc, q){ return new Query(q||{}).test(doc); }
function applyUpdate(doc, upd){
  for(const op in upd){ const spec=upd[op];
    if(op==='$set'){ for(const k in spec) setPath(doc,k,spec[k]); }
    else if(op==='$unset'){ for(const k in spec) delete doc[k]; }
    else if(op==='$inc'){ for(const k in spec) doc[k]=(doc[k]||0)+spec[k]; }
    else if(op==='$mul'){ for(const k in spec) doc[k]=(doc[k]||0)*spec[k]; }
    else if(op==='$push'){ for(const k in spec){ doc[k]=doc[k]||[]; const v=spec[k]; if(v&&v.$each) doc[k].push(...v.$each); else doc[k].push(v);} }
    else if(op==='$addToSet'){ for(const k in spec){ doc[k]=doc[k]||[]; const v=spec[k]; const add=(v&&v.$each)?v.$each:[v]; add.forEach(x=>{ if(!doc[k].some(e=>JSON.stringify(e)===JSON.stringify(x))) doc[k].push(x); }); } }
    else if(op==='$pull'){ for(const k in spec){ if(Array.isArray(doc[k])) doc[k]=doc[k].filter(e=>JSON.stringify(e)!==JSON.stringify(spec[k])); } }
    else if(op==='$rename'){ for(const k in spec){ if(k in doc){ doc[spec[k]]=doc[k]; delete doc[k]; } } }
  }
}
function setPath(o,k,v){ o[k]=v; }
function mongoMutate(coll, op, args){
  const c = clone(coll);
  if(op==='insertone'){ c.push(args[0]); }
  else if(op==='insertmany'){ args[0].forEach(d=>c.push(d)); }
  else if(op==='deleteone'){ const i=c.findIndex(d=>mongoMatch(d,args[0])); if(i>=0)c.splice(i,1); }
  else if(op==='deletemany'){ for(let i=c.length-1;i>=0;i--) if(mongoMatch(c[i],args[0])) c.splice(i,1); }
  else if(op==='updateone'){ const d=c.find(d=>mongoMatch(d,args[0])); if(d) applyUpdate(d,args[1]); }
  else if(op==='updatemany'||op==='update'){ c.forEach(d=>{ if(mongoMatch(d,args[0])) applyUpdate(d,args[1]); }); }
  else throw new Error('Unsupported write op: '+op);
  return c;
}
const READ_OPS = new Set(['find','findone','aggregate','count','countdocuments','distinct']);
function mongoRun(text, collections){
  const {coll, op, args, chain} = parseMongo(text);
  const data = collections[coll] || [];
  if(op==='find' || op==='findone'){
    let cur = new Query(args[0]||{}).find(data, args[1]);
    for(const ch of chain){ if(ch.name==='sort')cur=cur.sort(ch.arg); else if(ch.name==='skip')cur=cur.skip(ch.arg); else if(ch.name==='limit')cur=cur.limit(ch.arg); }
    let rows = cur.all();
    if(op==='findone') rows = rows.slice(0,1);
    if(chain.some(c=>c.name==='count')) return {kind:'scalar', value: rows.length};
    return {kind:'rows', rows};
  }
  if(op==='aggregate'){
    const agg = new Aggregator(args[0], { collectionResolver:(n)=>collections[n]||[] });
    return {kind:'rows', rows: agg.run(data)};
  }
  if(op==='count'||op==='countdocuments'){
    const rows = new Query(args[0]||{}).find(data).all();
    return {kind:'scalar', value: rows.length};
  }
  if(op==='distinct'){
    const field = args[0]; const q = args[1]||{};
    const set = new Set(); new Query(q).find(data).all().forEach(d=>{ if(d[field]!==undefined) set.add(JSON.stringify(d[field])); });
    return {kind:'rows', rows:[...set].map(s=>({[field]:JSON.parse(s)}))};
  }
  // mutation
  const after = mongoMutate(data, op, args);
  return {kind:'state', rows: after};
}

/* ================= REDIS emulator ================= */
function tokenize(line){
  const out=[]; let cur='', q=null;
  for(let i=0;i<line.length;i++){ const c=line[i];
    if(q){ if(c===q)q=null; else cur+=c; }
    else if(c==='"'||c==="'"){ q=c; }
    else if(/\s/.test(c)){ if(cur!==''){out.push(cur);cur='';} }
    else cur+=c;
  }
  if(cur!=='')out.push(cur);
  return out;
}
function asNum(x){ return parseFloat(x); }
function ensure(db,key,t,init){ if(!db[key]){ db[key]={t,v:init}; } return db[key]; }
function execRedisLine(db, args){
  if(!args.length) return null;
  const cmd=args[0].toUpperCase(), k=args[1];
  const get=(key)=>db[key];
  switch(cmd){
    case 'SET': { db[k]={t:'str',v:args[2]}; for(let i=3;i<args.length-1;i++){ const f=(args[i]||'').toUpperCase(); if(f==='EX')db[k].ttl=+args[i+1]; else if(f==='PX')db[k].ttl=(+args[i+1])/1000; } return 'OK'; }
    case 'SETNX': if(db[k])return 0; db[k]={t:'str',v:args[2]}; return 1;
    case 'SETEX': db[k]={t:'str',v:args[3],ttl:asNum(args[2])}; return 'OK';
    case 'GET': return get(k)? String(get(k).v):null;
    case 'GETSET': { const o=get(k)?get(k).v:null; db[k]={t:'str',v:args[2]}; return o; }
    case 'APPEND': { const e=ensure(db,k,'str',''); e.v=String(e.v)+args[2]; return e.v.length; }
    case 'STRLEN': return get(k)?String(get(k).v).length:0;
    case 'GETRANGE': { const s=get(k)?String(get(k).v):''; let a=+args[2],b=+args[3]; if(b<0)b=s.length+b; return s.slice(a,b+1); }
    case 'INCR': { const e=ensure(db,k,'str','0'); e.v=String(+e.v+1); return +e.v; }
    case 'DECR': { const e=ensure(db,k,'str','0'); e.v=String(+e.v-1); return +e.v; }
    case 'INCRBY': { const e=ensure(db,k,'str','0'); e.v=String(+e.v+ +args[2]); return +e.v; }
    case 'DECRBY': { const e=ensure(db,k,'str','0'); e.v=String(+e.v- +args[2]); return +e.v; }
    case 'MSET': { for(let i=1;i<args.length;i+=2) db[args[i]]={t:'str',v:args[i+1]}; return 'OK'; }
    case 'MGET': return args.slice(1).map(key=>get(key)?String(get(key).v):null);
    case 'DEL': { let n=0; for(const key of args.slice(1)) if(db[key]){delete db[key];n++;} return n; }
    case 'EXISTS': return args.slice(1).filter(key=>!!db[key]).length;
    case 'TYPE': { const e=get(k); if(!e)return 'none'; return {str:'string',hash:'hash',list:'list',set:'set',zset:'zset',bits:'string',hll:'string'}[e.t]; }
    case 'EXPIRE': if(get(k)){get(k).ttl=asNum(args[2]);return 1;} return 0;
    case 'PEXPIRE': if(get(k)){get(k).ttl=asNum(args[2])/1000;return 1;} return 0;
    case 'TTL': return get(k)? (get(k).ttl!=null?get(k).ttl:-1) : -2;
    case 'PERSIST': if(get(k)&&get(k).ttl!=null){delete get(k).ttl;return 1;} return 0;
    case 'HSET': { const e=ensure(db,k,'hash',{}); let n=0; for(let i=2;i<args.length;i+=2){ if(!(args[i] in e.v))n++; e.v[args[i]]=args[i+1]; } return n; }
    case 'HGET': return get(k)&&get(k).v[args[2]]!=null? String(get(k).v[args[2]]):null;
    case 'HMGET': return args.slice(2).map(f=>get(k)&&get(k).v[f]!=null?String(get(k).v[f]):null);
    case 'HGETALL': { const o=get(k)?get(k).v:{}; const a=[]; for(const f in o){a.push(f,String(o[f]));} return a; }
    case 'HKEYS': return get(k)?Object.keys(get(k).v):[];
    case 'HVALS': return get(k)?Object.values(get(k).v).map(String):[];
    case 'HLEN': return get(k)?Object.keys(get(k).v).length:0;
    case 'HDEL': { const e=get(k); let n=0; if(e)for(const f of args.slice(2)){if(f in e.v){delete e.v[f];n++;}} return n; }
    case 'HEXISTS': return get(k)&&(args[2] in get(k).v)?1:0;
    case 'HINCRBY': { const e=ensure(db,k,'hash',{}); e.v[args[2]]=String((+e.v[args[2]]||0)+ +args[3]); return +e.v[args[2]]; }
    case 'RPUSH': { const e=ensure(db,k,'list',[]); e.v.push(...args.slice(2)); return e.v.length; }
    case 'LPUSH': { const e=ensure(db,k,'list',[]); e.v.unshift(...args.slice(2).reverse()); return e.v.length; }
    case 'LRANGE': { const a=get(k)?get(k).v:[]; let s=+args[2],e=+args[3]; if(s<0)s=a.length+s; if(e<0)e=a.length+e; return a.slice(s,e+1); }
    case 'LLEN': return get(k)?get(k).v.length:0;
    case 'LINDEX': { const a=get(k)?get(k).v:[]; let i=+args[2]; if(i<0)i=a.length+i; return a[i]!=null?a[i]:null; }
    case 'LPOP': { const e=get(k); return e&&e.v.length?e.v.shift():null; }
    case 'RPOP': { const e=get(k); return e&&e.v.length?e.v.pop():null; }
    case 'LSET': { const e=get(k); if(e){let i=+args[2]; if(i<0)i=e.v.length+i; e.v[i]=args[3];} return 'OK'; }
    case 'LTRIM': { const e=get(k); if(e){let s=+args[2],en=+args[3]; if(s<0)s=e.v.length+s; if(en<0)en=e.v.length+en; e.v=e.v.slice(s,en+1);} return 'OK'; }
    case 'LREM': { const e=get(k); if(e)e.v=e.v.filter(x=>x!==args[3]); return 'OK'; }
    case 'RPOPLPUSH': { const s=get(k); if(!s||!s.v.length)return null; const v=s.v.pop(); const d=ensure(db,args[2],'list',[]); d.v.unshift(v); return v; }
    case 'BLPOP': { const e=get(k); return e&&e.v.length?[k,e.v.shift()]:null; }
    case 'BRPOP': { const e=get(k); return e&&e.v.length?[k,e.v.pop()]:null; }
    case 'SADD': { const e=ensure(db,k,'set',new Set()); let n=0; for(const m of args.slice(2)){if(!e.v.has(m)){e.v.add(m);n++;}} return n; }
    case 'SREM': { const e=get(k); let n=0; if(e)for(const m of args.slice(2)){if(e.v.delete(m))n++;} return n; }
    case 'SMEMBERS': return get(k)?[...get(k).v].sort():[];
    case 'SCARD': return get(k)?get(k).v.size:0;
    case 'SISMEMBER': return get(k)&&get(k).v.has(args[2])?1:0;
    case 'SINTER': { const sets=args.slice(1).map(key=>get(key)?get(key).v:new Set()); return [...sets[0]].filter(x=>sets.every(s=>s.has(x))).sort(); }
    case 'SUNION': { const u=new Set(); args.slice(1).forEach(key=>{if(get(key))get(key).v.forEach(x=>u.add(x));}); return [...u].sort(); }
    case 'SDIFF': { const base=get(k)?new Set(get(k).v):new Set(); args.slice(2).forEach(key=>{if(get(key))get(key).v.forEach(x=>base.delete(x));}); return [...base].sort(); }
    case 'SMOVE': { const s=get(k),d=ensure(db,args[2],'set',new Set()); if(s&&s.v.has(args[3])){s.v.delete(args[3]);d.v.add(args[3]);return 1;} return 0; }
    case 'SPOP': { const e=get(k); if(e&&e.v.size){const x=[...e.v][0];e.v.delete(x);return x;} return null; }
    case 'ZADD': { const e=ensure(db,k,'zset',new Map()); let i=2; const flags=new Set(); while(['GT','LT','NX','XX','CH','INCR'].includes((args[i]||'').toUpperCase())){flags.add(args[i].toUpperCase());i++;} let n=0; for(;i<args.length;i+=2){const sc=+args[i],mb=args[i+1]; const cur=e.v.get(mb); if(flags.has('GT')&&cur!=null&&sc<=cur)continue; if(flags.has('LT')&&cur!=null&&sc>=cur)continue; if(flags.has('NX')&&cur!=null)continue; if(flags.has('XX')&&cur==null)continue; if(cur==null)n++; e.v.set(mb,sc);} return n; }
    case 'ZINCRBY': { const e=ensure(db,k,'zset',new Map()); const nv=(e.v.get(args[3])||0)+ +args[2]; e.v.set(args[3],nv); return nv; }
    case 'ZSCORE': { const e=get(k); return e&&e.v.has(args[2])?e.v.get(args[2]):null; }
    case 'ZCARD': return get(k)?get(k).v.size:0;
    case 'ZRANK': { const e=get(k); if(!e)return null; const a=[...e.v.entries()].sort((x,y)=>x[1]-y[1]); const i=a.findIndex(p=>p[0]===args[2]); return i<0?null:i; }
    case 'ZREVRANK': { const e=get(k); if(!e)return null; const a=[...e.v.entries()].sort((x,y)=>y[1]-x[1]); const i=a.findIndex(p=>p[0]===args[2]); return i<0?null:i; }
    case 'ZRANGE': case 'ZREVRANGE': { const e=get(k); if(!e)return []; let a=[...e.v.entries()].sort((x,y)=>x[1]-y[1]); if(cmd==='ZREVRANGE')a.reverse(); let s=+args[2],en=+args[3]; if(s<0)s=a.length+s; if(en<0)en=a.length+en; a=a.slice(s,en+1); const ws=args.some(x=>x.toUpperCase&&x.toUpperCase()==='WITHSCORES'); return ws? a.flatMap(p=>[p[0],String(p[1])]) : a.map(p=>p[0]); }
    case 'ZRANGEBYSCORE': case 'ZREVRANGEBYSCORE': { const e=get(k); if(!e)return []; let a=[...e.v.entries()]; const lo=parseLimit(args[2]),hi=parseLimit(args[3]); a=a.filter(p=>inScore(p[1],lo,hi)); a.sort((x,y)=>x[1]-y[1]); if(cmd==='ZREVRANGEBYSCORE')a.reverse(); const ws=args.some(x=>x.toUpperCase&&x.toUpperCase()==='WITHSCORES'); return ws? a.flatMap(p=>[p[0],String(p[1])]):a.map(p=>p[0]); }
    case 'ZRANGEBYLEX': { const e=get(k); if(!e)return []; return [...e.v.keys()].sort(); }
    case 'ZCOUNT': { const e=get(k); if(!e)return 0; const lo=parseLimit(args[2]),hi=parseLimit(args[3]); return [...e.v.values()].filter(s=>inScore(s,lo,hi)).length; }
    case 'ZPOPMAX': { const e=get(k); if(!e||!e.v.size)return []; const a=[...e.v.entries()].sort((x,y)=>y[1]-x[1]); const [m,s]=a[0]; e.v.delete(m); return [m,String(s)]; }
    case 'ZPOPMIN': { const e=get(k); if(!e||!e.v.size)return []; const a=[...e.v.entries()].sort((x,y)=>x[1]-y[1]); const [m,s]=a[0]; e.v.delete(m); return [m,String(s)]; }
    case 'ZREMRANGEBYRANK': { const e=get(k); if(!e)return 0; let a=[...e.v.entries()].sort((x,y)=>x[1]-y[1]); let s=+args[2],en=+args[3]; if(s<0)s=a.length+s; if(en<0)en=a.length+en; const rem=a.slice(s,en+1); rem.forEach(p=>e.v.delete(p[0])); return rem.length; }
    case 'ZUNIONSTORE': { const numk=+args[2]; const keys=args.slice(3,3+numk); let weights=keys.map(()=>1); const wi=args.findIndex(x=>x.toUpperCase&&x.toUpperCase()==='WEIGHTS'); if(wi>=0)weights=args.slice(wi+1,wi+1+numk).map(Number); const out=new Map(); keys.forEach((key,idx)=>{const e=get(key); if(e)e.v.forEach((sc,mb)=>{out.set(mb,(out.get(mb)||0)+sc*weights[idx]);});}); db[k]={t:'zset',v:out}; return out.size; }
    case 'SETBIT': { const e=ensure(db,k,'bits',new Set()); if(+args[3])e.v.add(+args[2]); else e.v.delete(+args[2]); return 0; }
    case 'GETBIT': { const e=get(k); return e&&e.v.has(+args[2])?1:0; }
    case 'BITCOUNT': { const e=get(k); return e?e.v.size:0; }
    case 'PFADD': { const e=ensure(db,k,'hll',new Set()); args.slice(2).forEach(m=>e.v.add(m)); return 1; }
    case 'PFCOUNT': return get(k)?get(k).v.size:0;
    case 'MULTI': case 'EXEC': case 'WATCH': case 'UNWATCH': case 'DISCARD': return 'OK';
    case 'SUBSCRIBE': return ['subscribe',args[1],1];
    case 'PUBLISH': return 0;
    case 'SCAN': { const pat=(args.indexOf('MATCH')>=0||args.indexOf('match')>=0)? args[args.findIndex(x=>x.toUpperCase&&x.toUpperCase()==='MATCH')+1]:'*'; const rx=new RegExp('^'+pat.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*')+'$'); return ['0',Object.keys(db).filter(key=>rx.test(key)).sort()]; }
    case 'MOVE': return 1;
    case 'FLUSHALL': case 'FLUSHDB': for(const key in db)delete db[key]; return 'OK';
    default: return 'ERR unknown command '+cmd;
  }
}
function parseLimit(x){ x=String(x); let ex=false; if(x[0]==='('){ex=true;x=x.slice(1);} if(/^-?\+?inf$/i.test(x)) return {v: x[0]==='-'?-Infinity:Infinity, ex}; return {v:parseFloat(x),ex}; }
function inScore(s,lo,hi){ const a=lo.ex? s>lo.v : s>=lo.v; const b=hi.ex? s<hi.v : s<=hi.v; return a&&b; }
function redisRun(program){
  const db = redisSeed();
  const replies=[];
  program.split(/\n+/).map(l=>l.trim()).filter(Boolean).forEach(line=>{
    try{ replies.push(execRedisLine(db, tokenize(line))); }
    catch(e){ replies.push('ERR '+e.message); }
  });
  return {replies, last: replies[replies.length-1], state: serializeRedis(db)};
}
function serializeRedis(db){
  const keys=Object.keys(db).sort(); const o={};
  for(const k of keys){ const e=db[k]; let v;
    if(e.t==='set'||e.t==='bits'||e.t==='hll') v=[...e.v].sort();
    else if(e.t==='zset') v=[...e.v.entries()].sort((a,b)=>a[0]<b[0]?-1:1);
    else if(e.t==='hash'){ v={}; Object.keys(e.v).sort().forEach(f=>v[f]=String(e.v[f])); }
    else v=e.v;
    o[k]={t:e.t,v,ttl:e.ttl!=null?Math.round(e.ttl):null};
  }
  return JSON.stringify(o);
}

/* ================= COMPARISON ================= */
function bagPG(rows){ return rows.map(r=>JSON.stringify(Object.values(r).map(v=>v==null?'∅':String(v)).sort())).sort(); }
function canonMongo(rows){ return rows.map(r=>JSON.stringify(sortKeys(r))).sort(); }
function sortKeys(o){ if(Array.isArray(o))return o.map(sortKeys); if(o&&typeof o==='object'){const n={};Object.keys(o).sort().forEach(k=>n[k]=sortKeys(o[k]));return n;} return o; }
function eqArr(a,b){ return a.length===b.length && a.every((x,i)=>x===b[i]); }

/* ================= TASKS (p, db, prompt, model answer) ================= */
const TASKS_RAW = [
/* PG BEGINNER (gamehub) */
[1,'pg',`Show all games.`,`SELECT * FROM games;`],
[1,'pg',`Show all studios.`,`SELECT * FROM studios;`],
[1,'pg',`Show all players.`,`SELECT * FROM players;`],
[1,'pg',`Find games in the 'Shooter' genre.`,`SELECT * FROM games WHERE genre = 'Shooter';`],
[1,'pg',`Find games priced above 20.`,`SELECT * FROM games WHERE price > 20;`],
[1,'pg',`Find the free games (price = 0).`,`SELECT * FROM games WHERE price = 0;`],
[1,'pg',`Find all multiplayer games.`,`SELECT * FROM games WHERE multiplayer = TRUE;`],
[1,'pg',`Find games released in 2024.`,`SELECT * FROM games WHERE release_year = 2024;`],
[1,'pg',`List games ordered by price, highest first.`,`SELECT * FROM games ORDER BY price DESC;`],
[1,'pg',`Show the 5 most expensive games.`,`SELECT * FROM games ORDER BY price DESC LIMIT 5;`],
[1,'pg',`Count how many games there are.`,`SELECT COUNT(*) FROM games;`],
[1,'pg',`Count how many players there are.`,`SELECT COUNT(*) FROM players;`],
[1,'pg',`Find all premium players.`,`SELECT * FROM players WHERE premium = TRUE;`],
[1,'pg',`Find players from 'Germany'.`,`SELECT * FROM players WHERE country = 'Germany';`],
[1,'pg',`Find players who joined before 2021.`,`SELECT * FROM players WHERE joined < 2021;`],
[1,'pg',`List the distinct game genres.`,`SELECT DISTINCT genre FROM games;`],
[1,'pg',`List the distinct player countries.`,`SELECT DISTINCT country FROM players;`],
[1,'pg',`Find studios from the 'UK'.`,`SELECT * FROM studios WHERE country = 'UK';`],
[1,'pg',`Find studios founded after 2010.`,`SELECT * FROM studios WHERE founded > 2010;`],
[1,'pg',`Find the average game price.`,`SELECT AVG(price) FROM games;`],
[1,'pg',`Find the highest game price.`,`SELECT MAX(price) FROM games;`],
[1,'pg',`Find the lowest game price.`,`SELECT MIN(price) FROM games;`],
[1,'pg',`Show all purchases.`,`SELECT * FROM purchases;`],
[1,'pg',`Find purchases where more than 30 was paid.`,`SELECT * FROM purchases WHERE amount_paid > 30;`],
[1,'pg',`Show all reviews.`,`SELECT * FROM reviews;`],
[1,'pg',`Find reviews with a rating of 5.`,`SELECT * FROM reviews WHERE rating = 5;`],
[1,'pg',`Count how many reviews there are.`,`SELECT COUNT(*) FROM reviews;`],
[1,'pg',`Show all sessions.`,`SELECT * FROM sessions;`],
[1,'pg',`Find sessions that scored over 2000.`,`SELECT * FROM sessions WHERE score > 2000;`],
[1,'pg',`Find sessions longer than 60 minutes.`,`SELECT * FROM sessions WHERE duration_min > 60;`],
[1,'pg',`Show only the title of every game.`,`SELECT title FROM games;`],
[1,'pg',`Show the username and country of every player.`,`SELECT username, country FROM players;`],
[1,'pg',`Count how many games are in each genre.`,`SELECT genre, COUNT(*) FROM games GROUP BY genre;`],
[1,'pg',`Count how many players are from each country.`,`SELECT country, COUNT(*) FROM players GROUP BY country;`],
[1,'pg',`List games ordered by release_year (oldest first).`,`SELECT * FROM games ORDER BY release_year;`],
[1,'pg',`List sessions ordered by score, highest first.`,`SELECT * FROM sessions ORDER BY score DESC;`],
[1,'pg',`Count how many distinct genres exist.`,`SELECT COUNT(DISTINCT genre) FROM games;`],
[1,'pg',`Find the total amount paid across all purchases.`,`SELECT SUM(amount_paid) FROM purchases;`],
[1,'pg',`Find the average session score.`,`SELECT AVG(score) FROM sessions;`],
[1,'pg',`List reviews from newest to oldest.`,`SELECT * FROM reviews ORDER BY posted_on DESC;`],
/* PG INTERMEDIATE (gamehub) */
[2,'pg',`Show each game title with its studio name (join).`,`SELECT g.title, s.name FROM games g JOIN studios s ON g.studio_id = s.studio_id;`],
[2,'pg',`Show purchases with the player username and game title.`,`SELECT pl.username, g.title FROM purchases p JOIN players pl ON p.player_id = pl.player_id JOIN games g ON p.game_id = g.game_id;`],
[2,'pg',`Total revenue (sum of amount_paid) per game_id.`,`SELECT game_id, SUM(amount_paid) FROM purchases GROUP BY game_id;`],
[2,'pg',`For every game show its studio name, title, genre and total revenue (sum of amount_paid). Include games never purchased (revenue 0, not dropped). Order by studio name, then revenue (highest first).`,`SELECT s.name AS studio, g.title, g.genre, COALESCE(SUM(p.amount_paid),0) AS total_revenue FROM games g JOIN studios s ON g.studio_id = s.studio_id LEFT JOIN purchases p ON p.game_id = g.game_id GROUP BY s.name, g.title, g.genre ORDER BY s.name, total_revenue DESC;`],
[2,'pg',`Number of purchases per player.`,`SELECT player_id, COUNT(*) FROM purchases GROUP BY player_id;`],
[2,'pg',`Players who bought more than 2 games.`,`SELECT player_id FROM purchases GROUP BY player_id HAVING COUNT(*) > 2;`],
[2,'pg',`Average rating per game.`,`SELECT game_id, AVG(rating) FROM reviews GROUP BY game_id;`],
[2,'pg',`Games whose average rating is 4.5 or higher.`,`SELECT game_id FROM reviews GROUP BY game_id HAVING AVG(rating) >= 4.5;`],
[2,'pg',`Total play time (duration) per player.`,`SELECT player_id, SUM(duration_min) FROM sessions GROUP BY player_id;`],
[2,'pg',`Total session score per game.`,`SELECT game_id, SUM(score) FROM sessions GROUP BY game_id;`],
[2,'pg',`Number of sessions per game.`,`SELECT game_id, COUNT(*) FROM sessions GROUP BY game_id;`],
[2,'pg',`Show each game title with its studio country.`,`SELECT g.title, s.country FROM games g JOIN studios s ON g.studio_id = s.studio_id;`],
[2,'pg',`Total revenue per studio name.`,`SELECT s.name, SUM(p.amount_paid) FROM purchases p JOIN games g ON p.game_id = g.game_id JOIN studios s ON g.studio_id = s.studio_id GROUP BY s.name;`],
[2,'pg',`Average game price per genre.`,`SELECT genre, AVG(price) FROM games GROUP BY genre;`],
[2,'pg',`Genres that have more than 2 games.`,`SELECT genre FROM games GROUP BY genre HAVING COUNT(*) > 2;`],
[2,'pg',`Players who never made a purchase.`,`SELECT pl.* FROM players pl LEFT JOIN purchases p ON pl.player_id = p.player_id WHERE p.purchase_id IS NULL;`],
[2,'pg',`Games that were never reviewed.`,`SELECT g.* FROM games g LEFT JOIN reviews r ON g.game_id = r.game_id WHERE r.review_id IS NULL;`],
[2,'pg',`Number of reviews per game.`,`SELECT game_id, COUNT(*) FROM reviews GROUP BY game_id;`],
[2,'pg',`The player with the most sessions.`,`SELECT player_id, COUNT(*) FROM sessions GROUP BY player_id ORDER BY COUNT(*) DESC LIMIT 1;`],
[2,'pg',`Average session duration per genre.`,`SELECT g.genre, AVG(s.duration_min) FROM sessions s JOIN games g ON s.game_id = g.game_id GROUP BY g.genre;`],
[2,'pg',`Total spend per premium player username.`,`SELECT pl.username, SUM(p.amount_paid) FROM purchases p JOIN players pl ON p.player_id = pl.player_id WHERE pl.premium = TRUE GROUP BY pl.username;`],
[2,'pg',`Number of sessions per player country.`,`SELECT pl.country, COUNT(*) FROM sessions s JOIN players pl ON s.player_id = pl.player_id GROUP BY pl.country;`],
[2,'pg',`Total session score per genre.`,`SELECT g.genre, SUM(s.score) FROM sessions s JOIN games g ON s.game_id = g.game_id GROUP BY g.genre;`],
[2,'pg',`Games priced above the average game price.`,`SELECT * FROM games WHERE price > (SELECT AVG(price) FROM games);`],
[2,'pg',`Top 3 games by total session score.`,`SELECT game_id, SUM(score) AS total FROM sessions GROUP BY game_id ORDER BY total DESC LIMIT 3;`],
[2,'pg',`Count purchases per month of purchased_on.`,`SELECT EXTRACT(MONTH FROM purchased_on) AS m, COUNT(*) FROM purchases GROUP BY m;`],
[2,'pg',`Rank games by price (highest first) using RANK.`,`SELECT title, price, RANK() OVER (ORDER BY price DESC) AS rnk FROM games;`],
[2,'pg',`Number each session within its game by score (highest = 1).`,`SELECT game_id, score, ROW_NUMBER() OVER (PARTITION BY game_id ORDER BY score DESC) AS rn FROM sessions;`],
[2,'pg',`Running total of amount_paid ordered by purchased_on.`,`SELECT purchase_id, purchased_on, SUM(amount_paid) OVER (ORDER BY purchased_on) AS running FROM purchases;`],
[2,'pg',`Average amount paid per game title.`,`SELECT g.title, AVG(p.amount_paid) FROM purchases p JOIN games g ON p.game_id = g.game_id GROUP BY g.title;`],
[2,'pg',`Each studio with its number of games.`,`SELECT s.name, COUNT(*) FROM games g JOIN studios s ON g.studio_id = s.studio_id GROUP BY s.name;`],
[2,'pg',`Number of distinct games each player has played.`,`SELECT player_id, COUNT(DISTINCT game_id) FROM sessions GROUP BY player_id;`],
[2,'pg',`Total revenue per genre.`,`SELECT g.genre, SUM(p.amount_paid) FROM purchases p JOIN games g ON p.game_id = g.game_id GROUP BY g.genre;`],
[2,'pg',`Search reviews that mention both 'space' and 'shooter'; return game title, rating, a relevance rank and the body, most relevant first.`,`SELECT g.title, r.rating, ts_rank(to_tsvector('english', r.body), to_tsquery('english','space & shooter')) AS relevance, r.body FROM reviews r JOIN games g ON r.game_id = g.game_id WHERE to_tsvector('english', r.body) @@ to_tsquery('english','space & shooter') ORDER BY relevance DESC;`],
[2,'pg',`The game_id with the highest average rating.`,`SELECT game_id FROM reviews GROUP BY game_id ORDER BY AVG(rating) DESC LIMIT 1;`],
[2,'pg',`Multiplayer games priced above 20.`,`SELECT * FROM games WHERE multiplayer = TRUE AND price > 20;`],
[2,'pg',`Average session score per player.`,`SELECT player_id, AVG(score) FROM sessions GROUP BY player_id;`],
[2,'pg',`Count of premium vs non-premium players.`,`SELECT premium, COUNT(*) FROM players GROUP BY premium;`],
[2,'pg',`The top spender (player with the highest total amount paid).`,`SELECT player_id, SUM(amount_paid) AS spent FROM purchases GROUP BY player_id ORDER BY spent DESC LIMIT 1;`],
[2,'pg',`Games that have more than 3 sessions.`,`SELECT game_id FROM sessions GROUP BY game_id HAVING COUNT(*) > 3;`],
/* PG HARD (gamehub) */
[3,'pg',`Using game_sales_report, report total revenue by genre and by genre+player_country, with a subtotal per genre and a grand total (ROLLUP).`,`SELECT genre, player_country, SUM(amount_paid) FROM game_sales_report GROUP BY ROLLUP (genre, player_country) ORDER BY genre, player_country NULLS LAST;`],
[3,'pg',`Using game_sales_report, produce a full cross-tabulation of revenue across studio_country and premium (CUBE).`,`SELECT studio_country, premium, SUM(amount_paid) FROM game_sales_report GROUP BY CUBE (studio_country, premium) ORDER BY studio_country NULLS LAST, premium NULLS LAST;`],
[3,'pg',`The top-earning game per genre (window, rank 1).`,`SELECT * FROM (SELECT g.genre, g.title, SUM(p.amount_paid) rev, ROW_NUMBER() OVER (PARTITION BY g.genre ORDER BY SUM(p.amount_paid) DESC) rn FROM purchases p JOIN games g ON p.game_id = g.game_id GROUP BY g.genre, g.title) t WHERE rn = 1;`],
[3,'pg',`Each game's revenue as a percentage of its genre revenue.`,`SELECT g.title, g.genre, SUM(p.amount_paid)*100.0/SUM(SUM(p.amount_paid)) OVER (PARTITION BY g.genre) AS pct FROM purchases p JOIN games g ON p.game_id = g.game_id GROUP BY g.title, g.genre;`],
[3,'pg',`Rank players by total spend (window).`,`SELECT player_id, SUM(amount_paid) AS spent, RANK() OVER (ORDER BY SUM(amount_paid) DESC) AS rnk FROM purchases GROUP BY player_id;`],
[3,'pg',`For each player, their highest-scoring session.`,`SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY score DESC) rn FROM sessions) t WHERE rn = 1;`],
[3,'pg',`Top 3 games by revenue within each studio.`,`SELECT * FROM (SELECT s.name studio, g.title, SUM(p.amount_paid) rev, RANK() OVER (PARTITION BY s.name ORDER BY SUM(p.amount_paid) DESC) r FROM purchases p JOIN games g ON p.game_id = g.game_id JOIN studios s ON g.studio_id = s.studio_id GROUP BY s.name, g.title) t WHERE r <= 3;`],
[3,'pg',`Players whose total spend is above the average player spend.`,`WITH s AS (SELECT player_id, SUM(amount_paid) tot FROM purchases GROUP BY player_id) SELECT * FROM s WHERE tot > (SELECT AVG(tot) FROM s);`],
[3,'pg',`Median session score per game using PERCENTILE_CONT.`,`SELECT game_id, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score) AS median FROM sessions GROUP BY game_id;`],
[3,'pg',`Running cumulative revenue ordered by purchased_on.`,`SELECT purchased_on, SUM(amount_paid) OVER (ORDER BY purchased_on) AS cumulative FROM purchases;`],
[3,'pg',`The game played by the most distinct players.`,`SELECT game_id, COUNT(DISTINCT player_id) AS players FROM sessions GROUP BY game_id ORDER BY players DESC LIMIT 1;`],
[3,'pg',`Each genre's most expensive game (window).`,`SELECT * FROM (SELECT genre, title, price, ROW_NUMBER() OVER (PARTITION BY genre ORDER BY price DESC) rn FROM games) t WHERE rn = 1;`],
[3,'pg',`3-row moving average of session score ordered by played_on.`,`SELECT played_on, score, AVG(score) OVER (ORDER BY played_on ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg FROM sessions;`],
[3,'pg',`Games whose average rating is above the overall average rating.`,`SELECT game_id FROM reviews GROUP BY game_id HAVING AVG(rating) > (SELECT AVG(rating) FROM reviews);`],
[3,'pg',`Total revenue per month of purchased_on, chronological.`,`SELECT EXTRACT(MONTH FROM purchased_on) AS m, SUM(amount_paid) FROM purchases GROUP BY m ORDER BY m;`],
[3,'pg',`Split games into 4 price quartiles using NTILE.`,`SELECT title, price, NTILE(4) OVER (ORDER BY price) AS quartile FROM games;`],
[3,'pg',`Difference between a game's price and its genre average.`,`SELECT title, genre, price - AVG(price) OVER (PARTITION BY genre) AS diff FROM games;`],
[3,'pg',`The player who wrote the most reviews.`,`SELECT player_id, COUNT(*) FROM reviews GROUP BY player_id ORDER BY COUNT(*) DESC LIMIT 1;`],
[3,'pg',`Pairs of games with the same price in different genres.`,`SELECT a.title, b.title FROM games a JOIN games b ON a.price = b.price AND a.genre <> b.genre AND a.game_id < b.game_id;`],
[3,'pg',`Per studio: total revenue and number of games, only studios with revenue above 100.`,`WITH s AS (SELECT st.name, SUM(p.amount_paid) rev, COUNT(DISTINCT g.game_id) games FROM purchases p JOIN games g ON p.game_id = g.game_id JOIN studios st ON g.studio_id = st.studio_id GROUP BY st.name) SELECT * FROM s WHERE rev > 100;`],
/* MONGO BEGINNER (gamehub) */
[1,'mongo',`Find all games.`,`db.games.find()`],
[1,'mongo',`Find games in the 'Shooter' genre.`,`db.games.find({ genre: 'Shooter' })`],
[1,'mongo',`Find games priced above 20.`,`db.games.find({ price: { $gt: 20 } })`],
[1,'mongo',`Find all multiplayer games.`,`db.games.find({ multiplayer: true })`],
[1,'mongo',`Find games released in 2024.`,`db.games.find({ releaseYear: 2024 })`],
[1,'mongo',`Find the free games (price 0).`,`db.games.find({ price: 0 })`],
[1,'mongo',`List games sorted by price, highest first.`,`db.games.find().sort({ price: -1 })`],
[1,'mongo',`Show the 5 most expensive games.`,`db.games.find().sort({ price: -1 }).limit(5)`],
[1,'mongo',`Count how many games there are.`,`db.games.countDocuments()`],
[1,'mongo',`List the distinct genres.`,`db.games.distinct('genre')`],
[1,'mongo',`List the distinct studios.`,`db.games.distinct('studio')`],
[1,'mongo',`Show only the title of every game.`,`db.games.find({}, { title: 1 })`],
[1,'mongo',`Find multiplayer RPG games.`,`db.games.find({ genre: 'RPG', multiplayer: true })`],
[1,'mongo',`Find all players.`,`db.players.find()`],
[1,'mongo',`Find premium players.`,`db.players.find({ premium: true })`],
[1,'mongo',`Find players from 'Germany'.`,`db.players.find({ country: 'Germany' })`],
[1,'mongo',`Find players who joined before 2021.`,`db.players.find({ joined: { $lt: 2021 } })`],
[1,'mongo',`Count how many players there are.`,`db.players.countDocuments()`],
[1,'mongo',`Show username and country of every player.`,`db.players.find({}, { username: 1, country: 1 })`],
[1,'mongo',`List the distinct player countries.`,`db.players.distinct('country')`],
[1,'mongo',`Find all sessions.`,`db.sessions.find()`],
[1,'mongo',`Find sessions of the game 'Nebula Raiders'.`,`db.sessions.find({ gameTitle: 'Nebula Raiders' })`],
[1,'mongo',`Find sessions that scored over 2000.`,`db.sessions.find({ score: { $gt: 2000 } })`],
[1,'mongo',`Find sessions longer than 60 minutes.`,`db.sessions.find({ durationMin: { $gt: 60 } })`],
[1,'mongo',`Find sessions of RPG games.`,`db.sessions.find({ genre: 'RPG' })`],
[1,'mongo',`Find sessions by premium players.`,`db.sessions.find({ premium: true })`],
[1,'mongo',`List sessions sorted by score, highest first.`,`db.sessions.find().sort({ score: -1 })`],
[1,'mongo',`Show the 3 highest-scoring sessions.`,`db.sessions.find().sort({ score: -1 }).limit(3)`],
[1,'mongo',`Count how many sessions there are.`,`db.sessions.countDocuments()`],
[1,'mongo',`Find sessions from 'Spain'.`,`db.sessions.find({ country: 'Spain' })`],
[1,'mongo',`Find sessions tagged 'victory'.`,`db.sessions.find({ tags: 'victory' })`],
[1,'mongo',`Find sessions tagged 'ranked'.`,`db.sessions.find({ tags: 'ranked' })`],
[1,'mongo',`Find games priced below 10.`,`db.games.find({ price: { $lt: 10 } })`],
[1,'mongo',`Find games made by 'Orbit Games'.`,`db.games.find({ studio: 'Orbit Games' })`],
[1,'mongo',`Find non-premium players.`,`db.players.find({ premium: false })`],
[1,'mongo',`Show username and score of every session.`,`db.sessions.find({}, { username: 1, score: 1 })`],
[1,'mongo',`Find sessions scoring between 1000 and 2000 inclusive.`,`db.sessions.find({ score: { $gte: 1000, $lte: 2000 } })`],
[1,'mongo',`Find games in the 'Shooter' or 'Racing' genre.`,`db.games.find({ genre: { $in: ['Shooter','Racing'] } })`],
[1,'mongo',`Find sessions tagged 'streamed'.`,`db.sessions.find({ tags: 'streamed' })`],
[1,'mongo',`Find single-player (non-multiplayer) games.`,`db.games.find({ multiplayer: false })`],
/* MONGO INTERMEDIATE (gamehub) */
[2,'mongo',`Count sessions per game, reshaped to { gameTitle, sessions }, most first.`,`db.sessions.aggregate([ { $group: { _id: '$gameTitle', sessions: { $sum: 1 } } }, { $sort: { sessions: -1 } }, { $project: { _id: 0, gameTitle: '$_id', sessions: 1 } } ])`],
[2,'mongo',`Average score per game, reshaped to { gameTitle, avgScore }, highest first.`,`db.sessions.aggregate([ { $group: { _id: '$gameTitle', avgScore: { $avg: '$score' } } }, { $sort: { avgScore: -1 } }, { $project: { _id: 0, gameTitle: '$_id', avgScore: 1 } } ])`],
[2,'mongo',`Total play time per player, reshaped to { username, totalMinutes }, highest first.`,`db.sessions.aggregate([ { $group: { _id: '$username', totalMinutes: { $sum: '$durationMin' } } }, { $sort: { totalMinutes: -1 } }, { $project: { _id: 0, username: '$_id', totalMinutes: 1 } } ])`],
[2,'mongo',`Sessions per genre, reshaped to { genre, sessions }, most first.`,`db.sessions.aggregate([ { $group: { _id: '$genre', sessions: { $sum: 1 } } }, { $sort: { sessions: -1 } }, { $project: { _id: 0, genre: '$_id', sessions: 1 } } ])`],
[2,'mongo',`Average score per genre, reshaped to { genre, avgScore }, highest first.`,`db.sessions.aggregate([ { $group: { _id: '$genre', avgScore: { $avg: '$score' } } }, { $sort: { avgScore: -1 } }, { $project: { _id: 0, genre: '$_id', avgScore: 1 } } ])`],
[2,'mongo',`Find the three games with the highest total score; show { gameTitle, totalScore }, highest first.`,`db.sessions.aggregate([ { $group: { _id: '$gameTitle', totalScore: { $sum: '$score' } } }, { $sort: { totalScore: -1 } }, { $limit: 3 }, { $project: { _id: 0, gameTitle: '$_id', totalScore: 1 } } ])`],
[2,'mongo',`Sessions per player country, reshaped to { country, sessions }, most first.`,`db.sessions.aggregate([ { $group: { _id: '$country', sessions: { $sum: 1 } } }, { $sort: { sessions: -1 } }, { $project: { _id: 0, country: '$_id', sessions: 1 } } ])`],
[2,'mongo',`Number of games per studio, reshaped to { studio, games }, most first.`,`db.games.aggregate([ { $group: { _id: '$studio', games: { $sum: 1 } } }, { $sort: { games: -1 } }, { $project: { _id: 0, studio: '$_id', games: 1 } } ])`],
[2,'mongo',`Average game price per genre, reshaped to { genre, avgPrice }, highest first.`,`db.games.aggregate([ { $group: { _id: '$genre', avgPrice: { $avg: '$price' } } }, { $sort: { avgPrice: -1 } }, { $project: { _id: 0, genre: '$_id', avgPrice: 1 } } ])`],
[2,'mongo',`Total score per player, reshaped to { username, totalScore }, highest first.`,`db.sessions.aggregate([ { $group: { _id: '$username', totalScore: { $sum: '$score' } } }, { $sort: { totalScore: -1 } }, { $project: { _id: 0, username: '$_id', totalScore: 1 } } ])`],
[2,'mongo',`Number of sessions per player, reshaped to { username, sessions }, most first.`,`db.sessions.aggregate([ { $group: { _id: '$username', sessions: { $sum: 1 } } }, { $sort: { sessions: -1 } }, { $project: { _id: 0, username: '$_id', sessions: 1 } } ])`],
[2,'mongo',`For every distinct tag, count how many sessions contain it, most common first.`,`db.sessions.aggregate([ { $unwind: '$tags' }, { $group: { _id: '$tags', count: { $sum: 1 } } }, { $sort: { count: -1 } } ])`],
[2,'mongo',`Average session duration per genre, reshaped to { genre, avgDuration }, highest first.`,`db.sessions.aggregate([ { $group: { _id: '$genre', avgDuration: { $avg: '$durationMin' } } }, { $sort: { avgDuration: -1 } }, { $project: { _id: 0, genre: '$_id', avgDuration: 1 } } ])`],
[2,'mongo',`Considering only premium players, total score per country, highest first; reshape to { country, totalScore }.`,`db.sessions.aggregate([ { $match: { premium: true } }, { $group: { _id: '$country', totalScore: { $sum: '$score' } } }, { $sort: { totalScore: -1 } }, { $project: { _id: 0, country: '$_id', totalScore: 1 } } ])`],
[2,'mongo',`Count sessions grouped by premium, reshaped to { premium, sessions }.`,`db.sessions.aggregate([ { $group: { _id: '$premium', sessions: { $sum: 1 } } }, { $project: { _id: 0, premium: '$_id', sessions: 1 } } ])`],
[2,'mongo',`Maximum score per game, reshaped to { gameTitle, maxScore }, highest first.`,`db.sessions.aggregate([ { $group: { _id: '$gameTitle', maxScore: { $max: '$score' } } }, { $sort: { maxScore: -1 } }, { $project: { _id: 0, gameTitle: '$_id', maxScore: 1 } } ])`],
[2,'mongo',`Minimum session duration per game, reshaped to { gameTitle, minDuration }, lowest first.`,`db.sessions.aggregate([ { $group: { _id: '$gameTitle', minDuration: { $min: '$durationMin' } } }, { $sort: { minDuration: 1 } }, { $project: { _id: 0, gameTitle: '$_id', minDuration: 1 } } ])`],
[2,'mongo',`Sessions per studio, reshaped to { studio, sessions }, most first.`,`db.sessions.aggregate([ { $group: { _id: '$studio', sessions: { $sum: 1 } } }, { $sort: { sessions: -1 } }, { $project: { _id: 0, studio: '$_id', sessions: 1 } } ])`],
[2,'mongo',`Number of games per genre, reshaped to { genre, games }, most first.`,`db.games.aggregate([ { $group: { _id: '$genre', games: { $sum: 1 } } }, { $sort: { games: -1 } }, { $project: { _id: 0, genre: '$_id', games: 1 } } ])`],
[2,'mongo',`Average game price per studio, reshaped to { studio, avgPrice }, highest first.`,`db.games.aggregate([ { $group: { _id: '$studio', avgPrice: { $avg: '$price' } } }, { $sort: { avgPrice: -1 } }, { $project: { _id: 0, studio: '$_id', avgPrice: 1 } } ])`],
[2,'mongo',`Total session score per game, reshaped to { gameTitle, totalScore }, highest first.`,`db.sessions.aggregate([ { $group: { _id: '$gameTitle', totalScore: { $sum: '$score' } } }, { $sort: { totalScore: -1 } }, { $project: { _id: 0, gameTitle: '$_id', totalScore: 1 } } ])`],
[2,'mongo',`Count multiplayer vs single-player games, reshaped to { multiplayer, games }.`,`db.games.aggregate([ { $group: { _id: '$multiplayer', games: { $sum: 1 } } }, { $project: { _id: 0, multiplayer: '$_id', games: 1 } } ])`],
[2,'mongo',`Number of distinct players per game, reshaped to { gameTitle, distinctPlayers }, most first.`,`db.sessions.aggregate([ { $group: { _id: '$gameTitle', players: { $addToSet: '$username' } } }, { $project: { _id: 0, gameTitle: '$_id', distinctPlayers: { $size: '$players' } } }, { $sort: { distinctPlayers: -1 } } ])`],
[2,'mongo',`The 5 longest sessions, showing only username and durationMin (no _id).`,`db.sessions.find({}, { _id: 0, username: 1, durationMin: 1 }).sort({ durationMin: -1 }).limit(5)`],
[2,'mongo',`Count sessions per calendar month, reshaped to { month, sessions }, chronological.`,`db.sessions.aggregate([ { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$playedOn' } }, sessions: { $sum: 1 } } }, { $project: { _id: 0, month: '$_id', sessions: 1 } }, { $sort: { month: 1 } } ])`],
[2,'mongo',`Count players per join year, reshaped to { year, players }, chronological.`,`db.players.aggregate([ { $group: { _id: '$joined', players: { $sum: 1 } } }, { $project: { _id: 0, year: '$_id', players: 1 } }, { $sort: { year: 1 } } ])`],
[2,'mongo',`Total score per tag, reshaped to { tag, totalScore }, highest first.`,`db.sessions.aggregate([ { $unwind: '$tags' }, { $group: { _id: '$tags', totalScore: { $sum: '$score' } } }, { $sort: { totalScore: -1 } }, { $project: { _id: 0, tag: '$_id', totalScore: 1 } } ])`],
[2,'mongo',`Average score of 'victory' sessions, reshaped to { avgScore } (no _id).`,`db.sessions.aggregate([ { $match: { tags: 'victory' } }, { $group: { _id: null, avgScore: { $avg: '$score' } } }, { $project: { _id: 0, avgScore: 1 } } ])`],
[2,'mongo',`Count how many sessions are tagged 'ranked'.`,`db.sessions.countDocuments({ tags: 'ranked' })`],
[2,'mongo',`For premium players only, the top 3 games by average score, reshaped to { gameTitle, avgScore }.`,`db.sessions.aggregate([ { $match: { premium: true } }, { $group: { _id: '$gameTitle', avgScore: { $avg: '$score' } } }, { $sort: { avgScore: -1 } }, { $limit: 3 }, { $project: { _id: 0, gameTitle: '$_id', avgScore: 1 } } ])`],
[2,'mongo',`Maximum score per player, reshaped to { username, maxScore }, highest first.`,`db.sessions.aggregate([ { $group: { _id: '$username', maxScore: { $max: '$score' } } }, { $sort: { maxScore: -1 } }, { $project: { _id: 0, username: '$_id', maxScore: 1 } } ])`],
[2,'mongo',`Average session duration per studio, reshaped to { studio, avgDuration }, highest first.`,`db.sessions.aggregate([ { $group: { _id: '$studio', avgDuration: { $avg: '$durationMin' } } }, { $sort: { avgDuration: -1 } }, { $project: { _id: 0, studio: '$_id', avgDuration: 1 } } ])`],
[2,'mongo',`Average session duration for premium players, reshaped to { avgDuration } (no _id).`,`db.sessions.aggregate([ { $match: { premium: true } }, { $group: { _id: null, avgDuration: { $avg: '$durationMin' } } }, { $project: { _id: 0, avgDuration: 1 } } ])`],
[2,'mongo',`Number of distinct genres each player played, reshaped to { username, distinctGenres }, most first.`,`db.sessions.aggregate([ { $group: { _id: '$username', genres: { $addToSet: '$genre' } } }, { $project: { _id: 0, username: '$_id', distinctGenres: { $size: '$genres' } } }, { $sort: { distinctGenres: -1 } } ])`],
[2,'mongo',`Total play time per genre, reshaped to { genre, totalMinutes }, highest first.`,`db.sessions.aggregate([ { $group: { _id: '$genre', totalMinutes: { $sum: '$durationMin' } } }, { $sort: { totalMinutes: -1 } }, { $project: { _id: 0, genre: '$_id', totalMinutes: 1 } } ])`],
[2,'mongo',`Count sessions per country and premium combination, sorted by count descending.`,`db.sessions.aggregate([ { $group: { _id: { country: '$country', premium: '$premium' }, sessions: { $sum: 1 } } }, { $sort: { sessions: -1 } } ])`],
[2,'mongo',`Players with more than 4 sessions, reshaped to { username, sessions }, most first.`,`db.sessions.aggregate([ { $group: { _id: '$username', sessions: { $sum: 1 } } }, { $match: { sessions: { $gt: 4 } } }, { $sort: { sessions: -1 } }, { $project: { _id: 0, username: '$_id', sessions: 1 } } ])`],
[2,'mongo',`Average score per studio, reshaped to { studio, avgScore }, highest first.`,`db.sessions.aggregate([ { $group: { _id: '$studio', avgScore: { $avg: '$score' } } }, { $sort: { avgScore: -1 } }, { $project: { _id: 0, studio: '$_id', avgScore: 1 } } ])`],
[2,'mongo',`The most expensive game per genre, reshaped to { genre, title, price } (sort then group $first).`,`db.games.aggregate([ { $sort: { price: -1 } }, { $group: { _id: '$genre', title: { $first: '$title' }, price: { $first: '$price' } } }, { $project: { _id: 0, genre: '$_id', title: 1, price: 1 } } ])`],
[2,'mongo',`Per genre: session count and average score, reshaped to { genre, sessions, avgScore }, sorted by sessions desc.`,`db.sessions.aggregate([ { $group: { _id: '$genre', sessions: { $sum: 1 }, avgScore: { $avg: '$score' } } }, { $sort: { sessions: -1 } }, { $project: { _id: 0, genre: '$_id', sessions: 1, avgScore: 1 } } ])`],
/* MONGO HARD (gamehub) */
[3,'mongo',`For each player: session count and average duration; keep only players with at least 3 sessions; sort by avg duration desc; reshape to { username, sessionCount, avgDuration }.`,`db.sessions.aggregate([ { $group: { _id: '$username', sessionCount: { $sum: 1 }, avgDuration: { $avg: '$durationMin' } } }, { $match: { sessionCount: { $gte: 3 } } }, { $sort: { avgDuration: -1 } }, { $project: { _id: 0, username: '$_id', sessionCount: 1, avgDuration: 1 } } ])`],
[3,'mongo',`Monthly active players: distinct players per calendar month, chronological, reshaped to { month (YYYY-MM), playerCount }.`,`db.sessions.aggregate([ { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$playedOn' } }, distinctPlayers: { $addToSet: '$username' } } }, { $project: { _id: 0, month: '$_id', playerCount: { $size: '$distinctPlayers' } } }, { $sort: { month: 1 } } ])`],
[3,'mongo',`Top 3 players by total score.`,`db.sessions.aggregate([ { $group: { _id: '$username', total: { $sum: '$score' } } }, { $sort: { total: -1 } }, { $limit: 3 } ])`],
[3,'mongo',`For each genre: count, average score and average duration.`,`db.sessions.aggregate([ { $group: { _id: '$genre', n: { $sum: 1 }, avgScore: { $avg: '$score' }, avgDur: { $avg: '$durationMin' } } } ])`],
[3,'mongo',`Join sessions to the games collection on gameTitle using $lookup.`,`db.sessions.aggregate([ { $lookup: { from: 'games', localField: 'gameTitle', foreignField: 'title', as: 'game' } } ])`],
[3,'mongo',`Bucket sessions by score (0-1000, 1000-2000, 2000-5000).`,`db.sessions.aggregate([ { $bucket: { groupBy: '$score', boundaries: [0,1000,2000,5000], default: 'other', output: { count: { $sum: 1 } } } } ])`],
[3,'mongo',`Use $facet for count per genre AND the top 3 sessions by score.`,`db.sessions.aggregate([ { $facet: { byGenre: [ { $group: { _id: '$genre', n: { $sum: 1 } } } ], topScores: [ { $sort: { score: -1 } }, { $limit: 3 } ] } } ])`],
[3,'mongo',`For each tag, the number of distinct players.`,`db.sessions.aggregate([ { $unwind: '$tags' }, { $group: { _id: '$tags', players: { $addToSet: '$username' } } }, { $project: { n: { $size: '$players' } } } ])`],
[3,'mongo',`Average score grouped by premium and genre.`,`db.sessions.aggregate([ { $group: { _id: { premium: '$premium', genre: '$genre' }, avg: { $avg: '$score' } } } ])`],
[3,'mongo',`The game with the highest total play time.`,`db.sessions.aggregate([ { $group: { _id: '$gameTitle', playtime: { $sum: '$durationMin' } } }, { $sort: { playtime: -1 } }, { $limit: 1 } ])`],
[3,'mongo',`Per studio: total score and number of sessions, only studios with more than 5 sessions.`,`db.sessions.aggregate([ { $group: { _id: '$studio', totalScore: { $sum: '$score' }, n: { $sum: 1 } } }, { $match: { n: { $gt: 5 } } } ])`],
[3,'mongo',`Tag each session 'long' if duration > 90 else 'short', then count per flag.`,`db.sessions.aggregate([ { $project: { long: { $cond: [ { $gt: ['$durationMin', 90] }, 'long', 'short' ] } } }, { $group: { _id: '$long', n: { $sum: 1 } } } ])`],
[3,'mongo',`Win rate: percentage of sessions tagged 'victory'.`,`db.sessions.aggregate([ { $group: { _id: null, total: { $sum: 1 }, wins: { $sum: { $cond: [ { $in: ['victory','$tags'] }, 1, 0 ] } } } }, { $project: { pct: { $multiply: [ { $divide: ['$wins','$total'] }, 100 ] } } } ])`],
[3,'mongo',`Top game per genre by total score.`,`db.sessions.aggregate([ { $group: { _id: { genre: '$genre', game: '$gameTitle' }, total: { $sum: '$score' } } }, { $sort: { total: -1 } }, { $group: { _id: '$_id.genre', topGame: { $first: '$_id.game' }, score: { $first: '$total' } } } ])`],
[3,'mongo',`For each player, the distinct games they played and the count.`,`db.sessions.aggregate([ { $group: { _id: '$username', games: { $addToSet: '$gameTitle' } } }, { $project: { n: { $size: '$games' } } } ])`],
[3,'mongo',`The genre with the highest average score.`,`db.sessions.aggregate([ { $group: { _id: '$genre', avg: { $avg: '$score' } } }, { $sort: { avg: -1 } }, { $limit: 1 } ])`],
[3,'mongo',`Top 5 tags by number of sessions.`,`db.sessions.aggregate([ { $unwind: '$tags' }, { $group: { _id: '$tags', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 5 } ])`],
[3,'mongo',`Average session duration per calendar month.`,`db.sessions.aggregate([ { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$playedOn' } }, avg: { $avg: '$durationMin' } } }, { $sort: { _id: 1 } } ])`],
[3,'mongo',`For each player, the number of distinct studios they engaged with.`,`db.sessions.aggregate([ { $group: { _id: '$username', studios: { $addToSet: '$studio' } } }, { $project: { n: { $size: '$studios' } } } ])`],
[3,'mongo',`Per premium group: session count and average score.`,`db.sessions.aggregate([ { $group: { _id: '$premium', n: { $sum: 1 }, avgScore: { $avg: '$score' } } } ])`],
/* REDIS BEGINNER (university) */
[1,'redis',`Read the current value of total_students.`,`GET total_students`],
[1,'redis',`Read the current value of total_courses.`,`GET total_courses`],
[1,'redis',`A new student registers — increase total_students by one.`,`INCR total_students`],
[1,'redis',`A student withdraws — decrease total_students by one.`,`DECR total_students`],
[1,'redis',`Get the complete record of student 1001.`,`HGETALL student:1001`],
[1,'redis',`Get the name of student 1001.`,`HGET student:1001 name`],
[1,'redis',`Get the gpa of student 1001.`,`HGET student:1001 gpa`],
[1,'redis',`Get the name of the CS department.`,`HGET department:CS name`],
[1,'redis',`Get the complete record of course CS101.`,`HGETALL course:CS101`],
[1,'redis',`Get the number of credits for CS101.`,`HGET course:CS101 credits`],
[1,'redis',`Get the name of instructor 5001.`,`HGET instructor:5001 name`],
[1,'redis',`List all students enrolled in CS101.`,`SMEMBERS course:CS101:students`],
[1,'redis',`List all courses student 1003 is enrolled in.`,`SMEMBERS student:1003:courses`],
[1,'redis',`Check whether student 1002 is enrolled in CS101.`,`SISMEMBER course:CS101:students 1002`],
[1,'redis',`List all university departments.`,`SMEMBERS university:departments`],
[1,'redis',`List all students in the CS department.`,`SMEMBERS department:CS:students`],
[1,'redis',`List all courses in the CS department.`,`SMEMBERS department:CS:courses`],
[1,'redis',`How many students are enrolled in CS101?`,`SCARD course:CS101:students`],
[1,'redis',`How many students are in the CS department?`,`SCARD department:CS:students`],
[1,'redis',`Show the full activity log of student 1001 in order.`,`LRANGE student:1001:activity 0 -1`],
[1,'redis',`How many activity entries does student 1001 have?`,`LLEN student:1001:activity`],
[1,'redis',`Get the first (oldest) activity entry of student 1001.`,`LINDEX student:1001:activity 0`],
[1,'redis',`List CS101 grades from lowest to highest, with scores.`,`ZRANGE course:CS101:grades 0 -1 WITHSCORES`],
[1,'redis',`List CS101 grades from highest to lowest, with scores.`,`ZREVRANGE course:CS101:grades 0 -1 WITHSCORES`],
[1,'redis',`Get the CS101 grade of student 1001.`,`ZSCORE course:CS101:grades 1001`],
[1,'redis',`How many students have a CS101 grade?`,`ZCARD course:CS101:grades`],
[1,'redis',`Who is the instructor of CS101?`,`GET course:CS101:instructor`],
[1,'redis',`Check whether the key student:1001 exists.`,`EXISTS student:1001`],
[1,'redis',`Report the data type of course:CS101:grades.`,`TYPE course:CS101:grades`],
[1,'redis',`Report the data type of student:1001.`,`TYPE student:1001`],
[1,'redis',`Get all field names of student 1001.`,`HKEYS student:1001`],
[1,'redis',`Get all field values of student 1001.`,`HVALS student:1001`],
[1,'redis',`How many fields does student 1001 have?`,`HLEN student:1001`],
[1,'redis',`Get the building of the EE department.`,`HGET department:EE building`],
[1,'redis',`List all students enrolled in CS103.`,`SMEMBERS course:CS103:students`],
[1,'redis',`Get the name of student 1003.`,`HGET student:1003 name`],
[1,'redis',`List CS102 grades with scores.`,`ZRANGE course:CS102:grades 0 -1 WITHSCORES`],
[1,'redis',`Check whether CS102 is a course of the CS department.`,`SISMEMBER department:CS:courses CS102`],
[1,'redis',`Show the top student in CS101 (highest grade) with score.`,`ZREVRANGE course:CS101:grades 0 0 WITHSCORES`],
[1,'redis',`Get the name of course CS102.`,`HGET course:CS102 name`],
/* REDIS INTERMEDIATE (university) */
[2,'redis',`Get the complete record of student 1003.`,`HGETALL student:1003`],
[2,'redis',`Get just the gpa of student 1003.`,`HGET student:1003 gpa`],
[2,'redis',`Student 1003 has graduated — change their status field to graduated.`,`HSET student:1003 status graduated`],
[2,'redis',`Student 1001 just logged out — append "Logged out" as the newest activity entry.`,`RPUSH student:1001:activity "Logged out"`],
[2,'redis',`Show only the first two (oldest) entries of student 1001's activity log.`,`LRANGE student:1001:activity 0 1`],
[2,'redis',`Enroll student 1002 into CS103 — update the student's course set.`,`SADD student:1002:courses CS103`],
[2,'redis',`Enroll student 1002 into CS103 — update the course's student set.`,`SADD course:CS103:students 1002`],
[2,'redis',`Check whether student 1004 is enrolled in CS101.`,`SISMEMBER course:CS101:students 1004`],
[2,'redis',`List CS101 students who scored 90 or above, with scores.`,`ZRANGEBYSCORE course:CS101:grades 90 +inf WITHSCORES`],
[2,'redis',`Record a grade of 79 for student 1004 in CS101.`,`ZADD course:CS101:grades 79 1004`],
[2,'redis',`Give student 1001 a 5-point bonus in CS101.`,`ZINCRBY course:CS101:grades 5 1001`],
[2,'redis',`Advance student 1001 by one academic year.`,`HINCRBY student:1001 year 1`],
[2,'redis',`Register a new student 1006 with name "New Student".`,`HSET student:1006 name "New Student"`],
[2,'redis',`Add a new department 'ME' to the university.`,`SADD university:departments ME`],
[2,'redis',`How many students are enrolled in CS102?`,`SCARD course:CS102:students`],
[2,'redis',`List students enrolled in BOTH CS101 and CS102.`,`SINTER course:CS101:students course:CS102:students`],
[2,'redis',`List students enrolled in CS101 OR CS103.`,`SUNION course:CS101:students course:CS103:students`],
[2,'redis',`List students in CS101 but NOT in CS102.`,`SDIFF course:CS101:students course:CS102:students`],
[2,'redis',`How many CS101 students scored between 80 and 100?`,`ZCOUNT course:CS101:grades 80 100`],
[2,'redis',`What is student 1002's rank in CS101 (lowest grade = 0)?`,`ZRANK course:CS101:grades 1002`],
[2,'redis',`What is student 1003's rank in CS101 counting from the top?`,`ZREVRANK course:CS101:grades 1003`],
[2,'redis',`Unenroll student 1002 from CS101 (course side).`,`SREM course:CS101:students 1002`],
[2,'redis',`Move student 1004 from the CS department to the EE department.`,`SMOVE department:CS:students department:EE:students 1004`],
[2,'redis',`Push "Session start" to the head of student 1001's activity log.`,`LPUSH student:1001:activity "Session start"`],
[2,'redis',`Keep only the first 3 entries of student 1001's activity log.`,`LTRIM student:1001:activity 0 2`],
[2,'redis',`Remove the newest entry from student 1001's activity log.`,`RPOP student:1001:activity`],
[2,'redis',`Check whether student 1001 has a gpa field.`,`HEXISTS student:1001 gpa`],
[2,'redis',`Get the name and gpa of student 1001 together.`,`HMGET student:1001 name gpa`],
[2,'redis',`Set a 1800-second expiry on session:1001.`,`EXPIRE session:1001 1800`],
[2,'redis',`Make session:1001 permanent (remove its expiry).`,`PERSIST session:1001`],
[2,'redis',`Get student 1003's grade in CS102.`,`ZSCORE course:CS102:grades 1003`],
[2,'redis',`How many departments does the university have?`,`SCARD university:departments`],
[2,'redis',`Check whether CS102 is in student 1003's courses.`,`SISMEMBER student:1003:courses CS102`],
[2,'redis',`Remove the status field of student 1004.`,`HDEL student:1004 status`],
[2,'redis',`Who is the instructor of CS103?`,`GET course:CS103:instructor`],
[2,'redis',`Record a grade of 88 for student 1005 in EE201.`,`ZADD course:EE201:grades 88 1005`],
[2,'redis',`Set total_courses to 5 only if it does not already exist.`,`SETNX total_courses 5`],
[2,'redis',`Get the title of instructor 5002.`,`HGET instructor:5002 title`],
[2,'redis',`List the second-to-last activity entry of student 1001.`,`LINDEX student:1001:activity -2`],
[2,'redis',`Add courses CS101 and CS102 to student 1006.`,`SADD student:1006:courses CS101 CS102`],
/* REDIS HARD (university) */
[3,'redis',`How many seconds remain on session:1001 before it expires?`,`TTL session:1001`],
[3,'redis',`Confirm session:1001 still exists, and report the type of course:CS101:grades.`,`EXISTS session:1001\nTYPE course:CS101:grades`],
[3,'redis',`Enroll student 1005 into CS102 as a single atomic transaction that updates both the student's course set and the course's student set.`,`MULTI\nSADD student:1005:courses CS102\nSADD course:CS102:students 1005\nEXEC`],
[3,'redis',`Show the entire activity log of student 1001 in chronological order.`,`LRANGE student:1001:activity 0 -1`],
[3,'redis',`Show the top student in CS101 by grade, with score.`,`ZREVRANGE course:CS101:grades 0 0 WITHSCORES`],
[3,'redis',`Record a grade of 79 for student 1004 in CS101, then show the full ranking highest-to-lowest.`,`ZADD course:CS101:grades 79 1004\nZREVRANGE course:CS101:grades 0 -1 WITHSCORES`],
[3,'redis',`Atomically increment total_students and register student 1007 with name "Zoe".`,`MULTI\nINCR total_students\nHSET student:1007 name "Zoe"\nEXEC`],
[3,'redis',`List students enrolled in both CS101 and CS103.`,`SINTER course:CS101:students course:CS103:students`],
[3,'redis',`Move the most recent activity entry of student 1001 into an archive list.`,`RPOPLPUSH student:1001:activity student:1001:archive`],
[3,'redis',`Count CS101 students scoring 85 or above.`,`ZCOUNT course:CS101:grades 85 +inf`],
[3,'redis',`Remove the lowest-graded student from CS101.`,`ZREMRANGEBYRANK course:CS101:grades 0 0`],
[3,'redis',`Remove and return the highest grade in CS101.`,`ZPOPMAX course:CS101:grades`],
[3,'redis',`List CS101 grades between 70 and 90, with scores.`,`ZRANGEBYSCORE course:CS101:grades 70 90 WITHSCORES`],
[3,'redis',`Atomically enroll student 1002 into CS103 in both directions.`,`MULTI\nSADD student:1002:courses CS103\nSADD course:CS103:students 1002\nEXEC`],
[3,'redis',`Scan for keys matching student:*.`,`SCAN 0 MATCH student:*`],
[3,'redis',`How many courses does student 1003 take?`,`SCARD student:1003:courses`],
[3,'redis',`List all courses in the CS department.`,`SMEMBERS department:CS:courses`],
[3,'redis',`Set a 60-second expiry on session:1001, then read its TTL.`,`EXPIRE session:1001 60\nTTL session:1001`],
[3,'redis',`List students in CS101 but not CS102.`,`SDIFF course:CS101:students course:CS102:students`],
[3,'redis',`Watch total_students, then run a transaction that increments it.`,`WATCH total_students\nMULTI\nINCR total_students\nEXEC`],
/* ===== EXTRA HARDER TASKS (full-text + complex pipelines) ===== */
/* PG full-text search family */
[2,'pg',`Find reviews that mention 'multiplayer' using full-text search; return the game title and review body.`,`SELECT g.title, r.body FROM reviews r JOIN games g ON r.game_id = g.game_id WHERE to_tsvector('english', r.body) @@ plainto_tsquery('english','multiplayer');`],
[2,'pg',`Find reviews mentioning 'dragons' OR 'strategy' (to_tsquery), ranked by relevance, most relevant first.`,`SELECT g.title, ts_rank(to_tsvector('english', r.body), to_tsquery('english','dragons | strategy')) AS relevance FROM reviews r JOIN games g ON r.game_id = g.game_id WHERE to_tsvector('english', r.body) @@ to_tsquery('english','dragons | strategy') ORDER BY relevance DESC;`],
[2,'pg',`Count, per game, how many reviews mention the word 'fun'.`,`SELECT g.title, COUNT(*) FROM reviews r JOIN games g ON r.game_id = g.game_id WHERE to_tsvector('english', r.body) @@ plainto_tsquery('english','fun') GROUP BY g.title;`],
[3,'pg',`Find reviews matching the PHRASE 'space shooter' (adjacent words) with phraseto_tsquery; return title, rating and a relevance rank, most relevant first.`,`SELECT g.title, r.rating, ts_rank(to_tsvector('english', r.body), phraseto_tsquery('english','space shooter')) AS relevance FROM reviews r JOIN games g ON r.game_id = g.game_id WHERE to_tsvector('english', r.body) @@ phraseto_tsquery('english','space shooter') ORDER BY relevance DESC;`],
[3,'pg',`Run a web-style search 'survival crafting' over review bodies (websearch_to_tsquery) and rank matches by relevance.`,`SELECT g.title, ts_rank(to_tsvector('english', r.body), websearch_to_tsquery('english','survival crafting')) AS relevance FROM reviews r JOIN games g ON r.game_id = g.game_id WHERE to_tsvector('english', r.body) @@ websearch_to_tsquery('english','survival crafting') ORDER BY relevance DESC;`],
[3,'pg',`For reviews matching both 'space' and 'shooter', return the game title and a highlighted snippet of the body using ts_headline.`,`SELECT g.title, ts_headline('english', r.body, to_tsquery('english','space & shooter')) AS snippet FROM reviews r JOIN games g ON r.game_id = g.game_id WHERE to_tsvector('english', r.body) @@ to_tsquery('english','space & shooter');`],
/* Mongo complex reshaping + lookup */
[2,'mongo',`Count sessions per game, reshaped to { gameTitle, sessions } (no _id).`,`db.sessions.aggregate([ { $group: { _id: '$gameTitle', sessions: { $sum: 1 } } }, { $project: { _id: 0, gameTitle: '$_id', sessions: 1 } } ])`],
[3,'mongo',`Join sessions to games on gameTitle, then return { username, gameTitle, price } from the joined game.`,`db.sessions.aggregate([ { $lookup: { from: 'games', localField: 'gameTitle', foreignField: 'title', as: 'g' } }, { $unwind: '$g' }, { $project: { _id: 0, username: 1, gameTitle: 1, price: '$g.price' } } ])`],
[3,'mongo',`Per genre: total score and average duration, sorted by total score desc, reshaped to { genre, totalScore, avgDuration }.`,`db.sessions.aggregate([ { $group: { _id: '$genre', totalScore: { $sum: '$score' }, avgDuration: { $avg: '$durationMin' } } }, { $sort: { totalScore: -1 } }, { $project: { _id: 0, genre: '$_id', totalScore: 1, avgDuration: 1 } } ])`],
[3,'mongo',`Highest-scoring session per player, reshaped to { username, gameTitle, score } (sort then group $first).`,`db.sessions.aggregate([ { $sort: { score: -1 } }, { $group: { _id: '$username', gameTitle: { $first: '$gameTitle' }, score: { $first: '$score' } } }, { $project: { _id: 0, username: '$_id', gameTitle: 1, score: 1 } } ])`],
[3,'mongo',`Per studio: distinct players and total score, only studios with more than 5 sessions, reshaped to { studio, distinctPlayers, totalScore }.`,`db.sessions.aggregate([ { $group: { _id: '$studio', players: { $addToSet: '$username' }, totalScore: { $sum: '$score' }, n: { $sum: 1 } } }, { $match: { n: { $gt: 5 } } }, { $project: { _id: 0, studio: '$_id', distinctPlayers: { $size: '$players' }, totalScore: 1 } } ])`],
/* Redis multi-step / transactions */
[3,'redis',`Promote student 1004: set status to 'honors', add 3 bonus points to their CS101 grade, then show the CS101 ranking high-to-low.`,`HSET student:1004 status honors\nZINCRBY course:CS101:grades 3 1004\nZREVRANGE course:CS101:grades 0 -1 WITHSCORES`],
[3,'redis',`Atomically transfer student 1001 from CS102 to CS103 (remove from CS102 both ways, add to CS103 both ways).`,`MULTI\nSREM student:1001:courses CS102\nSREM course:CS102:students 1001\nSADD student:1001:courses CS103\nSADD course:CS103:students 1001\nEXEC`],
[3,'redis',`Record a grade of 70 for student 1002 in CS102, then list the bottom 2 students by grade, with scores.`,`ZADD course:CS102:grades 70 1002\nZRANGE course:CS102:grades 0 1 WITHSCORES`],
[3,'redis',`Append "Opened CS102" then "Logged out" to student 1001's activity, then show the last 3 entries.`,`RPUSH student:1001:activity "Opened CS102"\nRPUSH student:1001:activity "Logged out"\nLRANGE student:1001:activity -3 -1`],
];
const _IGNORED_OLD = [
/* PG BEGINNER */
[1,'pg',`Join employees with departments and show each employee first_name and their dept_name.`,`SELECT e.first_name, d.dept_name FROM employees e JOIN departments d ON e.dept_id = d.dept_id;`],
[1,'pg',`List every employee with their department name, INCLUDING employees with no department (LEFT JOIN).`,`SELECT e.first_name, d.dept_name FROM employees e LEFT JOIN departments d ON e.dept_id = d.dept_id;`],
[1,'pg',`Show the total salary paid per department NAME.`,`SELECT d.dept_name, SUM(e.salary) FROM employees e JOIN departments d ON e.dept_id = d.dept_id GROUP BY d.dept_name;`],
[1,'pg',`Find departments (dept_id) that have more than 5 employees.`,`SELECT dept_id FROM employees GROUP BY dept_id HAVING COUNT(*) > 5;`],
[1,'pg',`Show the average salary per dept_id, only where that average is above 50000.`,`SELECT dept_id, AVG(salary) FROM employees GROUP BY dept_id HAVING AVG(salary) > 50000;`],
[1,'pg',`Find the second-highest salary in the company.`,`SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);`],
[1,'pg',`Find employees who earn more than the company average salary.`,`SELECT * FROM employees WHERE salary > (SELECT AVG(salary) FROM employees);`],
[1,'pg',`Count how many employees were hired in each year of hire_date.`,`SELECT EXTRACT(YEAR FROM hire_date) AS yr, COUNT(*) FROM employees GROUP BY yr;`],
[1,'pg',`Show each employee's name with their manager's name (self join).`,`SELECT e.first_name, m.first_name AS manager FROM employees e JOIN employees m ON e.manager_id = m.emp_id;`],
[1,'pg',`Show first_name and last_name combined into one column full_name.`,`SELECT first_name || ' ' || last_name AS full_name FROM employees;`],
[1,'pg',`Find employees whose email contains 'gmail'.`,`SELECT * FROM employees WHERE email LIKE '%gmail%';`],
[1,'pg',`Show each department NAME with the total budget of its projects.`,`SELECT d.dept_name, SUM(p.budget) FROM projects p JOIN departments d ON p.dept_id = d.dept_id GROUP BY d.dept_name;`],
[1,'pg',`Find projects whose budget is above the average project budget.`,`SELECT * FROM projects WHERE budget > (SELECT AVG(budget) FROM projects);`],
[1,'pg',`Rank all employees by salary highest to lowest using RANK.`,`SELECT first_name, salary, RANK() OVER (ORDER BY salary DESC) AS rnk FROM employees;`],
[1,'pg',`Show a running total of salary ordered by hire_date.`,`SELECT first_name, hire_date, SUM(salary) OVER (ORDER BY hire_date) AS running_total FROM employees;`],
[1,'pg',`Number employees within each department by salary (highest=1) using ROW_NUMBER + PARTITION BY.`,`SELECT first_name, dept_id, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rn FROM employees;`],
[1,'pg',`Find employees who work in departments located in 'New York'.`,`SELECT * FROM employees WHERE dept_id IN (SELECT dept_id FROM departments WHERE location = 'New York');`],
[1,'pg',`Give every employee in department 2 a 10% pay raise (UPDATE).`,`UPDATE employees SET salary = salary * 1.1 WHERE dept_id = 2;`],
[1,'pg',`Delete employees whose salary is below 20000.`,`DELETE FROM employees WHERE salary < 20000;`],
[1,'pg',`Insert a new department: dept_id 10, dept_name 'Research', location 'Boston'.`,`INSERT INTO departments (dept_id, dept_name, location) VALUES (10, 'Research', 'Boston');`],
/* PG INTERMEDIATE */
[2,'pg',`For each department, show the first_name of its highest-paid employee.`,`SELECT dept_id, first_name FROM (SELECT dept_id, first_name, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) rn FROM employees) t WHERE rn = 1;`],
[2,'pg',`Show the top 3 earners within each department.`,`SELECT * FROM (SELECT *, RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) r FROM employees) t WHERE r <= 3;`],
[2,'pg',`List departments (dept_id) where EVERY employee earns more than 30000.`,`SELECT dept_id FROM employees GROUP BY dept_id HAVING MIN(salary) > 30000;`],
[2,'pg',`Show each department's total salary as a percentage of the company total.`,`SELECT dept_id, SUM(salary) * 100.0 / SUM(SUM(salary)) OVER () AS pct FROM employees GROUP BY dept_id;`],
[2,'pg',`Find employees who earn more than their own manager.`,`SELECT e.first_name FROM employees e JOIN employees m ON e.manager_id = m.emp_id WHERE e.salary > m.salary;`],
[2,'pg',`Compute the median salary per department using PERCENTILE_CONT.`,`SELECT dept_id, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) AS median FROM employees GROUP BY dept_id;`],
[2,'pg',`Show the cumulative head-count of employees ordered by hire_date.`,`SELECT hire_date, COUNT(*) OVER (ORDER BY hire_date) AS cumulative FROM employees;`],
[2,'pg',`Count employees per department using COUNT ... FILTER.`,`SELECT COUNT(*) FILTER (WHERE dept_id = 1) AS d1, COUNT(*) FILTER (WHERE dept_id = 2) AS d2 FROM employees;`],
[2,'pg',`Find duplicate email addresses (used by more than one employee).`,`SELECT email FROM employees GROUP BY email HAVING COUNT(*) > 1;`],
[2,'pg',`Build the management hierarchy from top managers using WITH RECURSIVE.`,`WITH RECURSIVE chain AS (SELECT emp_id, manager_id, first_name FROM employees WHERE manager_id IS NULL UNION ALL SELECT e.emp_id, e.manager_id, e.first_name FROM employees e JOIN chain c ON e.manager_id = c.emp_id) SELECT * FROM chain;`],
[2,'pg',`For each department NAME show employee count and average salary, ordered by average desc.`,`SELECT d.dept_name, COUNT(*), AVG(e.salary) FROM employees e JOIN departments d ON e.dept_id = d.dept_id GROUP BY d.dept_name ORDER BY AVG(e.salary) DESC;`],
[2,'pg',`Find departments that have NO employees.`,`SELECT d.* FROM departments d LEFT JOIN employees e ON d.dept_id = e.dept_id WHERE e.emp_id IS NULL;`],
[2,'pg',`Find employees who earn more than the average salary of THEIR OWN DEPARTMENT.`,`SELECT * FROM employees e WHERE salary > (SELECT AVG(salary) FROM employees e2 WHERE e2.dept_id = e.dept_id);`],
[2,'pg',`Find the single department (dept_id) with the highest total salary.`,`SELECT dept_id FROM employees GROUP BY dept_id ORDER BY SUM(salary) DESC LIMIT 1;`],
[2,'pg',`Classify each employee as 'High' (>=70000), 'Mid' (>=40000) or 'Low' using CASE.`,`SELECT first_name, CASE WHEN salary >= 70000 THEN 'High' WHEN salary >= 40000 THEN 'Mid' ELSE 'Low' END AS band FROM employees;`],
[2,'pg',`Count how many employees fall in each salary band (CASE in GROUP BY).`,`SELECT CASE WHEN salary >= 70000 THEN 'High' WHEN salary >= 40000 THEN 'Mid' ELSE 'Low' END AS band, COUNT(*) FROM employees GROUP BY band;`],
[2,'pg',`Show each employee's salary and the next-lower salary using LAG (order by salary).`,`SELECT first_name, salary, LAG(salary) OVER (ORDER BY salary) AS prev_salary FROM employees;`],
[2,'pg',`Show manager_id, replacing NULL with 'No manager' using COALESCE.`,`SELECT first_name, COALESCE(manager_id::text, 'No manager') AS mgr FROM employees;`],
[2,'pg',`Count employees hired in 2021 or 2022, grouped by year.`,`SELECT EXTRACT(YEAR FROM hire_date) AS yr, COUNT(*) FROM employees WHERE EXTRACT(YEAR FROM hire_date) IN (2021,2022) GROUP BY yr;`],
[2,'pg',`Show total project budget per department LOCATION.`,`SELECT d.location, SUM(p.budget) FROM projects p JOIN departments d ON p.dept_id = d.dept_id GROUP BY d.location;`],
/* PG HARD */
[3,'pg',`Top 3 earners per department, only for departments with at least 5 employees.`,`WITH big AS (SELECT dept_id FROM employees GROUP BY dept_id HAVING COUNT(*) >= 5), ranked AS (SELECT e.*, RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) r FROM employees e WHERE dept_id IN (SELECT dept_id FROM big)) SELECT * FROM ranked WHERE r <= 3;`],
[3,'pg',`Label each employee ABOVE or BELOW the company median salary.`,`SELECT first_name, CASE WHEN salary >= (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) FROM employees) THEN 'ABOVE' ELSE 'BELOW' END AS vs_median FROM employees;`],
[3,'pg',`3-row moving average of salary ordered by hire_date.`,`SELECT hire_date, salary, AVG(salary) OVER (ORDER BY hire_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg FROM employees;`],
[3,'pg',`Every employee whose salary equals the max salary in their own department.`,`SELECT * FROM (SELECT *, MAX(salary) OVER (PARTITION BY dept_id) AS m FROM employees) t WHERE salary = m;`],
[3,'pg',`Pivot total salary by department for hire years 2021 and 2022 (SUM ... FILTER).`,`SELECT dept_id, SUM(salary) FILTER (WHERE EXTRACT(YEAR FROM hire_date) = 2021) AS y2021, SUM(salary) FILTER (WHERE EXTRACT(YEAR FROM hire_date) = 2022) AS y2022 FROM employees GROUP BY dept_id;`],
[3,'pg',`Org chart with a depth LEVEL using WITH RECURSIVE.`,`WITH RECURSIVE org AS (SELECT emp_id, manager_id, first_name, 1 AS lvl FROM employees WHERE manager_id IS NULL UNION ALL SELECT e.emp_id, e.manager_id, e.first_name, o.lvl + 1 FROM employees e JOIN org o ON e.manager_id = o.emp_id) SELECT * FROM org;`],
[3,'pg',`Find the 3rd-highest DISTINCT salary using DENSE_RANK.`,`SELECT salary FROM (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) dr FROM employees) t WHERE dr = 3;`],
[3,'pg',`Each employee's salary as a percentage of their department total.`,`SELECT first_name, salary, salary * 100.0 / SUM(salary) OVER (PARTITION BY dept_id) AS pct_of_dept FROM employees;`],
[3,'pg',`Pairs of employees in DIFFERENT departments with the same salary.`,`SELECT a.first_name, b.first_name FROM employees a JOIN employees b ON a.salary = b.salary AND a.dept_id <> b.dept_id AND a.emp_id < b.emp_id;`],
[3,'pg',`Split employees into 4 salary quartiles using NTILE.`,`SELECT first_name, salary, NTILE(4) OVER (ORDER BY salary) AS quartile FROM employees;`],
/* MONGO BEGINNER */
[1,'mongo',`Find books whose price is between 10 and 30 inclusive.`,`db.books.find({ price: { $gte: 10, $lte: 30 } })`],
[1,'mongo',`Find books that are in BOTH the 'sci-fi' and 'classic' genres.`,`db.books.find({ genres: { $all: ['sci-fi', 'classic'] } })`],
[1,'mongo',`Find books by 'Asimov' OR 'Tolkien'.`,`db.books.find({ $or: [ { author: 'Asimov' }, { author: 'Tolkien' } ] })`],
[1,'mongo',`Set inStock to true for the book titled 'Dune'.`,`db.books.updateOne({ title: 'Dune' }, { $set: { inStock: true } })`],
[1,'mongo',`Increase the price of 'Dune' by 5.`,`db.books.updateOne({ title: 'Dune' }, { $inc: { price: 5 } })`],
[1,'mongo',`Add the genre 'bestseller' to the genres array of 'Dune'.`,`db.books.updateOne({ title: 'Dune' }, { $push: { genres: 'bestseller' } })`],
[1,'mongo',`Remove the genre 'classic' from the genres array of 'Dune'.`,`db.books.updateOne({ title: 'Dune' }, { $pull: { genres: 'classic' } })`],
[1,'mongo',`Delete all books with a rating below 2.`,`db.books.deleteMany({ rating: { $lt: 2 } })`],
[1,'mongo',`Count how many books each author has.`,`db.books.aggregate([ { $group: { _id: '$author', count: { $sum: 1 } } } ])`],
[1,'mongo',`Compute the average rating per author.`,`db.books.aggregate([ { $group: { _id: '$author', avgRating: { $avg: '$rating' } } } ])`],
[1,'mongo',`Compute the total pages per publisher.`,`db.books.aggregate([ { $group: { _id: '$publisher', totalPages: { $sum: '$pages' } } } ])`],
[1,'mongo',`Count how many books fall in each genre (unwind genres, then group).`,`db.books.aggregate([ { $unwind: '$genres' }, { $group: { _id: '$genres', count: { $sum: 1 } } } ])`],
[1,'mongo',`Find the 3 highest-rated books (sort + limit).`,`db.books.find().sort({ rating: -1 }).limit(3)`],
[1,'mongo',`Find authors who have written more than 3 books.`,`db.books.aggregate([ { $group: { _id: '$author', count: { $sum: 1 } } }, { $match: { count: { $gt: 3 } } } ])`],
[1,'mongo',`Find books whose title starts with 'The'.`,`db.books.find({ title: /^The/ })`],
[1,'mongo',`Compute the average price of 'sci-fi' books.`,`db.books.aggregate([ { $match: { genres: 'sci-fi' } }, { $group: { _id: null, avgPrice: { $avg: '$price' } } } ])`],
[1,'mongo',`Count books in stock vs out of stock (group by inStock).`,`db.books.aggregate([ { $group: { _id: '$inStock', count: { $sum: 1 } } } ])`],
[1,'mongo',`Find books that have exactly 2 genres.`,`db.books.find({ genres: { $size: 2 } })`],
[1,'mongo',`Set onSale true for every book priced under 15.`,`db.books.updateMany({ price: { $lt: 15 } }, { $set: { onSale: true } })`],
[1,'mongo',`List authors sorted by number of books, most first.`,`db.books.aggregate([ { $group: { _id: '$author', count: { $sum: 1 } } }, { $sort: { count: -1 } } ])`],
/* MONGO INTERMEDIATE */
[2,'mongo',`For each genre, average price, top 5 highest.`,`db.books.aggregate([ { $unwind: '$genres' }, { $group: { _id: '$genres', avgPrice: { $avg: '$price' } } }, { $sort: { avgPrice: -1 } }, { $limit: 5 } ])`],
[2,'mongo',`Per publisher: count and average rating, keep only publishers with at least 5 books.`,`db.books.aggregate([ { $group: { _id: '$publisher', n: { $sum: 1 }, avgR: { $avg: '$rating' } } }, { $match: { n: { $gte: 5 } } } ])`],
[2,'mongo',`Join each book to the 'authors' collection on author using $lookup.`,`db.books.aggregate([ { $lookup: { from: 'authors', localField: 'author', foreignField: 'name', as: 'authorInfo' } } ])`],
[2,'mongo',`Most expensive book per author (sort by price desc, group with $first).`,`db.books.aggregate([ { $sort: { price: -1 } }, { $group: { _id: '$author', topBook: { $first: '$title' }, price: { $first: '$price' } } } ])`],
[2,'mongo',`Group books into price buckets 0-10, 10-20, 20-50 using $bucket.`,`db.books.aggregate([ { $bucket: { groupBy: '$price', boundaries: [0,10,20,50], default: 'other', output: { count: { $sum: 1 } } } } ])`],
[2,'mongo',`Use $facet for count per genre AND top 3 priciest books.`,`db.books.aggregate([ { $facet: { byGenre: [ { $unwind: '$genres' }, { $group: { _id: '$genres', n: { $sum: 1 } } } ], topPriced: [ { $sort: { price: -1 } }, { $limit: 3 } ] } } ])`],
[2,'mongo',`Add a computed field discountPrice = price * 0.9 using $project.`,`db.books.aggregate([ { $project: { title: 1, discountPrice: { $multiply: ['$price', 0.9] } } } ])`],
[2,'mongo',`For each genre, count DISTINCT authors.`,`db.books.aggregate([ { $unwind: '$genres' }, { $group: { _id: '$genres', authors: { $addToSet: '$author' } } }, { $project: { numAuthors: { $size: '$authors' } } } ])`],
[2,'mongo',`Genre with the highest total pages.`,`db.books.aggregate([ { $unwind: '$genres' }, { $group: { _id: '$genres', totalPages: { $sum: '$pages' } } }, { $sort: { totalPages: -1 } }, { $limit: 1 } ])`],
[2,'mongo',`Find books whose title contains 'war', case-insensitive.`,`db.books.find({ title: { $regex: 'war', $options: 'i' } })`],
[2,'mongo',`Count books published per year, sorted by year.`,`db.books.aggregate([ { $group: { _id: '$year', count: { $sum: 1 } } }, { $sort: { _id: 1 } } ])`],
[2,'mongo',`Compute the overall average price.`,`db.books.aggregate([ { $group: { _id: null, avgPrice: { $avg: '$price' } } } ])`],
[2,'mongo',`Get the minimum and maximum price in one query.`,`db.books.aggregate([ { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } } ])`],
[2,'mongo',`Average rating for in-stock vs out-of-stock books.`,`db.books.aggregate([ { $group: { _id: '$inStock', avgRating: { $avg: '$rating' } } } ])`],
[2,'mongo',`Total pages per author.`,`db.books.aggregate([ { $group: { _id: '$author', totalPages: { $sum: '$pages' } } } ])`],
[2,'mongo',`For each genre, the maximum price.`,`db.books.aggregate([ { $unwind: '$genres' }, { $group: { _id: '$genres', maxPrice: { $max: '$price' } } } ])`],
[2,'mongo',`Find books missing the publisher field.`,`db.books.find({ publisher: { $exists: false } })`],
[2,'mongo',`Second page of 5 books sorted by rating desc (skip 5, limit 5).`,`db.books.find().sort({ rating: -1 }).skip(5).limit(5)`],
[2,'mongo',`Add salePrice = price * 0.8 using $addFields.`,`db.books.aggregate([ { $addFields: { salePrice: { $multiply: ['$price', 0.8] } } } ])`],
[2,'mongo',`Rename field pages to pageCount on all documents.`,`db.books.updateMany({}, { $rename: { 'pages': 'pageCount' } })`],
/* MONGO HARD */
[3,'mongo',`For each author: average price AND an array of all their titles.`,`db.books.aggregate([ { $group: { _id: '$author', avgPrice: { $avg: '$price' }, titles: { $push: '$title' } } } ])`],
[3,'mongo',`Top 3 authors by total book value (sum of price).`,`db.books.aggregate([ { $group: { _id: '$author', total: { $sum: '$price' } } }, { $sort: { total: -1 } }, { $limit: 3 } ])`],
[3,'mongo',`Split books into 4 automatic price buckets ($bucketAuto).`,`db.books.aggregate([ { $bucketAuto: { groupBy: '$price', buckets: 4 } } ])`],
[3,'mongo',`In one $facet: total count, average price per genre, and overall min/max.`,`db.books.aggregate([ { $facet: { total: [ { $count: 'n' } ], byGenre: [ { $unwind: '$genres' }, { $group: { _id: '$genres', avg: { $avg: '$price' } } } ], stats: [ { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } } ] } } ])`],
[3,'mongo',`Unwind genres keeping the array index of each genre.`,`db.books.aggregate([ { $unwind: { path: '$genres', includeArrayIndex: 'idx' } } ])`],
[3,'mongo',`Authors with more than 2 books, by average rating desc, top 5.`,`db.books.aggregate([ { $group: { _id: '$author', n: { $sum: 1 }, avgR: { $avg: '$rating' } } }, { $match: { n: { $gt: 2 } } }, { $sort: { avgR: -1 } }, { $limit: 5 } ])`],
[3,'mongo',`Join to 'authors', flatten with $unwind, project title with author country.`,`db.books.aggregate([ { $lookup: { from: 'authors', localField: 'author', foreignField: 'name', as: 'a' } }, { $unwind: '$a' }, { $project: { title: 1, country: '$a.country' } } ])`],
[3,'mongo',`Project category 'cheap' if price < 15 else 'premium' using $cond.`,`db.books.aggregate([ { $project: { title: 1, category: { $cond: [ { $lt: ['$price', 15] }, 'cheap', 'premium' ] } } } ])`],
[3,'mongo',`Percentage of books that are in stock.`,`db.books.aggregate([ { $group: { _id: null, total: { $sum: 1 }, inStock: { $sum: { $cond: ['$inStock', 1, 0] } } } }, { $project: { pct: { $multiply: [ { $divide: ['$inStock', '$total'] }, 100 ] } } } ])`],
[3,'mongo',`Average price grouped by number of genres each book has.`,`db.books.aggregate([ { $group: { _id: { $size: '$genres' }, avgPrice: { $avg: '$price' } } }, { $sort: { _id: 1 } } ])`],
/* REDIS BEGINNER */
[1,'redis',`Set config:title to "Shop" only if it does not already exist.`,`SETNX config:title "Shop"`],
[1,'redis',`Set key temp to "x" with a 30-second expiry, single command.`,`SETEX temp 30 x`],
[1,'redis',`Set two keys at once: a = 1 and b = 2.`,`MSET a 1 b 2`],
[1,'redis',`Get the values of a and b together.`,`MGET a b`],
[1,'redis',`Increment the age field of hash user:100 by 1.`,`HINCRBY user:100 age 1`],
[1,'redis',`Get all field names of the hash user:100.`,`HKEYS user:100`],
[1,'redis',`Get all values of the hash user:100.`,`HVALS user:100`],
[1,'redis',`Get the number of fields in the hash user:100.`,`HLEN user:100`],
[1,'redis',`Push 'job0' onto the left (head) of queue:emails.`,`LPUSH queue:emails job0`],
[1,'redis',`Get the length of the list queue:emails.`,`LLEN queue:emails`],
[1,'redis',`Get the element at index 0 of queue:emails.`,`LINDEX queue:emails 0`],
[1,'redis',`Remove member 'u1' from the set online:users.`,`SREM online:users u1`],
[1,'redis',`Get the number of members in online:users.`,`SCARD online:users`],
[1,'redis',`Get the intersection of online:users and premium:users.`,`SINTER online:users premium:users`],
[1,'redis',`Get the union of online:users and premium:users.`,`SUNION online:users premium:users`],
[1,'redis',`Increase player1's score in scores by 50.`,`ZINCRBY scores 50 player1`],
[1,'redis',`List members of scores highest to lowest, with scores.`,`ZREVRANGE scores 0 -1 WITHSCORES`],
[1,'redis',`Get members of scores whose score is between 100 and 200.`,`ZRANGEBYSCORE scores 100 200`],
[1,'redis',`Remove the expiry (make permanent) from session:abc.`,`PERSIST session:abc`],
[1,'redis',`Report the data type of the key scores.`,`TYPE scores`],
/* REDIS INTERMEDIATE */
[2,'redis',`Atomically increment pageviews and set config:title to "x" (MULTI/EXEC).`,`MULTI\nINCR pageviews\nSET config:title x\nEXEC`],
[2,'redis',`Atomically move the last element of queue:emails to head of queue:processing.`,`RPOPLPUSH queue:emails queue:processing`],
[2,'redis',`Get player1's rank in scores from the highest score (0 = top).`,`ZREVRANK scores player1`],
[2,'redis',`Count members in scores with a score of at least 100.`,`ZCOUNT scores 100 +inf`],
[2,'redis',`Store weighted union of scores (w1) and bonus (w2) into total.`,`ZUNIONSTORE total 2 scores bonus WEIGHTS 1 2`],
[2,'redis',`Blocking left-pop on queue:emails, up to 5 seconds.`,`BLPOP queue:emails 5`],
[2,'redis',`Set the bit at offset 7 of key bitmap to 1.`,`SETBIT bitmap 7 1`],
[2,'redis',`Subscribe to the channel news.`,`SUBSCRIBE news`],
[2,'redis',`Publish "hello" to the channel news.`,`PUBLISH news hello`],
[2,'redis',`Get the top 3 players from scores (highest) with scores.`,`ZREVRANGE scores 0 2 WITHSCORES`],
[2,'redis',`Append " Online" to the string config:title.`,`APPEND config:title " Online"`],
[2,'redis',`Get the length of the string config:title.`,`STRLEN config:title`],
[2,'redis',`Set config:title to "New" and return its previous value.`,`GETSET config:title New`],
[2,'redis',`Get the name and email fields of user:100 together.`,`HMGET user:100 name email`],
[2,'redis',`Check whether the field age exists in user:100.`,`HEXISTS user:100 age`],
[2,'redis',`Set the element at index 0 of queue:emails to "first".`,`LSET queue:emails 0 first`],
[2,'redis',`Trim queue:emails so only the first 3 elements remain.`,`LTRIM queue:emails 0 2`],
[2,'redis',`Members in online:users but NOT in premium:users.`,`SDIFF online:users premium:users`],
[2,'redis',`Move member 'u1' from online:users to premium:users.`,`SMOVE online:users premium:users u1`],
[2,'redis',`Get player1's score from scores.`,`ZSCORE scores player1`],
/* REDIS HARD */
[3,'redis',`Watch config:title, then a transaction that sets it to "x".`,`WATCH config:title\nMULTI\nSET config:title x\nEXEC`],
[3,'redis',`Count how many bits are set to 1 in key bitmap.`,`BITCOUNT bitmap`],
[3,'redis',`Add u1, u2, u3 to HyperLogLog hll:visitors then return unique count.`,`PFADD hll:visitors u1 u2 u3\nPFCOUNT hll:visitors`],
[3,'redis',`Remove and return the member with the HIGHEST score from scores.`,`ZPOPMAX scores`],
[3,'redis',`List all members of scores by lexicographic order (full range).`,`ZRANGEBYLEX scores - +`],
[3,'redis',`Iterate keys matching user:* using a cursor.`,`SCAN 0 MATCH user:*`],
[3,'redis',`Set an expiry of 5000 milliseconds on session:abc.`,`PEXPIRE session:abc 5000`],
[3,'redis',`Get substring of config:title from index 0 to 3.`,`GETRANGE config:title 0 3`],
[3,'redis',`Set player1's score to 200 only if 200 is greater than current.`,`ZADD scores GT 200 player1`],
[3,'redis',`Remove the 3 lowest-ranked members (ranks 0 to 2) from scores.`,`ZREMRANGEBYRANK scores 0 2`],
/* ===== EXPANSION BATCH 1 — products/customers/orders + reviews ===== */
/* PG beginner */
[1,'pg',`Select all products.`,`SELECT * FROM products;`],
[1,'pg',`Find products in the 'Electronics' category.`,`SELECT * FROM products WHERE category = 'Electronics';`],
[1,'pg',`Find products priced above 500.`,`SELECT * FROM products WHERE price > 500;`],
[1,'pg',`List products ordered by price, highest first.`,`SELECT * FROM products ORDER BY price DESC;`],
[1,'pg',`Count how many products there are.`,`SELECT COUNT(*) FROM products;`],
[1,'pg',`List the distinct product categories.`,`SELECT DISTINCT category FROM products;`],
[1,'pg',`Select all customers from 'USA'.`,`SELECT * FROM customers WHERE country = 'USA';`],
[1,'pg',`Find customers who signed up after 2022-01-01.`,`SELECT * FROM customers WHERE signup_date > '2022-01-01';`],
[1,'pg',`List all orders with status 'shipped'.`,`SELECT * FROM orders WHERE status = 'shipped';`],
[1,'pg',`Find orders with a total above 500.`,`SELECT * FROM orders WHERE total > 500;`],
[1,'pg',`Count how many orders each customer has (group by customer_id).`,`SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id;`],
[1,'pg',`Show total order value per status.`,`SELECT status, SUM(total) FROM orders GROUP BY status;`],
[1,'pg',`Find the cheapest product.`,`SELECT * FROM products ORDER BY price ASC LIMIT 1;`],
[1,'pg',`List customers ordered by signup_date (oldest first).`,`SELECT * FROM customers ORDER BY signup_date;`],
[1,'pg',`Count products in each category.`,`SELECT category, COUNT(*) FROM products GROUP BY category;`],
/* PG intermediate */
[2,'pg',`Show each order's customer name and total (join orders to customers).`,`SELECT c.name, o.total FROM orders o JOIN customers c ON o.customer_id = c.customer_id;`],
[2,'pg',`Total amount spent per customer name.`,`SELECT c.name, SUM(o.total) FROM orders o JOIN customers c ON o.customer_id = c.customer_id GROUP BY c.name;`],
[2,'pg',`Find customers who have placed more than 2 orders.`,`SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*) > 2;`],
[2,'pg',`Show product_name and quantity for each order item.`,`SELECT p.product_name, oi.quantity FROM order_items oi JOIN products p ON oi.product_id = p.product_id;`],
[2,'pg',`Compute revenue per product (sum of quantity * unit_price).`,`SELECT product_id, SUM(quantity * unit_price) AS revenue FROM order_items GROUP BY product_id;`],
[2,'pg',`Top 3 products by revenue.`,`SELECT product_id, SUM(quantity * unit_price) AS revenue FROM order_items GROUP BY product_id ORDER BY revenue DESC LIMIT 3;`],
[2,'pg',`Find customers who have never placed an order.`,`SELECT c.* FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id WHERE o.order_id IS NULL;`],
[2,'pg',`Average order total per customer country.`,`SELECT c.country, AVG(o.total) FROM orders o JOIN customers c ON o.customer_id = c.customer_id GROUP BY c.country;`],
[2,'pg',`Find products that have never been ordered.`,`SELECT p.* FROM products p LEFT JOIN order_items oi ON p.product_id = oi.product_id WHERE oi.item_id IS NULL;`],
[2,'pg',`Number of items in each order.`,`SELECT order_id, COUNT(*) FROM order_items GROUP BY order_id;`],
/* PG hard */
[3,'pg',`Rank customers by total spend (window).`,`SELECT c.name, SUM(o.total) AS spent, RANK() OVER (ORDER BY SUM(o.total) DESC) AS rnk FROM orders o JOIN customers c ON o.customer_id = c.customer_id GROUP BY c.name;`],
[3,'pg',`Running total of order totals ordered by order_date.`,`SELECT order_id, order_date, SUM(total) OVER (ORDER BY order_date) AS running FROM orders;`],
[3,'pg',`For each category, the product with the highest revenue.`,`SELECT * FROM (SELECT p.category, p.product_name, SUM(oi.quantity*oi.unit_price) rev, ROW_NUMBER() OVER (PARTITION BY p.category ORDER BY SUM(oi.quantity*oi.unit_price) DESC) rn FROM order_items oi JOIN products p ON oi.product_id=p.product_id GROUP BY p.category, p.product_name) t WHERE rn = 1;`],
[3,'pg',`Each customer's largest single order total (window MAX partition).`,`SELECT DISTINCT customer_id, MAX(total) OVER (PARTITION BY customer_id) AS biggest FROM orders;`],
[3,'pg',`Count orders per month of order_date, chronological.`,`SELECT EXTRACT(MONTH FROM order_date) AS m, COUNT(*) FROM orders GROUP BY m ORDER BY m;`],
/* Mongo beginner */
[1,'mongo',`Find all reviews.`,`db.reviews.find()`],
[1,'mongo',`Find reviews with a rating of 5.`,`db.reviews.find({ rating: 5 })`],
[1,'mongo',`Find all reviews for the book 'Dune'.`,`db.reviews.find({ book: 'Dune' })`],
[1,'mongo',`Count how many reviews there are.`,`db.reviews.countDocuments()`],
/* Mongo intermediate */
[2,'mongo',`Average review rating per book.`,`db.reviews.aggregate([ { $group: { _id: '$book', avgRating: { $avg: '$rating' } } } ])`],
[2,'mongo',`Total helpful votes per user.`,`db.reviews.aggregate([ { $group: { _id: '$user', totalHelpful: { $sum: '$helpful' } } } ])`],
[2,'mongo',`Count reviews per book, most reviewed first.`,`db.reviews.aggregate([ { $group: { _id: '$book', n: { $sum: 1 } } }, { $sort: { n: -1 } } ])`],
[2,'mongo',`Join each book to its reviews using $lookup.`,`db.books.aggregate([ { $lookup: { from: 'reviews', localField: 'title', foreignField: 'book', as: 'reviews' } } ])`],
/* Mongo hard */
[3,'mongo',`Top 3 books by average review rating.`,`db.reviews.aggregate([ { $group: { _id: '$book', avgRating: { $avg: '$rating' } } }, { $sort: { avgRating: -1 } }, { $limit: 3 } ])`],
[3,'mongo',`For each user: average rating and the list of books they reviewed.`,`db.reviews.aggregate([ { $group: { _id: '$user', avgRating: { $avg: '$rating' }, books: { $push: '$book' } } } ])`],
/* ===== EXPANSION BATCH 2 — fill to 40/40/20 per database ===== */
/* PG beginner +5 */
[1,'pg',`Select all customers from 'UK'.`,`SELECT * FROM customers WHERE country = 'UK';`],
[1,'pg',`Find products with stock below 25.`,`SELECT * FROM products WHERE stock < 25;`],
[1,'pg',`List orders sorted by total descending.`,`SELECT * FROM orders ORDER BY total DESC;`],
[1,'pg',`Count orders with status 'pending'.`,`SELECT COUNT(*) FROM orders WHERE status = 'pending';`],
[1,'pg',`Find the average product price.`,`SELECT AVG(price) FROM products;`],
/* PG intermediate +10 */
[2,'pg',`Show each customer name and their number of orders.`,`SELECT c.name, COUNT(*) FROM orders o JOIN customers c ON o.customer_id = c.customer_id GROUP BY c.name;`],
[2,'pg',`Compute revenue per product category.`,`SELECT p.category, SUM(oi.quantity*oi.unit_price) FROM order_items oi JOIN products p ON oi.product_id = p.product_id GROUP BY p.category;`],
[2,'pg',`Show each order_id with the customer's country.`,`SELECT o.order_id, c.country FROM orders o JOIN customers c ON o.customer_id = c.customer_id;`],
[2,'pg',`Find customers whose total spend exceeds 1000.`,`SELECT customer_id FROM orders GROUP BY customer_id HAVING SUM(total) > 1000;`],
[2,'pg',`Number of distinct products in each order.`,`SELECT order_id, COUNT(DISTINCT product_id) FROM order_items GROUP BY order_id;`],
[2,'pg',`Total quantity sold per product.`,`SELECT product_id, SUM(quantity) FROM order_items GROUP BY product_id;`],
[2,'pg',`Average total of shipped orders only.`,`SELECT AVG(total) FROM orders WHERE status = 'shipped';`],
[2,'pg',`Each customer's most recent order date.`,`SELECT c.name, MAX(o.order_date) FROM orders o JOIN customers c ON o.customer_id = c.customer_id GROUP BY c.name;`],
[2,'pg',`Categories whose average price is above 100.`,`SELECT category FROM products GROUP BY category HAVING AVG(price) > 100;`],
[2,'pg',`Orders that contain product 5.`,`SELECT * FROM orders WHERE order_id IN (SELECT order_id FROM order_items WHERE product_id = 5);`],
/* PG hard +5 */
[3,'pg',`Each customer's total spend and its percentage of the company total.`,`SELECT c.name, SUM(o.total) AS spent, SUM(o.total)*100.0/SUM(SUM(o.total)) OVER () AS pct FROM orders o JOIN customers c ON o.customer_id = c.customer_id GROUP BY c.name;`],
[3,'pg',`Rank products by revenue within each category.`,`SELECT * FROM (SELECT p.category, p.product_name, SUM(oi.quantity*oi.unit_price) rev, RANK() OVER (PARTITION BY p.category ORDER BY SUM(oi.quantity*oi.unit_price) DESC) r FROM order_items oi JOIN products p ON oi.product_id = p.product_id GROUP BY p.category, p.product_name) t;`],
[3,'pg',`Customers whose total spend is above the average customer spend.`,`WITH s AS (SELECT customer_id, SUM(total) tot FROM orders GROUP BY customer_id) SELECT * FROM s WHERE tot > (SELECT AVG(tot) FROM s);`],
[3,'pg',`Cumulative number of customers by signup_date.`,`SELECT signup_date, COUNT(*) OVER (ORDER BY signup_date) AS cumulative FROM customers;`],
[3,'pg',`The highest-total order per customer.`,`SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY total DESC) rn FROM orders) t WHERE rn = 1;`],
/* Mongo beginner +16 */
[1,'mongo',`Find books published before 1950.`,`db.books.find({ year: { $lt: 1950 } })`],
[1,'mongo',`Find books priced exactly 12.`,`db.books.find({ price: 12 })`],
[1,'mongo',`Find books that are NOT in stock.`,`db.books.find({ inStock: false })`],
[1,'mongo',`Find books with a rating not equal to 5.`,`db.books.find({ rating: { $ne: 5 } })`],
[1,'mongo',`Find all books by 'Asimov'.`,`db.books.find({ author: 'Asimov' })`],
[1,'mongo',`Return only title and author of all books.`,`db.books.find({}, { title: 1, author: 1 })`],
[1,'mongo',`Find books with more than 400 pages.`,`db.books.find({ pages: { $gt: 400 } })`],
[1,'mongo',`Find the single cheapest book.`,`db.books.find().sort({ price: 1 }).limit(1)`],
[1,'mongo',`Find all authors.`,`db.authors.find()`],
[1,'mongo',`Find authors from 'UK'.`,`db.authors.find({ country: 'UK' })`],
[1,'mongo',`Count how many books 'Asimov' wrote.`,`db.books.countDocuments({ author: 'Asimov' })`],
[1,'mongo',`Find books in the 'fantasy' genre.`,`db.books.find({ genres: 'fantasy' })`],
[1,'mongo',`List the distinct years present.`,`db.books.distinct('year')`],
[1,'mongo',`Find books priced between 10 and 15 inclusive.`,`db.books.find({ price: { $gte: 10, $lte: 15 } })`],
[1,'mongo',`Find reviews with at least 5 helpful votes.`,`db.reviews.find({ helpful: { $gte: 5 } })`],
[1,'mongo',`Find reviews by user 'Anna'.`,`db.reviews.find({ user: 'Anna' })`],
/* Mongo intermediate +16 */
[2,'mongo',`Average price per publisher.`,`db.books.aggregate([ { $group: { _id: '$publisher', avg: { $avg: '$price' } } } ])`],
[2,'mongo',`Count books per publisher.`,`db.books.aggregate([ { $group: { _id: '$publisher', n: { $sum: 1 } } } ])`],
[2,'mongo',`Highest price per genre.`,`db.books.aggregate([ { $unwind: '$genres' }, { $group: { _id: '$genres', maxP: { $max: '$price' } } } ])`],
[2,'mongo',`Top 3 books by pages (title and pages).`,`db.books.find({}, { title: 1, pages: 1 }).sort({ pages: -1 }).limit(3)`],
[2,'mongo',`Total rating points per author.`,`db.books.aggregate([ { $group: { _id: '$author', totRating: { $sum: '$rating' } } } ])`],
[2,'mongo',`Publishers with more than 2 books.`,`db.books.aggregate([ { $group: { _id: '$publisher', n: { $sum: 1 } } }, { $match: { n: { $gt: 2 } } } ])`],
[2,'mongo',`Average helpful votes per book (reviews).`,`db.reviews.aggregate([ { $group: { _id: '$book', avgHelpful: { $avg: '$helpful' } } } ])`],
[2,'mongo',`Number of reviews per user.`,`db.reviews.aggregate([ { $group: { _id: '$user', n: { $sum: 1 } } } ])`],
[2,'mongo',`Minimum rating per author.`,`db.books.aggregate([ { $group: { _id: '$author', minR: { $min: '$rating' } } } ])`],
[2,'mongo',`Total pages grouped by inStock.`,`db.books.aggregate([ { $group: { _id: '$inStock', pages: { $sum: '$pages' } } } ])`],
[2,'mongo',`Top 5 most expensive books (title and price).`,`db.books.find({}, { title: 1, price: 1 }).sort({ price: -1 }).limit(5)`],
[2,'mongo',`Overall average review rating.`,`db.reviews.aggregate([ { $group: { _id: null, avg: { $avg: '$rating' } } } ])`],
[2,'mongo',`The genre with the most books.`,`db.books.aggregate([ { $unwind: '$genres' }, { $group: { _id: '$genres', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 1 } ])`],
[2,'mongo',`Authors with at least 2 books.`,`db.books.aggregate([ { $group: { _id: '$author', n: { $sum: 1 } } }, { $match: { n: { $gte: 2 } } } ])`],
[2,'mongo',`Total price of all in-stock books.`,`db.books.aggregate([ { $match: { inStock: true } }, { $group: { _id: null, total: { $sum: '$price' } } } ])`],
[2,'mongo',`List the distinct publishers.`,`db.books.distinct('publisher')`],
/* Mongo hard +8 */
[3,'mongo',`For each genre: count and average rating.`,`db.books.aggregate([ { $unwind: '$genres' }, { $group: { _id: '$genres', n: { $sum: 1 }, avgR: { $avg: '$rating' } } } ])`],
[3,'mongo',`Each book with its number of reviews ($lookup + $size).`,`db.books.aggregate([ { $lookup: { from: 'reviews', localField: 'title', foreignField: 'book', as: 'r' } }, { $project: { title: 1, numReviews: { $size: '$r' } } } ])`],
[3,'mongo',`Books that have at least 2 reviews.`,`db.books.aggregate([ { $lookup: { from: 'reviews', localField: 'title', foreignField: 'book', as: 'r' } }, { $addFields: { n: { $size: '$r' } } }, { $match: { n: { $gte: 2 } } } ])`],
[3,'mongo',`The user who wrote the most reviews.`,`db.reviews.aggregate([ { $group: { _id: '$user', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 1 } ])`],
[3,'mongo',`Per publisher: count, min and max price.`,`db.books.aggregate([ { $group: { _id: '$publisher', n: { $sum: 1 }, min: { $min: '$price' }, max: { $max: '$price' } } } ])`],
[3,'mongo',`Bucket books by rating (1-3, 3-4, 4-6).`,`db.books.aggregate([ { $bucket: { groupBy: '$rating', boundaries: [1,3,4,6], default: 'other', output: { count: { $sum: 1 } } } } ])`],
[3,'mongo',`For each genre, the list of titles.`,`db.books.aggregate([ { $unwind: '$genres' }, { $group: { _id: '$genres', titles: { $push: '$title' } } } ])`],
[3,'mongo',`Books whose average review rating is at least 4.5.`,`db.reviews.aggregate([ { $group: { _id: '$book', avg: { $avg: '$rating' } } }, { $match: { avg: { $gte: 4.5 } } } ])`],
/* Redis beginner +20 */
[1,'redis',`Set config:title to "Home".`,`SET config:title Home`],
[1,'redis',`Get the value of pageviews.`,`GET pageviews`],
[1,'redis',`Increment pageviews by 1.`,`INCR pageviews`],
[1,'redis',`Decrement pageviews by 1.`,`DECR pageviews`],
[1,'redis',`Get the name field of user:100.`,`HGET user:100 name`],
[1,'redis',`Get all fields and values of user:100.`,`HGETALL user:100`],
[1,'redis',`Push 'job9' to the right of queue:emails.`,`RPUSH queue:emails job9`],
[1,'redis',`Get all elements of queue:emails.`,`LRANGE queue:emails 0 -1`],
[1,'redis',`Remove and return the first element of queue:emails.`,`LPOP queue:emails`],
[1,'redis',`Add 'u9' to the set online:users.`,`SADD online:users u9`],
[1,'redis',`Get all members of online:users.`,`SMEMBERS online:users`],
[1,'redis',`Check whether 'u2' is in online:users.`,`SISMEMBER online:users u2`],
[1,'redis',`Add member 'player9' with score 90 to scores.`,`ZADD scores 90 player9`],
[1,'redis',`List members of scores low to high.`,`ZRANGE scores 0 -1`],
[1,'redis',`Set a 60-second expiry on session:abc.`,`EXPIRE session:abc 60`],
[1,'redis',`Check the TTL of session:abc.`,`TTL session:abc`],
[1,'redis',`Delete the key config:title.`,`DEL config:title`],
[1,'redis',`Check whether user:100 exists.`,`EXISTS user:100`],
[1,'redis',`Get the city field of user:100.`,`HGET user:100 city`],
[1,'redis',`Get the number of members in premium:users.`,`SCARD premium:users`],
/* Redis intermediate +20 */
[2,'redis',`Set counter to 5, then increment it by 3.`,`SET counter 5\nINCRBY counter 3`],
[2,'redis',`Get the city and age fields of user:100.`,`HMGET user:100 city age`],
[2,'redis',`Set field country to 'BA' in user:100.`,`HSET user:100 country BA`],
[2,'redis',`Get the element at index 1 of queue:emails.`,`LINDEX queue:emails 1`],
[2,'redis',`Remove and return the last element of queue:emails.`,`RPOP queue:emails`],
[2,'redis',`Members in premium:users but not online:users.`,`SDIFF premium:users online:users`],
[2,'redis',`Store the union of online:users and premium:users into allusers.`,`SUNIONSTORE allusers online:users premium:users`],
[2,'redis',`Increase player2's score by 10.`,`ZINCRBY scores 10 player2`],
[2,'redis',`Members of scores with score 175 or above.`,`ZRANGEBYSCORE scores 175 +inf`],
[2,'redis',`Get player2's score.`,`ZSCORE scores player2`],
[2,'redis',`Get player3's rank (low to high).`,`ZRANK scores player3`],
[2,'redis',`Get the number of members in scores.`,`ZCARD scores`],
[2,'redis',`Set three keys at once: a=1, b=2, c=3.`,`MSET a 1 b 2 c 3`],
[2,'redis',`Get the values of a, b and c.`,`MGET a b c`],
[2,'redis',`Append "!" to config:title.`,`APPEND config:title !`],
[2,'redis',`Get the length of config:title.`,`STRLEN config:title`],
[2,'redis',`Trim queue:emails to keep only the first 2 elements.`,`LTRIM queue:emails 0 1`],
[2,'redis',`Move 'u3' from online:users to premium:users.`,`SMOVE online:users premium:users u3`],
[2,'redis',`Set a 120-second expiry on session:abc, then read its TTL.`,`EXPIRE session:abc 120\nTTL session:abc`],
[2,'redis',`Report the data type of user:100.`,`TYPE user:100`],
/* Redis hard +10 */
[3,'redis',`Atomically add player4 (score 300) to scores and increment pageviews.`,`MULTI\nZADD scores 300 player4\nINCR pageviews\nEXEC`],
[3,'redis',`Get the top 2 players from scores with their scores.`,`ZREVRANGE scores 0 1 WITHSCORES`],
[3,'redis',`Remove the single lowest-ranked member (rank 0) from scores.`,`ZREMRANGEBYRANK scores 0 0`],
[3,'redis',`Remove and return the member with the LOWEST score from scores.`,`ZPOPMIN scores`],
[3,'redis',`Add a, b, c to HyperLogLog hll:visitors, then return the unique count.`,`PFADD hll:visitors a b c\nPFCOUNT hll:visitors`],
[3,'redis',`Count members in scores with a score between 100 and 200 inclusive.`,`ZCOUNT scores 100 200`],
[3,'redis',`Set bit at offset 3 of bitmap to 1, then count the set bits.`,`SETBIT bitmap 3 1\nBITCOUNT bitmap`],
[3,'redis',`Store the weighted union of scores (w2) and bonus (w1) into total.`,`ZUNIONSTORE total 2 scores bonus WEIGHTS 2 1`],
[3,'redis',`Get player2's reverse rank (from the top).`,`ZREVRANK scores player2`],
[3,'redis',`Scan for keys matching session:*.`,`SCAN 0 MATCH session:*`]
];
const TASKS = TASKS_RAW.map((r,i)=>({p:r[0],db:r[1],q:r[2],a:r[3],_i:i}));

/* ================= GRADING ================= */
async function grade(task, input){
  const db = task.db;
  try{
    if(db==='pg'){
      if(!pgOK) return {ok:false, warn:true, msg:'PostgreSQL engine not loaded'+(window.__pgErr?': '+window.__pgErr:' (check your internet).')};
      const isRead = /^\s*(select|with)\b/i.test(task.a);
      await pgReseed(); const model = await pgRun(task.a);
      await pgReseed(); const stu = await pgRun(input);
      if(stu.error) return {ok:false, error:stu.error};
      let ok, render;
      if(isRead){ ok = eqArr(bagPG(stu.rows), bagPG(model.rows)); render={kind:'rows', rows:stu.rows, cols:stu.fields, exp:model.rows, expcols:model.fields}; }
      else { ok = (stu.state===model.state); const after=await pgAfter(input); render={kind:'state', rows:after.rows}; }
      return {ok, render};
    }
    if(db==='mongo'){
      if(!mingoOK) return {ok:false, warn:true, msg:'MongoDB engine not loaded (check your internet).'};
      const model = mongoRun(task.a, MONGO_SEED);
      const stu = mongoRun(input, MONGO_SEED);
      let ok;
      if(model.kind==='scalar'){ ok = String(stu.value)===String(model.value); return {ok, render:{kind:'scalar', value:stu.value, exp:model.value}}; }
      if(model.kind==='state'){ ok = JSON.stringify(canonMongo(stu.rows))===JSON.stringify(canonMongo(model.rows)); return {ok, render:{kind:'rows', rows:stu.rows, exp:model.rows}}; }
      ok = JSON.stringify(canonMongo(stu.rows))===JSON.stringify(canonMongo(model.rows));
      return {ok, render:{kind:'rows', rows:stu.rows, exp:model.rows}};
    }
    if(db==='redis'){
      const model = redisRun(task.a);
      const stu = redisRun(input);
      const ok = (JSON.stringify(stu.last)===JSON.stringify(model.last)) && (stu.state===model.state);
      return {ok, render:{kind:'reply', reply:stu.replies, exp:model.replies}};
    }
  }catch(e){ return {ok:false, error:String(e.message||e)}; }
}
async function pgAfter(sql){ await pgReseed(); try{ await pg.exec(sql); }catch(e){}
  const m=sql.match(/\b(?:into|update|from)\s+"?([a-z_]+)"?/i); const tbl=m?m[1]:'games';
  try{ const r=await pg.query('SELECT * FROM '+tbl+' LIMIT 100'); return {rows:r.rows}; }catch(e){ return {rows:[]}; }
}
async function runOnly(task, input){
  const db=task.db;
  try{
    if(db==='pg'){ if(!pgOK)throw new Error('PG engine not loaded'); await pgReseed(); const r=await pgRun(input); if(r.error)throw new Error(r.error); return {kind:'rows', rows:r.rows, cols:r.fields}; }
    if(db==='mongo'){ if(!mingoOK)throw new Error('Mongo engine not loaded'); const r=mongoRun(input, MONGO_SEED); return r.kind==='scalar'?{kind:'scalar',value:r.value}:{kind:'rows',rows:r.rows}; }
    if(db==='redis'){ const r=redisRun(input); return {kind:'reply', reply:r.replies}; }
  }catch(e){ return {error:String(e.message||e)}; }
}

/* ================= RENDER HELPERS ================= */
function rowsToTable(rows, cols){
  if(!rows||!rows.length) return '<div class="empty">(no rows)</div>';
  if(!cols||!cols.length){ const set=new Set(); rows.forEach(r=>Object.keys(r).forEach(k=>set.add(k))); cols=[...set]; }
  let h='<table class="rs"><thead><tr>'+cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>';
  rows.forEach(r=>{ h+='<tr>'+cols.map(c=>{ let v=r[c]; if(v&&typeof v==='object')v=JSON.stringify(v); return '<td>'+esc(v==null?'NULL':v)+'</td>'; }).join('')+'</tr>'; });
  return h+'</tbody></table>';
}
function esc(s){ return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

/* ================= UI ================= */
let phase=1, db='pg', page=0, idx=0;
const status={};
try{ const s=localStorage.getItem('qp_live_gamehub'); if(s)Object.assign(status,JSON.parse(s)); }catch(e){}
const SESS={}; let QTEXT={};
try{ QTEXT=JSON.parse(localStorage.getItem('qp_text_gamehub')||'{}'); }catch(e){}
function save(){ try{ localStorage.setItem('qp_live_gamehub',JSON.stringify(status)); }catch(e){} }
const SCHEMAS={
 pg:`<div class="schema"><b>PostgreSQL — gamehub (PGlite)</b>
studios(studio_id, name, country, founded)
games(game_id, title, genre, studio_id,
  price, release_year, multiplayer)
players(player_id, username, country,
  joined, premium)
purchases(purchase_id, player_id, game_id,
  purchased_on, amount_paid)
reviews(review_id, game_id, player_id,
  rating, body, posted_on)
sessions(session_id, player_id, game_id,
  played_on, duration_min, score)
VIEW game_sales_report</div>`,
 mongo:`<div class="schema"><b>MongoDB — gamehub (mingo)</b>
games { title, genre, studio, price,
  releaseYear, multiplayer }
players { username, country, joined, premium }
sessions { username, gameTitle, genre, studio,
  premium, playedOn, durationMin, score,
  tags[] }</div>`,
 redis:`<div class="schema"><b>Redis — university (emulator)</b>
str  total_students=5 · total_courses=4
hash student:1001..1005 {name,year,gpa,status}
hash course:CS101.. {name,credits} · department:* · instructor:*
set  university:departments · course:CS101:students
     student:1001:courses · department:CS:students
list student:1001:activity
zset course:CS101:grades {1001:88,1002:75,1003:91}
str  course:CS101:instructor · session:1001(ttl)</div>`
};
const DIAGRAMS={
 pg:`<svg viewBox="0 0 260 350" class="er" xmlns="http://www.w3.org/2000/svg">
<defs><marker id="arr" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#54a8ff"/></marker></defs>
<path class="er-line" d="M58,72 C24,66 24,42 58,40" marker-end="url(#arr)"/>
<path class="er-line" d="M58,182 C26,176 26,150 58,148" marker-end="url(#arr)"/>
<path class="er-line" d="M208,182 C240,160 240,92 208,84" marker-end="url(#arr)"/>
<path class="er-line" d="M58,236 C8,200 8,98 58,96" marker-end="url(#arr)"/>
<path class="er-line" d="M58,290 C16,260 16,150 58,150" marker-end="url(#arr)"/>
<g class="er-b"><rect class="er-box" x="58" y="8" width="150" height="40" rx="8"/><text class="er-t" x="68" y="26">studios</text><text class="er-k" x="68" y="40">studio_id (PK)</text></g>
<g class="er-b"><rect class="er-box" x="58" y="64" width="150" height="44" rx="8"/><text class="er-t" x="68" y="82">games</text><text class="er-k" x="68" y="99">studio_id (FK)</text></g>
<g class="er-b"><rect class="er-box" x="58" y="118" width="150" height="40" rx="8"/><text class="er-t" x="68" y="136">players</text><text class="er-k" x="68" y="150">player_id (PK)</text></g>
<g class="er-b"><rect class="er-box" x="58" y="170" width="150" height="44" rx="8"/><text class="er-t" x="68" y="188">purchases</text><text class="er-k" x="68" y="205">player_id · game_id</text></g>
<g class="er-b"><rect class="er-box" x="58" y="224" width="150" height="44" rx="8"/><text class="er-t" x="68" y="242">reviews</text><text class="er-k" x="68" y="259">game_id · player_id</text></g>
<g class="er-b"><rect class="er-box" x="58" y="278" width="150" height="44" rx="8"/><text class="er-t" x="68" y="296">sessions</text><text class="er-k" x="68" y="313">player_id · game_id</text></g>
</svg>
<div class="er-cap">games → studios &nbsp;·&nbsp; purchases / reviews / sessions → players &amp; games</div>`,
 mongo:`<svg viewBox="0 0 260 230" class="er" xmlns="http://www.w3.org/2000/svg">
<defs>
<marker id="arr2" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#7cc4ff"/></marker>
<linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#54a8ff"/><stop offset="1" stop-color="#9b6bff"/></linearGradient>
</defs>
<path id="mp1" class="er-line2" d="M78,150 C58,120 64,96 70,86" marker-end="url(#arr2)"/>
<path id="mp2" class="er-line2" d="M182,150 C204,120 198,96 190,86" marker-end="url(#arr2)"/>
<circle r="3.2" fill="#bfe0ff" class="flow-dot"><animateMotion dur="2.4s" repeatCount="indefinite"><mpath href="#mp1"/></animateMotion></circle>
<circle r="3.2" fill="#d3c0ff" class="flow-dot"><animateMotion dur="2.4s" begin="0.7s" repeatCount="indefinite"><mpath href="#mp2"/></animateMotion></circle>
<g class="er-b float"><rect class="er-box glowbox" x="6" y="12" width="118" height="72" rx="11"/><text class="er-t" x="16" y="31">games</text><text class="er-k" x="16" y="48">title · genre</text><text class="er-k" x="16" y="63">studio · price</text><text class="er-k" x="16" y="78">multiplayer</text></g>
<g class="er-b float2"><rect class="er-box glowbox" x="136" y="12" width="118" height="72" rx="11"/><text class="er-t" x="146" y="31">players</text><text class="er-k" x="146" y="48">username</text><text class="er-k" x="146" y="63">country · premium</text><text class="er-k" x="146" y="78">joined</text></g>
<g class="er-b float3"><rect class="er-box glowbox" x="40" y="150" width="180" height="66" rx="11"/><text class="er-t" x="50" y="169">sessions</text><text class="er-k" x="50" y="186">username · gameTitle · genre</text><text class="er-k" x="50" y="202">score · durationMin · tags[ ]</text></g>
</svg>
<div class="er-cap">sessions <b>embed</b> game + player details (gameTitle, username, genre…)</div>`,
 redis:`<div class="rchips">
<span class="rchip c1">string<small>total_students · :instructor</small></span>
<span class="rchip c2">hash<small>student:* · course:* · department:*</small></span>
<span class="rchip c3">list<small>student:1001:activity</small></span>
<span class="rchip c4">set<small>course:CS101:students · :courses</small></span>
<span class="rchip c5">zset<small>course:CS101:grades</small></span>
<span class="rchip c6">ttl<small>session:1001</small></span>
</div>
<div class="er-cap">university DB — match each key's <b>type</b> to its command family</div>`
};
const $=id=>document.getElementById(id);
function pageSize(){ return phase===3?10:20; }
function all(){ return TASKS.filter(t=>t.p===phase && t.db===db); }
function pages(){ const a=all(); const sz=pageSize(); const out=[]; for(let i=0;i<a.length;i+=sz)out.push(a.slice(i,i+sz)); return out.length?out:[[]]; }
function current(){ const pg=pages(); return pg[Math.min(page,pg.length-1)]; }
function labelPhase(){ return ['','Beginner','Intermediate','Hard'][phase]; }
function labelDb(){ return {pg:'PostgreSQL',mongo:'MongoDB',redis:'Redis'}[db]; }
function renderSchema(){ $('schema').innerHTML=SCHEMAS[db]; $('diagram').innerHTML=DIAGRAMS[db]; }
function renderPager(){
  const pg=pages(); const sz=pageSize();
  if(pg.length<=1){ $('pager').innerHTML='<span>Set 1 · '+all().length+' tasks</span>'; return; }
  $('pager').innerHTML='<button id="pprev">‹</button><span>Set '+(page+1)+' / '+pg.length+'</span><button id="pnext">See next '+sz+' ›</button>';
  $('pprev').disabled=page===0; $('pnext').disabled=page>=pg.length-1;
  $('pprev').onclick=()=>{ if(page>0){page--;idx=0;renderTask();} };
  $('pnext').onclick=()=>{ if(page<pg.length-1){page++;idx=0;renderTask();} };
}
function renderList(){
  const list=current(); let h='';
  list.forEach((t,i)=>{ const st=status[t._i]||''; const d=st==='ok'?'ok':(st==='bad'?'bad':''); h+='<li data-i="'+i+'" class="'+(i===idx?'cur':'')+'"><span class="dot '+d+'"></span>Task '+(page*pageSize()+i+1)+'</li>'; });
  $('taskList').innerHTML=h;
  [...$('taskList').children].forEach(li=>li.onclick=()=>{ idx=+li.dataset.i; renderTask(); });
  const tot=all(); const done=tot.filter(t=>status[t._i]==='ok').length;
  $('progText').textContent=labelPhase()+' · '+labelDb()+' — '+done+' / '+tot.length+' solved';
  $('progBar').style.width=(tot.length?done/tot.length*100:0)+'%';
}
function clearOutputs(){ $('verdict').className='verdict'; $('verdict').innerHTML=''; $('resultwrap').className='resultwrap'; $('resultArea').innerHTML=''; $('expectedArea').innerHTML=''; $('resTitle').textContent='Your result'; }
function restoreState(t){
  const s=SESS[t._i];
  if(s){ $('editor').value=s.text||''; $('verdict').className=s.vcls||'verdict'; $('verdict').innerHTML=s.vhtml||''; $('resultwrap').className=s.rw||'resultwrap'; $('resTitle').textContent=s.rt||'Your result'; $('resultArea').innerHTML=s.ra||''; $('expectedArea').innerHTML=s.ea||''; }
  else { $('editor').value=QTEXT[t._i]||''; clearOutputs(); }
}
function saveState(t){ if(!t)return; SESS[t._i]={ text:$('editor').value, vcls:$('verdict').className, vhtml:$('verdict').innerHTML, rw:$('resultwrap').className, rt:$('resTitle').textContent, ra:$('resultArea').innerHTML, ea:$('expectedArea').innerHTML }; QTEXT[t._i]=$('editor').value; try{ localStorage.setItem('qp_text_gamehub',JSON.stringify(QTEXT)); }catch(e){} }
function renderTask(){
  const list=current(); if(idx>=list.length)idx=0; const t=list[idx];
  $('qmeta').textContent=labelDb()+' · '+labelPhase()+' · Task '+(page*pageSize()+idx+1);
  $('qtitle').textContent=t? t.q : '(no task)';
  $('hint').className='hint'; $('hint').textContent='Model answer starts with: '+(t?t.a.split('\n')[0].slice(0,70):'')+' …';
  $('answerBox').className='answerbox'; $('answerBox').innerHTML='';
  if(t) restoreState(t); else { $('editor').value=''; clearOutputs(); }
  renderPager(); renderList(); $('editor').focus();
}
function showResult(render, ok){
  $('resultwrap').classList.add('show'); $('resTitle').textContent='Your result';
  const cls=ok?'ok':'bad';
  if(render.kind==='rows'){ $('resultArea').innerHTML='<div class="tablebox '+cls+'">'+rowsToTable(render.rows, render.cols)+'</div>';
    if(!ok&&render.exp){ $('expectedArea').innerHTML='<details open><summary>Expected result</summary><div class="tablebox ok" style="margin-top:6px">'+rowsToTable(render.exp, render.expcols)+'</div></details>'; } else $('expectedArea').innerHTML=''; }
  else if(render.kind==='scalar'){ $('resultArea').innerHTML='<div class="reply '+cls+'">'+esc(render.value)+'</div>';
    $('expectedArea').innerHTML=(!ok&&render.exp!=null)?'<details open><summary>Expected</summary><div class="reply ok" style="margin-top:6px">'+esc(render.exp)+'</div></details>':''; }
  else if(render.kind==='reply'){ $('resultArea').innerHTML='<div class="reply '+cls+'">'+esc(render.reply.map(fmtReply).join('\n'))+'</div>';
    $('expectedArea').innerHTML=(!ok&&render.exp)?'<details open><summary>Expected replies</summary><div class="reply ok" style="margin-top:6px">'+esc(render.exp.map(fmtReply).join('\n'))+'</div></details>':''; }
  else if(render.kind==='state'){ $('resultArea').innerHTML='<div class="tablebox '+cls+'"><div style="padding:6px 10px;color:#90a6bd">table after your command:</div>'+rowsToTable(render.rows)+'</div>'; $('expectedArea').innerHTML=''; }
}
function fmtReply(r){ if(r===null)return '(nil)'; if(Array.isArray(r))return '['+r.join(', ')+']'; return String(r); }
async function doCheck(){
  const list=current(); const t=list[idx]; if(!t)return;
  const input=$('editor').value.trim(); if(!input){ verdict('warn','Type a query first.'); return; }
  verdict('warn','Running…');
  const res=await grade(t,input);
  if(res.error){ verdict('bad','❌ Error from engine: '+esc(res.error)); status[t._i]='bad'; save(); saveState(t); renderList(); return; }
  if(res.warn){ verdict('warn','⚠ '+res.msg); saveState(t); return; }
  if(res.ok){ verdict('ok','✅ <b>Correct!</b> Your result matches the expected records.'); status[t._i]='ok'; }
  else { verdict('bad','❌ <b>Not correct.</b> Your records differ from the expected result (shown below).'); status[t._i]='bad'; }
  if(res.render) showResult(res.render, res.ok);
  save(); saveState(t); renderList();
}
async function doRun(){
  const list=current(); const t=list[idx]; if(!t)return;
  const input=$('editor').value.trim(); if(!input){ verdict('warn','Type a query first.'); return; }
  const r=await runOnly(t,input);
  if(r.error){ verdict('bad','❌ Error: '+esc(r.error)); return; }
  verdict('warn','Ran your query (not graded).');
  $('resultwrap').classList.add('show'); $('resTitle').textContent='Output'; $('expectedArea').innerHTML='';
  if(r.kind==='rows') $('resultArea').innerHTML='<div class="tablebox">'+rowsToTable(r.rows,r.cols)+'</div>';
  else if(r.kind==='scalar') $('resultArea').innerHTML='<div class="reply">'+esc(r.value)+'</div>';
  else $('resultArea').innerHTML='<div class="reply">'+esc(r.reply.map(fmtReply).join('\n'))+'</div>';
  saveState(t);
}
function verdict(kind,html){ const v=$('verdict'); v.className='verdict show '+kind; v.innerHTML=html; }

$('checkBtn').onclick=doCheck;
$('runBtn').onclick=doRun;
$('ansBtn').onclick=()=>{ const t=current()[idx]; if(!t)return; const b=$('answerBox'); if(b.classList.contains('show')){ b.classList.remove('show'); } else { b.innerHTML='<span class="lbl">Model answer</span>'+esc(t.a); b.classList.add('show'); } };
$('hintBtn').onclick=()=>{ $('hint').classList.toggle('show'); };
$('clearBtn').onclick=()=>{ $('editor').value=''; $('editor').focus(); };
$('prevBtn').onclick=()=>{ if(idx>0){idx--;renderTask();} };
$('nextBtn').onclick=()=>{ if(idx<current().length-1){idx++;renderTask();} };
$('editor').addEventListener('keydown',e=>{ if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){ e.preventDefault(); doCheck(); } });
$('editor').addEventListener('input',()=>{ const t=current()[idx]; if(t){ QTEXT[t._i]=$('editor').value; if(SESS[t._i])SESS[t._i].text=$('editor').value; try{ localStorage.setItem('qp_text_gamehub',JSON.stringify(QTEXT)); }catch(e){} } });
[...document.querySelectorAll('#phaseTabs .tab')].forEach(tab=>tab.onclick=()=>{ document.querySelectorAll('#phaseTabs .tab').forEach(x=>x.classList.remove('active')); tab.classList.add('active'); phase=+tab.dataset.p; page=0; idx=0; renderTask(); });
[...document.querySelectorAll('#dbTabs .dbtab')].forEach(tab=>tab.onclick=()=>{ document.querySelectorAll('#dbTabs .dbtab').forEach(x=>x.classList.remove('active')); tab.classList.add('active'); db=tab.dataset.db; page=0; idx=0; renderSchema(); renderTask(); });

renderSchema(); renderTask();
initPG(); initMongo();
