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
-- Batch 001 roster. Deliberately a separate table rather than a column on
-- orders: FOUNDERS.md says the public list is generated from an opt-in list and
-- not from the orders table, and the schema should make that true rather than
-- rely on a query remembering to filter. A row here exists only because someone
-- ticked the box and typed a handle. No email, no order contents.
CREATE TABLE IF NOT EXISTS founders (
  order_id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  batch TEXT NOT NULL DEFAULT '001',
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
