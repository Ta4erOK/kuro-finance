const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

// Путь к БД: в dev — в папке проекта, в проде — в userData
function getDbPath() {
  if (process.env.NODE_ENV === 'production' || process.env.APPIMAGE) {
    const userData = (process.env.APPDATA || '').split(path.sep).slice(0, 2).join(path.sep) || require('os').homedir()
    const base = process.env.APPDATA || path.join(userData, 'AppData', 'Roaming')
    return path.join(base, 'FinanceWidget', 'finance.db')
  }
  return path.join(__dirname, '..', '..', 'finance.db')
}

const dbPath = getDbPath()
fs.mkdirSync(path.dirname(dbPath), { recursive: true })

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

// ======== СХЕМА ========
db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#8b5cf6'
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  note TEXT DEFAULT '',
  date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS savings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  note TEXT DEFAULT '',
  date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`)

// ======== КАТЕГОРИИ ========
function getCategories() {
  return db.prepare('SELECT * FROM categories ORDER BY name').all()
}

function createCategory(name, color = '#8b5cf6') {
  const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(name)
  if (exists) return { id: exists.id, exists: true }
  const res = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)').run(name, color)
  return { id: res.lastInsertRowid, exists: false }
}

function deleteCategory(id) {
  // Не даём удалить категорию, если на ней висят траты — просто помечаем удаление через каскад вручную
  db.prepare('DELETE FROM expenses WHERE category_id = ?').run(id)
  db.prepare('DELETE FROM categories WHERE id = ?').run(id)
}

// ======== ТРАТЫ ========
function addExpense(categoryId, amount, note = '', date = null) {
  const d = date || new Date().toISOString().slice(0, 10)
  const res = db.prepare('INSERT INTO expenses (category_id, amount, note, date) VALUES (?, ?, ?, ?)')
    .run(categoryId, amount, note, d)
  return { id: res.lastInsertRowid }
}

function getExpensesByDate(date) {
  return db.prepare(`
    SELECT e.*, c.name as category_name, c.color as category_color
    FROM expenses e
    JOIN categories c ON c.id = e.category_id
    WHERE e.date = ?
    ORDER BY e.created_at DESC
  `).all(date)
}

function getExpensesByRange(start, end) {
  return db.prepare(`
    SELECT e.*, c.name as category_name, c.color as category_color
    FROM expenses e
    JOIN categories c ON c.id = e.category_id
    WHERE e.date BETWEEN ? AND ?
    ORDER BY e.date ASC, e.created_at ASC
  `).all(start, end)
}

function getTotalByDate(date) {
  const row = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date = ?').get(date)
  return row.total
}

function getTotalByRange(start, end) {
  const row = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date BETWEEN ? AND ?').get(start, end)
  return row.total
}

function getGroupedByDate(start, end) {
  return db.prepare(`
    SELECT date, SUM(amount) as total
    FROM expenses
    WHERE date BETWEEN ? AND ?
    GROUP BY date
    ORDER BY date ASC
  `).all(start, end)
}

function getGroupedByWeek(start, end) {
  return db.prepare(`
    SELECT strftime('%Y-%W', date) as week, MIN(date) as week_start, SUM(amount) as total
    FROM expenses
    WHERE date BETWEEN ? AND ?
    GROUP BY week
    ORDER BY week ASC
  `).all(start, end)
}

function getGroupedByMonth(start, end) {
  return db.prepare(`
    SELECT strftime('%Y-%m', date) as month, SUM(amount) as total
    FROM expenses
    WHERE date BETWEEN ? AND ?
    GROUP BY month
    ORDER BY month ASC
  `).all(start, end)
}

function getGroupedByCategory(start, end) {
  return db.prepare(`
    SELECT c.name, c.color, SUM(e.amount) as total
    FROM expenses e
    JOIN categories c ON c.id = e.category_id
    WHERE e.date BETWEEN ? AND ?
    GROUP BY e.category_id
    ORDER BY total DESC
  `).all(start, end)
}

function deleteExpense(id) {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id)
}

// ======== КОПИЛКА ========
function addSaving(amount, note = '', date = null) {
  const d = date || new Date().toISOString().slice(0, 10)
  const res = db.prepare('INSERT INTO savings (amount, note, date) VALUES (?, ?, ?)').run(amount, note, d)
  return { id: res.lastInsertRowid }
}

function getSavingsTotal() {
  const row = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM savings').get()
  return row.total
}

function getSavingsByDate(date) {
  return db.prepare('SELECT * FROM savings WHERE date = ? ORDER BY created_at DESC').all(date)
}

function getSavingsByRange(start, end) {
  return db.prepare('SELECT * FROM savings WHERE date BETWEEN ? AND ? ORDER BY date ASC, created_at ASC').all(start, end)
}

function getSavingsTotalByDate(date) {
  const row = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM savings WHERE date = ?').get(date)
  return row.total
}

function getSavingsTotalByRange(start, end) {
  const row = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM savings WHERE date BETWEEN ? AND ?').get(start, end)
  return row.total
}

function getSavingsGroupedByDate(start, end) {
  return db.prepare(`
    SELECT date, SUM(amount) as total
    FROM savings
    WHERE date BETWEEN ? AND ?
    GROUP BY date
    ORDER BY date ASC
  `).all(start, end)
}

function deleteSaving(id) {
  db.prepare('DELETE FROM savings WHERE id = ?').run(id)
}

// ======== НАСТРОЙКИ ========
function getSetting(key, def = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  return row ? row.value : def
}

function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, String(value))
}

// ======== ИТОГИ ЗА МЕСЯЦ ========
function getMonthSummary(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = `${year}-${String(month).padStart(2, '0')}-31`
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0)
  const lastDay = String(monthEnd.getDate()).padStart(2, '0')
  const endExact = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  const expenses = getTotalByRange(start, endExact)
  const savings = getSavingsTotalByRange(start, endExact)

  // Средние траты в день (по дням, когда были траты — или по всем дням месяца?)
  const daysWithExpenses = db.prepare('SELECT COUNT(DISTINCT date) as cnt FROM expenses WHERE date BETWEEN ? AND ?').get(start, endExact).cnt
  const avgPerDay = daysWithExpenses > 0 ? expenses / monthEnd.getDate() : 0

  return {
    month: `${year}-${String(month).padStart(2, '0')}`,
    expenses,
    savings,
    avgPerDay: +(expenses / monthEnd.getDate()).toFixed(2),
    daysWithExpenses
  }
}

module.exports = {
  db,
  getCategories,
  createCategory,
  deleteCategory,
  addExpense,
  getExpensesByDate,
  getExpensesByRange,
  getTotalByDate,
  getTotalByRange,
  getGroupedByDate,
  getGroupedByWeek,
  getGroupedByMonth,
  getGroupedByCategory,
  deleteExpense,
  addSaving,
  getSavingsTotal,
  getSavingsByDate,
  getSavingsByRange,
  getSavingsTotalByDate,
  getSavingsTotalByRange,
  getSavingsGroupedByDate,
  deleteSaving,
  getSetting,
  setSetting,
  getMonthSummary
}