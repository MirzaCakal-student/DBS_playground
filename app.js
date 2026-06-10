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
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;
CREATE TABLE departments (dept_id int PRIMARY KEY, dept_name text, location text);
INSERT INTO departments VALUES
 (1,'Engineering','New York'),(2,'Sales','Boston'),(3,'Marketing','Chicago'),(4,'HR','New York');
CREATE TABLE employees (emp_id int PRIMARY KEY, first_name text, last_name text, email text,
   salary int, dept_id int, hire_date date, manager_id int);
INSERT INTO employees VALUES
 (1,'Alice','Smith','[email protected]',90000,1,'2019-03-01',NULL),
 (2,'Bob','Jones','[email protected]',60000,1,'2020-05-10',1),
 (3,'Carol','White','[email protected]',55000,1,'2021-07-15',1),
 (4,'Dave','Brown','[email protected]',48000,2,'2020-01-20',1),
 (5,'Eve','Davis','[email protected]',72000,2,'2021-02-11',4),
 (6,'Frank','Miller','[email protected]',35000,2,'2022-06-01',5),
 (7,'Grace','Lee','[email protected]',81000,3,'2019-09-09',1),
 (8,'Heidi','Moore','[email protected]',42000,3,'2021-11-30',7),
 (9,'Ivan','Clark','[email protected]',30000,3,'2022-03-03',7),
 (10,'Judy','Hall','[email protected]',65000,4,'2020-08-08',1),
 (11,'Mallory','King','[email protected]',47000,4,'2021-12-25',10),
 (12,'Niaj','Adams','[email protected]',51000,1,'2022-01-15',1),
 (13,'Oscar','Reed','[email protected]',38000,1,'2021-04-04',2),
 (14,'Peggy','Cole','[email protected]',73000,1,'2022-09-09',2);
CREATE TABLE projects (proj_id int PRIMARY KEY, proj_name text, dept_id int, budget int);
INSERT INTO projects VALUES
 (1,'Apollo',1,100000),(2,'Zephyr',1,50000),(3,'Orion',2,70000),
 (4,'Helix',3,30000),(5,'Nimbus',4,20000),(6,'Vega',2,90000);
CREATE TABLE products (product_id int PRIMARY KEY, product_name text, category text, price numeric, stock int);
INSERT INTO products VALUES
 (1,'Laptop','Electronics',1200,15),(2,'Phone','Electronics',800,30),(3,'Desk','Furniture',150,20),
 (4,'Chair','Furniture',85,40),(5,'Monitor','Electronics',300,25),(6,'Notebook','Stationery',5,200);
CREATE TABLE customers (customer_id int PRIMARY KEY, name text, country text, city text, signup_date date);
INSERT INTO customers VALUES
 (1,'Anna','USA','New York','2021-01-10'),(2,'Ben','UK','London','2020-06-05'),
 (3,'Cara','USA','Boston','2022-03-20'),(4,'Dino','Germany','Berlin','2021-11-15'),
 (5,'Ela','UK','Manchester','2022-07-01');
CREATE TABLE orders (order_id int PRIMARY KEY, customer_id int, order_date date, status text, total numeric);
INSERT INTO orders VALUES
 (1,1,'2022-02-01','shipped',1500),(2,1,'2022-05-10','shipped',300),(3,2,'2022-03-15','pending',800),
 (4,3,'2022-04-20','shipped',235),(5,4,'2022-06-01','cancelled',1200),(6,2,'2022-08-12','shipped',90),
 (7,5,'2022-09-05','pending',605),(8,1,'2022-10-01','shipped',150);
CREATE TABLE order_items (item_id int PRIMARY KEY, order_id int, product_id int, quantity int, unit_price numeric);
INSERT INTO order_items VALUES
 (1,1,1,1,1200),(2,1,5,1,300),(3,2,5,1,300),(4,3,2,1,800),(5,4,3,1,150),(6,4,4,1,85),
 (7,5,1,1,1200),(8,6,4,1,85),(9,7,5,2,300),(10,7,6,1,5),(11,8,3,1,150);
`;

const MONGO_SEED = {
  books: [
    {title:'Dune',author:'Herbert',year:1965,price:15,pages:412,rating:5,publisher:'Ace',inStock:false,genres:['sci-fi','classic']},
    {title:'Foundation',author:'Asimov',year:1951,price:12,pages:255,rating:5,publisher:'Spectra',inStock:true,genres:['sci-fi','classic']},
    {title:'I, Robot',author:'Asimov',year:1950,price:10,pages:253,rating:4,publisher:'Spectra',inStock:true,genres:['sci-fi']},
    {title:'The Gods Themselves',author:'Asimov',year:1972,price:11,pages:288,rating:4,publisher:'Doubleday',inStock:true,genres:['sci-fi']},
    {title:'Starship',author:'Asimov',year:1973,price:8,pages:180,rating:1,publisher:'Spectra',inStock:false,genres:['sci-fi']},
    {title:'The Hobbit',author:'Tolkien',year:1937,price:20,pages:310,rating:5,publisher:'Allen',inStock:true,genres:['fantasy','classic']},
    {title:'The Lord of the Rings',author:'Tolkien',year:1954,price:30,pages:1178,rating:5,publisher:'Allen',inStock:true,genres:['fantasy','classic']},
    {title:'Neuromancer',author:'Gibson',year:1984,price:14,pages:271,rating:4,publisher:'Ace',inStock:true,genres:['sci-fi','cyberpunk']},
    {title:'War and Peace',author:'Tolstoy',year:1869,price:25,pages:1225,rating:4,publisher:'Penguin',inStock:false,genres:['classic']},
    {title:'1984',author:'Orwell',year:1949,price:9,pages:328,rating:5,publisher:'Penguin',inStock:true,genres:['classic','dystopia']},
    {title:'Brave New World',author:'Huxley',year:1932,price:11,pages:311,rating:4,publisher:'Vintage',inStock:true,genres:['classic','dystopia']},
    {title:'The Martian',author:'Weir',year:2011,price:13,pages:369,rating:4,publisher:'Crown',inStock:true,genres:['sci-fi']},
    {title:'Hyperion',author:'Simmons',year:1989,price:16,pages:482,rating:4,publisher:'Spectra',inStock:true,genres:['sci-fi']},
    {title:'Untitled Draft',author:'Anon',year:2020,price:5,pages:50,rating:3,inStock:false,genres:['draft']}
  ],
  authors: [
    {name:'Herbert',country:'USA'},{name:'Asimov',country:'USA'},{name:'Tolkien',country:'UK'},
    {name:'Gibson',country:'USA'},{name:'Tolstoy',country:'Russia'},{name:'Orwell',country:'UK'},
    {name:'Huxley',country:'UK'},{name:'Weir',country:'USA'},{name:'Simmons',country:'USA'},{name:'Anon',country:'NA'}
  ],
  reviews: [
    {book:'Dune',user:'Anna',rating:5,helpful:12},
    {book:'Dune',user:'Ben',rating:4,helpful:3},
    {book:'Foundation',user:'Cara',rating:5,helpful:8},
    {book:'1984',user:'Anna',rating:5,helpful:20},
    {book:'1984',user:'Dino',rating:4,helpful:5},
    {book:'The Hobbit',user:'Ela',rating:5,helpful:7},
    {book:'The Martian',user:'Ben',rating:4,helpful:2},
    {book:'Neuromancer',user:'Cara',rating:3,helpful:1},
    {book:'Dune',user:'Dino',rating:5,helpful:9},
    {book:'Foundation',user:'Ela',rating:4,helpful:4}
  ]
};

function redisSeed(){
  const db = Object.create(null);
  db['pageviews']={t:'str',v:'100'};
  db['config:title']={t:'str',v:'Welcome'};
  db['user:100']={t:'hash',v:{name:'Alice',email:'[email protected]',age:'30',city:'NYC'}};
  db['queue:emails']={t:'list',v:['job1','job2','job3']};
  db['online:users']={t:'set',v:new Set(['u1','u2','u3'])};
  db['premium:users']={t:'set',v:new Set(['u2','u4'])};
  db['scores']={t:'zset',v:new Map([['player1',100],['player2',250],['player3',175]])};
  db['bonus']={t:'zset',v:new Map([['player1',50],['player2',20]])};
  db['session:abc']={t:'str',v:'tok',ttl:300};
  db['bitmap']={t:'bits',v:new Set()};
  db['hll:visitors']={t:'hll',v:new Set()};
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
  const t1 = await pg.query('SELECT * FROM employees ORDER BY emp_id');
  const t2 = await pg.query('SELECT * FROM departments ORDER BY dept_id');
  const t3 = await pg.query('SELECT * FROM projects ORDER BY proj_id');
  return JSON.stringify([t1.rows,t2.rows,t3.rows]);
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
    case 'SET': db[k]={t:'str',v:args[2]}; return 'OK';
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
      else { ok = (stu.state===model.state); const after=await pgAfter(input); render={kind:'state', tables:after}; }
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
  const e=await pg.query('SELECT * FROM employees ORDER BY emp_id');
  const d=await pg.query('SELECT * FROM departments ORDER BY dept_id');
  return {employees:e.rows, departments:d.rows};
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
try{ const s=localStorage.getItem('qp_live'); if(s)Object.assign(status,JSON.parse(s)); }catch(e){}
const SESS={}; let QTEXT={};
try{ QTEXT=JSON.parse(localStorage.getItem('qp_text')||'{}'); }catch(e){}
function save(){ try{ localStorage.setItem('qp_live',JSON.stringify(status)); }catch(e){} }
const SCHEMAS={
 pg:`<div class="schema"><b>PostgreSQL — live (PGlite)</b>
employees(emp_id, first_name, last_name, email,
  salary, dept_id, hire_date, manager_id)
departments(dept_id, dept_name, location)
projects(proj_id, proj_name, dept_id, budget)
products(product_id, product_name, category,
  price, stock)
customers(customer_id, name, country, city,
  signup_date)
orders(order_id, customer_id, order_date,
  status, total)
order_items(item_id, order_id, product_id,
  quantity, unit_price)</div>`,
 mongo:`<div class="schema"><b>MongoDB — live (mingo)</b>
books { title, author, year, price, pages,
  rating, publisher, inStock, genres[] }
authors { name, country }
reviews { book, user, rating, helpful }</div>`,
 redis:`<div class="schema"><b>Redis — live (emulator)</b>
str  pageviews=100 · config:title=Welcome
hash user:100 {name,email,age,city}
list queue:emails [job1,job2,job3]
set  online:users{u1,u2,u3} premium:users{u2,u4}
zset scores{player1:100,player2:250,player3:175}
zset bonus{player1:50,player2:20}
ttl  session:abc(300) · bitmap · hll:visitors</div>`
};
const DIAGRAMS={
 pg:`<svg viewBox="0 0 260 430" class="er" xmlns="http://www.w3.org/2000/svg">
<defs><marker id="arr" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#54a8ff"/></marker></defs>
<path class="er-line" d="M58,72 C24,66 24,42 58,36" marker-end="url(#arr)"/>
<path class="er-line" d="M58,128 C8,112 8,42 58,32" marker-end="url(#arr)"/>
<path class="er-line" d="M58,262 C24,256 24,232 58,226" marker-end="url(#arr)"/>
<path class="er-line" d="M58,372 C8,356 8,284 58,266" marker-end="url(#arr)"/>
<path class="er-line" d="M208,372 C240,360 240,330 208,326" marker-end="url(#arr)"/>
<g class="er-b"><rect class="er-box" x="58" y="8" width="150" height="40" rx="8"/><text class="er-t" x="68" y="26">departments</text><text class="er-k" x="68" y="40">dept_id (PK)</text></g>
<g class="er-b"><rect class="er-box" x="58" y="64" width="150" height="44" rx="8"/><text class="er-t" x="68" y="82">employees</text><text class="er-k" x="68" y="99">dept_id · manager_id</text></g>
<g class="er-b"><rect class="er-box" x="58" y="118" width="150" height="40" rx="8"/><text class="er-t" x="68" y="136">projects</text><text class="er-k" x="68" y="150">dept_id (FK)</text></g>
<g class="er-b"><rect class="er-box" x="58" y="196" width="150" height="40" rx="8"/><text class="er-t" x="68" y="214">customers</text><text class="er-k" x="68" y="228">customer_id (PK)</text></g>
<g class="er-b"><rect class="er-box" x="58" y="252" width="150" height="40" rx="8"/><text class="er-t" x="68" y="270">orders</text><text class="er-k" x="68" y="284">customer_id (FK)</text></g>
<g class="er-b"><rect class="er-box" x="58" y="308" width="150" height="40" rx="8"/><text class="er-t" x="68" y="326">products</text><text class="er-k" x="68" y="340">product_id (PK)</text></g>
<g class="er-b"><rect class="er-box" x="58" y="364" width="150" height="44" rx="8"/><text class="er-t" x="68" y="382">order_items</text><text class="er-k" x="68" y="399">order_id · product_id</text></g>
</svg>
<div class="er-cap"><b>HR</b>: emp/proj → departments &nbsp;·&nbsp; <b>Sales</b>: orders → customers · order_items → orders/products</div>`,
 mongo:`<svg viewBox="0 0 260 250" class="er" xmlns="http://www.w3.org/2000/svg">
<defs>
<marker id="arr2" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#7cc4ff"/></marker>
<linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#54a8ff"/><stop offset="1" stop-color="#9b6bff"/></linearGradient>
</defs>
<path id="mp1" class="er-line2" d="M170,102 C214,116 208,150 182,158" marker-end="url(#arr2)"/>
<path id="mp2" class="er-line2" d="M74,158 C50,138 56,118 84,102" marker-end="url(#arr2)"/>
<circle r="3.2" fill="#bfe0ff" class="flow-dot"><animateMotion dur="2.4s" repeatCount="indefinite"><mpath href="#mp1"/></animateMotion></circle>
<circle r="3.2" fill="#d3c0ff" class="flow-dot"><animateMotion dur="2.4s" begin="0.7s" repeatCount="indefinite"><mpath href="#mp2"/></animateMotion></circle>
<g class="er-b float"><rect class="er-box glowbox" x="55" y="12" width="150" height="84" rx="11"/><text class="er-t" x="66" y="31">books</text><text class="er-k" x="66" y="48">title · author · price</text><text class="er-k" x="66" y="63">rating · inStock</text><text class="er-k" x="66" y="78">year · genres[ ]</text></g>
<g class="er-b float2"><rect class="er-box glowbox" x="142" y="156" width="108" height="48" rx="11"/><text class="er-t" x="153" y="175">authors</text><text class="er-k" x="153" y="191">name · country</text></g>
<g class="er-b float3"><rect class="er-box glowbox" x="6" y="156" width="116" height="58" rx="11"/><text class="er-t" x="17" y="175">reviews</text><text class="er-k" x="17" y="191">book · user</text><text class="er-k" x="17" y="206">rating · helpful</text></g>
</svg>
<div class="er-cap"><b>reviews.book</b> → books.title &nbsp;·&nbsp; <b>books.author</b> → authors.name</div>`,
 redis:`<div class="rchips">
<span class="rchip c1">string<small>pageviews · config:title</small></span>
<span class="rchip c2">hash<small>user:100</small></span>
<span class="rchip c3">list<small>queue:emails</small></span>
<span class="rchip c4">set<small>online · premium</small></span>
<span class="rchip c5">zset<small>scores · bonus</small></span>
<span class="rchip c6">ttl · bitmap · hll</span>
</div>
<div class="er-cap">every key has a <b>type</b> — match it to the command family (H*, L*, S*, Z*)</div>`
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
function saveState(t){ if(!t)return; SESS[t._i]={ text:$('editor').value, vcls:$('verdict').className, vhtml:$('verdict').innerHTML, rw:$('resultwrap').className, rt:$('resTitle').textContent, ra:$('resultArea').innerHTML, ea:$('expectedArea').innerHTML }; QTEXT[t._i]=$('editor').value; try{ localStorage.setItem('qp_text',JSON.stringify(QTEXT)); }catch(e){} }
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
  else if(render.kind==='state'){ $('resultArea').innerHTML='<div class="tablebox '+cls+'"><div style="padding:6px 10px;color:#90a6bd">employees after your command:</div>'+rowsToTable(render.tables.employees)+'</div>'; $('expectedArea').innerHTML=''; }
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
$('editor').addEventListener('input',()=>{ const t=current()[idx]; if(t){ QTEXT[t._i]=$('editor').value; if(SESS[t._i])SESS[t._i].text=$('editor').value; try{ localStorage.setItem('qp_text',JSON.stringify(QTEXT)); }catch(e){} } });
[...document.querySelectorAll('#phaseTabs .tab')].forEach(tab=>tab.onclick=()=>{ document.querySelectorAll('#phaseTabs .tab').forEach(x=>x.classList.remove('active')); tab.classList.add('active'); phase=+tab.dataset.p; page=0; idx=0; renderTask(); });
[...document.querySelectorAll('#dbTabs .dbtab')].forEach(tab=>tab.onclick=()=>{ document.querySelectorAll('#dbTabs .dbtab').forEach(x=>x.classList.remove('active')); tab.classList.add('active'); db=tab.dataset.db; page=0; idx=0; renderSchema(); renderTask(); });

renderSchema(); renderTask();
initPG(); initMongo();
