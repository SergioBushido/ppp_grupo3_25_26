import * as SQLite from 'expo-sqlite';

let db = null;

export async function getDatabase() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('transferlog.db');
  return db;
}

export async function initDatabase() {
  const database = await getDatabase();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      available_days INTEGER DEFAULT 22,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      shift_type TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS vacations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      requested_at TEXT DEFAULT (datetime('now')),
      reviewed_at TEXT,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );
  `);

  await seedDatabase(database);
}

async function seedDatabase(database) {
  const existing = await database.getFirstAsync('SELECT COUNT(*) as count FROM employees');
  if (existing.count > 0) return;

  // Seed employees
  await database.runAsync(
    `INSERT INTO employees (name, email, password, role, available_days) VALUES (?, ?, ?, ?, ?)`,
    ['Admin Empresa', 'admin@transferlog.com', 'admin123', 'admin', 30]
  );
  await database.runAsync(
    `INSERT INTO employees (name, email, password, role, available_days) VALUES (?, ?, ?, ?, ?)`,
    ['Juan García', 'juan@transferlog.com', 'pass123', 'employee', 22]
  );
  await database.runAsync(
    `INSERT INTO employees (name, email, password, role, available_days) VALUES (?, ?, ?, ?, ?)`,
    ['María López', 'maria@transferlog.com', 'pass123', 'employee', 18]
  );
  await database.runAsync(
    `INSERT INTO employees (name, email, password, role, available_days) VALUES (?, ?, ?, ?, ?)`,
    ['Carlos Ruiz', 'carlos@transferlog.com', 'pass123', 'employee', 25]
  );

  // Seed shifts for current month
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const shiftTypes = ['morning', 'afternoon', 'night'];
  const employees = [2, 3, 4]; // IDs of employees

  for (let day = 1; day <= 28; day++) {
    const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
    for (let i = 0; i < employees.length; i++) {
      const empId = employees[i];
      const shiftType = shiftTypes[(day + i) % 3];
      await database.runAsync(
        `INSERT INTO shifts (employee_id, date, shift_type) VALUES (?, ?, ?)`,
        [empId, dateStr, shiftType]
      );
    }
  }

  // Seed a pending vacation request
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nm = String(nextMonth.getMonth() + 1).padStart(2, '0');
  const ny = nextMonth.getFullYear();
  await database.runAsync(
    `INSERT INTO vacations (employee_id, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, ?)`,
    [2, `${ny}-${nm}-05`, `${ny}-${nm}-12`, 'Vacaciones familiares', 'pending']
  );
  await database.runAsync(
    `INSERT INTO vacations (employee_id, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, ?)`,
    [3, `${ny}-${nm}-10`, `${ny}-${nm}-15`, 'Descanso', 'approved']
  );
}
