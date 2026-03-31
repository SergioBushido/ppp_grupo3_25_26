import { getDatabase } from './database';

export async function getAllEmployees() {
  const db = await getDatabase();
  return await db.getAllAsync('SELECT * FROM employees ORDER BY name');
}

export async function getEmployeeById(id) {
  const db = await getDatabase();
  return await db.getFirstAsync('SELECT * FROM employees WHERE id = ?', [id]);
}

export async function loginEmployee(email, password) {
  const db = await getDatabase();
  return await db.getFirstAsync(
    'SELECT * FROM employees WHERE email = ? AND password = ?',
    [email.toLowerCase().trim(), password]
  );
}

export async function createEmployee({ name, email, password, role = 'employee', available_days = 22 }) {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO employees (name, email, password, role, available_days) VALUES (?, ?, ?, ?, ?)',
    [name, email.toLowerCase().trim(), password, role, available_days]
  );
  return result.lastInsertRowId;
}

export async function updateEmployee(id, fields) {
  const db = await getDatabase();
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  await db.runAsync(`UPDATE employees SET ${setClause} WHERE id = ?`, [...values, id]);
}

export async function updateAvailableDays(employeeId, days) {
  const db = await getDatabase();
  await db.runAsync('UPDATE employees SET available_days = ? WHERE id = ?', [days, employeeId]);
}

export async function deleteEmployee(id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM employees WHERE id = ?', [id]);
}
