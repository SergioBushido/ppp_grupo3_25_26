import { getDatabase } from './database';

export async function getShiftsByEmployee(employeeId) {
  const db = await getDatabase();
  return await db.getAllAsync(
    'SELECT * FROM shifts WHERE employee_id = ? ORDER BY date',
    [employeeId]
  );
}

export async function getShiftsForMonth(year, month) {
  const db = await getDatabase();
  const monthStr = String(month).padStart(2, '0');
  const prefix = `${year}-${monthStr}`;
  return await db.getAllAsync(
    `SELECT s.*, e.name as employee_name, e.role as employee_role
     FROM shifts s
     JOIN employees e ON s.employee_id = e.id
     WHERE s.date LIKE ?
     ORDER BY s.date, e.name`,
    [`${prefix}%`]
  );
}

export async function getShiftsByDate(date) {
  const db = await getDatabase();
  return await db.getAllAsync(
    `SELECT s.*, e.name as employee_name
     FROM shifts s
     JOIN employees e ON s.employee_id = e.id
     WHERE s.date = ?
     ORDER BY e.name`,
    [date]
  );
}

export async function getTodayShiftForEmployee(employeeId) {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  return await db.getFirstAsync(
    'SELECT * FROM shifts WHERE employee_id = ? AND date = ?',
    [employeeId, today]
  );
}

export async function createShift({ employee_id, date, shift_type, notes = null }) {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO shifts (employee_id, date, shift_type, notes) VALUES (?, ?, ?, ?)',
    [employee_id, date, shift_type, notes]
  );
  return result.lastInsertRowId;
}

export async function updateShift(id, fields) {
  const db = await getDatabase();
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  await db.runAsync(`UPDATE shifts SET ${setClause} WHERE id = ?`, [...values, id]);
}

export async function deleteShift(id) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM shifts WHERE id = ?', [id]);
}

export async function deleteShiftsForEmployeeOnDate(employeeId, date) {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM shifts WHERE employee_id = ? AND date = ?',
    [employeeId, date]
  );
}
