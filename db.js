const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(':memory:'); // Use ':memory:' for in-memory database or provide a path for file-based database

db.serialize(() => {
  // Create FinanceTerms table if not exists
  db.run(`CREATE TABLE IF NOT EXISTS FinanceTerms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    insurancePolicies TEXT,
    downpayment REAL,
    dueDate TEXT,
    amountFinanced REAL,
    status TEXT
  )`);
  
  console.log('Connected to SQLite');
});

module.exports = db;
