import { getDatabase } from './database';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export async function getVacationsByEmployee(employeeId) {
  const db = await getDatabase();
  return await db.getAllAsync(
    'SELECT * FROM vacations WHERE employee_id = ? ORDER BY requested_at DESC',
    [employeeId]
  );
}

export async function getAllVacations() {
  const db = await getDatabase();
  return await db.getAllAsync(
    `SELECT v.*, e.name as employee_name
     FROM vacations v
     JOIN employees e ON v.employee_id = e.id
     ORDER BY v.requested_at DESC`
  );
}

export async function getAllPendingVacations() {
  const db = await getDatabase();
  return await db.getAllAsync(
    `SELECT v.*, e.name as employee_name
     FROM vacations v
     JOIN employees e ON v.employee_id = e.id
     WHERE v.status = 'pending'
     ORDER BY v.requested_at ASC`
  );
}

export async function getUpcomingVacationsForEmployee(employeeId) {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  return await db.getAllAsync(
    `SELECT * FROM vacations
     WHERE employee_id = ? AND start_date >= ? AND status = 'approved'
     ORDER BY start_date ASC
     LIMIT 3`,
    [employeeId, today]
  );
}

export async function requestVacation({ employee_id, start_date, end_date, reason = null }) {
  const db = await getDatabase();
  const days = differenceInCalendarDays(parseISO(end_date), parseISO(start_date)) + 1;

  // Check available days
  const emp = await db.getFirstAsync(
    'SELECT available_days FROM employees WHERE id = ?',
    [employee_id]
  );
  if (!emp || emp.available_days < days) {
    throw new Error(`No tienes suficientes días disponibles. Necesitas ${days}, tienes ${emp?.available_days ?? 0}.`);
  }

  const result = await db.runAsync(
    'INSERT INTO vacations (employee_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)',
    [employee_id, start_date, end_date, reason]
  );
  return result.lastInsertRowId;
}

export async function approveVacation(vacationId) {
  const db = await getDatabase();
  const vacation = await db.getFirstAsync('SELECT * FROM vacations WHERE id = ?', [vacationId]);
  if (!vacation) throw new Error('Solicitud no encontrada');

  const days = differenceInCalendarDays(parseISO(vacation.end_date), parseISO(vacation.start_date)) + 1;

  await db.runAsync(
    `UPDATE vacations SET status = 'approved', reviewed_at = datetime('now') WHERE id = ?`,
    [vacationId]
  );
  await db.runAsync(
    'UPDATE employees SET available_days = available_days - ? WHERE id = ?',
    [days, vacation.employee_id]
  );
}

export async function rejectVacation(vacationId) {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE vacations SET status = 'rejected', reviewed_at = datetime('now') WHERE id = ?`,
    [vacationId]
  );
}

export async function deleteVacation(vacationId) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM vacations WHERE id = ?', [vacationId]);
}
