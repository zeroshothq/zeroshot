CREATE TABLE IF NOT EXISTS waitlist (
  email TEXT PRIMARY KEY,
  pk_key TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  position INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  stripe_session TEXT,
  email TEXT,
  sku TEXT, build TEXT, plan TEXT,
  flavors_json TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS stacks (
  id TEXT PRIMARY KEY,
  query_hash TEXT,
  result_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT, payload_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
