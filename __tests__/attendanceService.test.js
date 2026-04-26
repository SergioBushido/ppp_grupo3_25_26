import {
  registerAttendance,
  registerAttendanceWithLocation,
  createManualAttendanceByAdmin,
  invalidateAttendanceByAdmin,
  getAllAttendancesByDate,
  getRecentAttendances,
} from '../src/database/attendanceService';

import { supabase } from '../src/lib/supabase';
import { getEmployeeById } from '../src/database/employeeService';
import { getWorkCenterById } from '../src/database/workCenterService';
import { calculateDistanceMeters } from '../src/lib/locationService';

jest.mock('../src/lib/supabase', () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  };

  return {
    supabase: {
      from: jest.fn(() => mockChain),
    },
    mockChain,
  };
});

jest.mock('../src/database/employeeService', () => ({
  getEmployeeById: jest.fn(),
}));

jest.mock('../src/database/workCenterService', () => ({
  getWorkCenterById: jest.fn(),
}));

jest.mock('../src/lib/locationService', () => ({
  calculateDistanceMeters: jest.fn(),
}));

const { mockChain } = require('../src/lib/supabase');

describe('attendanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.gte.mockReturnThis();
    mockChain.lte.mockReturnThis();
    mockChain.order.mockReturnThis();
    mockChain.limit.mockReturnThis();
    mockChain.insert.mockReturnThis();
    mockChain.update.mockReturnThis();
  });

  describe('registerAttendance', () => {
    it('bloquea una segunda entrada en el mismo dia', async () => {
      mockChain.order.mockResolvedValueOnce({
        data: [{ id: 1, type: 'in', timestamp: '2026-04-25T08:00:00.000Z' }],
        error: null,
      });

      await expect(registerAttendance(10, 'in')).rejects.toThrow(
        'Ya has registrado una entrada hoy.'
      );
    });

    it('bloquea una segunda salida en el mismo dia', async () => {
      mockChain.order.mockResolvedValueOnce({
        data: [{ id: 1, type: 'out', timestamp: '2026-04-25T17:00:00.000Z' }],
        error: null,
      });

      await expect(registerAttendance(10, 'out')).rejects.toThrow(
        'Ya has registrado una salida hoy.'
      );
    });

    it('inserta un fichaje si no existe duplicado', async () => {
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });
      mockChain.single.mockResolvedValueOnce({
        data: { id: 2, employee_id: 10, type: 'in' },
        error: null,
      });

      const result = await registerAttendance(10, 'in');

      expect(mockChain.insert).toHaveBeenCalledWith([{ employee_id: 10, type: 'in' }]);
      expect(result).toEqual({ id: 2, employee_id: 10, type: 'in' });
    });
  });

  describe('registerAttendanceWithLocation', () => {
    it('exige empleado autenticado', async () => {
      await expect(
        registerAttendanceWithLocation({ employee: null, type: 'in', location: null })
      ).rejects.toThrow('No se ha encontrado el empleado autenticado.');
    });

    it('bloquea empleados con politica manual_only', async () => {
      getEmployeeById.mockResolvedValueOnce({
        id: 5,
        attendance_policy: 'manual_only',
      });
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });

      await expect(
        registerAttendanceWithLocation({
          employee: { id: 5 },
          type: 'in',
          location: null,
        })
      ).rejects.toThrow('Tu fichaje debe registrarse manualmente por administracion.');
    });

    it('bloquea fichaje localizado si ya hay entrada registrada', async () => {
      getEmployeeById.mockResolvedValueOnce({
        id: 6,
        attendance_policy: 'anywhere',
      });
      mockChain.order.mockResolvedValueOnce({
        data: [{ id: 3, type: 'in' }],
        error: null,
      });

      await expect(
        registerAttendanceWithLocation({
          employee: { id: 6 },
          type: 'in',
          location: null,
        })
      ).rejects.toThrow('Ya has registrado una entrada hoy.');
    });

    it('bloquea fichaje con centro asignado si el empleado no tiene centro', async () => {
      getEmployeeById.mockResolvedValueOnce({
        id: 6,
        attendance_policy: 'assigned_center',
        assigned_work_center_id: null,
      });
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });

      await expect(
        registerAttendanceWithLocation({
          employee: { id: 6 },
          type: 'in',
          location: { latitude: 28.1, longitude: -15.4, accuracy_meters: 15 },
        })
      ).rejects.toThrow('No tienes un centro de trabajo asignado para fichar.');
    });

    it('bloquea fichaje con centro asignado si no hay ubicacion', async () => {
      getEmployeeById.mockResolvedValueOnce({
        id: 6,
        attendance_policy: 'assigned_center',
        assigned_work_center_id: 3,
      });
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });

      await expect(
        registerAttendanceWithLocation({
          employee: { id: 6 },
          type: 'in',
          location: null,
        })
      ).rejects.toThrow('Necesitas activar la ubicacion para registrar el fichaje en tu centro.');
    });

    it('bloquea fichaje si esta fuera del radio permitido', async () => {
      getEmployeeById.mockResolvedValueOnce({
        id: 7,
        attendance_policy: 'assigned_center',
        assigned_work_center_id: 4,
      });
      getWorkCenterById.mockResolvedValueOnce({
        id: 4,
        name: 'Base Norte',
        latitude: 28.1,
        longitude: -15.4,
        radius_meters: 100,
      });
      calculateDistanceMeters.mockReturnValueOnce(250);
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });

      await expect(
        registerAttendanceWithLocation({
          employee: { id: 7 },
          type: 'in',
          location: { latitude: 28.2, longitude: -15.5, accuracy_meters: 20 },
        })
      ).rejects.toThrow('Estas fuera del radio permitido de tu centro de trabajo.');
    });

    it('bloquea fichaje con centro asignado si el centro ya no existe', async () => {
      getEmployeeById.mockResolvedValueOnce({
        id: 7,
        attendance_policy: 'assigned_center',
        assigned_work_center_id: 4,
      });
      getWorkCenterById.mockResolvedValueOnce(null);
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });

      await expect(
        registerAttendanceWithLocation({
          employee: { id: 7 },
          type: 'in',
          location: { latitude: 28.2, longitude: -15.5, accuracy_meters: 20 },
        })
      ).rejects.toThrow('El centro asignado no existe o ya no esta disponible.');
    });

    it('bloquea fichaje con centro si la precision GPS es insuficiente', async () => {
      getEmployeeById.mockResolvedValueOnce({
        id: 7,
        attendance_policy: 'assigned_center',
        assigned_work_center_id: 4,
      });
      getWorkCenterById.mockResolvedValueOnce({
        id: 4,
        name: 'Base Norte',
        latitude: 28.1,
        longitude: -15.4,
        radius_meters: 80,
      });
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });

      await expect(
        registerAttendanceWithLocation({
          employee: { id: 7 },
          type: 'in',
          location: { latitude: 28.2, longitude: -15.5, accuracy_meters: 140 },
        })
      ).rejects.toThrow('La precision del GPS es insuficiente. Acercate a una zona despejada e intentalo de nuevo.');
    });

    it('inserta fichaje validado dentro del centro asignado', async () => {
      getEmployeeById.mockResolvedValueOnce({
        id: 7,
        attendance_policy: 'assigned_center',
        assigned_work_center_id: 4,
      });
      getWorkCenterById.mockResolvedValueOnce({
        id: 4,
        name: 'Base Norte',
        latitude: 28.1,
        longitude: -15.4,
        radius_meters: 100,
      });
      calculateDistanceMeters.mockReturnValueOnce(42);
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });
      mockChain.single.mockResolvedValueOnce({
        data: { id: 12, employee_id: 7, type: 'in' },
        error: null,
      });

      const result = await registerAttendanceWithLocation({
        employee: { id: 7 },
        type: 'in',
        location: { latitude: 28.1001, longitude: -15.4001, accuracy_meters: 20 },
      });

      expect(mockChain.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          employee_id: 7,
          validated_work_center_id: 4,
          location_distance_meters: 42,
          location_status: 'validated_center',
          location_note: 'Base Norte',
        }),
      ]);
      expect(result).toEqual({ id: 12, employee_id: 7, type: 'in' });
    });

    it('inserta evidencia de ubicacion opcional para politica anywhere', async () => {
      getEmployeeById.mockResolvedValueOnce({
        id: 8,
        attendance_policy: 'anywhere',
      });
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });
      mockChain.single.mockResolvedValueOnce({
        data: { id: 11, employee_id: 8, type: 'in' },
        error: null,
      });

      const result = await registerAttendanceWithLocation({
        employee: { id: 8 },
        type: 'in',
        location: { latitude: 28.12, longitude: -15.43, accuracy_meters: 12 },
      });

      expect(mockChain.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          employee_id: 8,
          type: 'in',
          latitude: 28.12,
          longitude: -15.43,
          accuracy_meters: 12,
          location_status: 'optional_captured',
          location_note: 'Ubicacion capturada',
        }),
      ]);
      expect(result).toEqual({ id: 11, employee_id: 8, type: 'in' });
    });

    it('inserta fichaje anywhere aunque no haya ubicacion opcional', async () => {
      getEmployeeById.mockResolvedValueOnce({
        id: 8,
        attendance_policy: 'anywhere',
      });
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });
      mockChain.single.mockResolvedValueOnce({
        data: { id: 13, employee_id: 8, type: 'out' },
        error: null,
      });

      await registerAttendanceWithLocation({
        employee: { id: 8 },
        type: 'out',
        location: null,
      });

      expect(mockChain.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          employee_id: 8,
          type: 'out',
          latitude: null,
          longitude: null,
          location_status: 'optional_missing',
          location_note: 'Ubicacion opcional no disponible',
        }),
      ]);
    });
  });

  describe('createManualAttendanceByAdmin', () => {
    it('exige administrador identificado', async () => {
      await expect(
        createManualAttendanceByAdmin({
          adminEmployeeId: null,
          employeeId: 4,
          type: 'in',
          timestamp: '2026-04-25T08:00:00',
        })
      ).rejects.toThrow('No se ha identificado al administrador actual.');
    });

    it('exige empleado seleccionado', async () => {
      await expect(
        createManualAttendanceByAdmin({
          adminEmployeeId: 1,
          employeeId: null,
          type: 'in',
          timestamp: '2026-04-25T08:00:00',
        })
      ).rejects.toThrow('Debes seleccionar un empleado.');
    });

    it('rechaza tipo de fichaje manual no valido', async () => {
      await expect(
        createManualAttendanceByAdmin({
          adminEmployeeId: 1,
          employeeId: 4,
          type: 'pause',
          timestamp: '2026-04-25T08:00:00',
        })
      ).rejects.toThrow('Tipo de fichaje manual no valido.');
    });

    it('rechaza fecha manual invalida', async () => {
      await expect(
        createManualAttendanceByAdmin({
          adminEmployeeId: 1,
          employeeId: 4,
          type: 'in',
          timestamp: 'no-es-fecha',
        })
      ).rejects.toThrow('La fecha y hora del fichaje manual no son validas.');
    });

    it('usa fallback si falta la columna record_status al buscar fichajes activos', async () => {
      mockChain.order
        .mockResolvedValueOnce({
          data: null,
          error: { code: '42703', message: 'column attendances.record_status does not exist' },
        })
        .mockResolvedValueOnce({
          data: [],
          error: null,
        });
      mockChain.single.mockResolvedValueOnce({
        data: { id: 22, employee_id: 4, type: 'in' },
        error: null,
      });

      const result = await createManualAttendanceByAdmin({
        adminEmployeeId: 1,
        employeeId: 4,
        type: 'in',
        timestamp: '2026-04-25T08:00:00',
      });

      expect(result).toEqual(expect.objectContaining({
        id: 22,
        record_status: 'active',
      }));
    });

    it('bloquea entrada manual duplicada', async () => {
      mockChain.order.mockResolvedValueOnce({
        data: [{ id: 20, employee_id: 4, type: 'in', timestamp: '2026-04-25T08:00:00.000Z' }],
        error: null,
      });

      await expect(
        createManualAttendanceByAdmin({
          adminEmployeeId: 1,
          employeeId: 4,
          type: 'in',
          timestamp: '2026-04-25T09:00:00',
        })
      ).rejects.toThrow('Ese empleado ya tiene una entrada activa registrada en esa fecha.');
    });

    it('bloquea salida manual sin entrada activa previa', async () => {
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });

      await expect(
        createManualAttendanceByAdmin({
          adminEmployeeId: 1,
          employeeId: 4,
          type: 'out',
          timestamp: '2026-04-25T17:00:00',
        })
      ).rejects.toThrow('No se puede registrar una salida manual sin una entrada activa previa en esa fecha.');
    });

    it('bloquea salida manual duplicada', async () => {
      mockChain.order.mockResolvedValueOnce({
        data: [
          { id: 20, employee_id: 4, type: 'in', timestamp: '2026-04-25T08:00:00.000Z' },
          { id: 21, employee_id: 4, type: 'out', timestamp: '2026-04-25T17:00:00.000Z' },
        ],
        error: null,
      });

      await expect(
        createManualAttendanceByAdmin({
          adminEmployeeId: 1,
          employeeId: 4,
          type: 'out',
          timestamp: '2026-04-25T18:00:00',
        })
      ).rejects.toThrow('Ese empleado ya tiene una salida activa registrada en esa fecha.');
    });

    it('bloquea salida manual anterior a la entrada registrada', async () => {
      mockChain.order.mockResolvedValueOnce({
        data: [{ id: 20, employee_id: 4, type: 'in', timestamp: '2026-04-25T10:00:00.000Z' }],
        error: null,
      });

      await expect(
        createManualAttendanceByAdmin({
          adminEmployeeId: 1,
          employeeId: 4,
          type: 'out',
          timestamp: '2026-04-25T09:00:00',
        })
      ).rejects.toThrow('La salida manual no puede ser anterior a la entrada registrada.');
    });

    it('avisa si falta la migracion de fichaje manual admin', async () => {
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { code: '42703', message: 'column attendances.entry_mode does not exist' },
      });

      await expect(
        createManualAttendanceByAdmin({
          adminEmployeeId: 1,
          employeeId: 4,
          type: 'in',
          timestamp: '2026-04-25T08:00:00',
        })
      ).rejects.toThrow('Debes aplicar la migracion de fichaje manual admin antes de usar esta accion.');
    });

    it('inserta fichaje manual con auditoria administrativa', async () => {
      mockChain.order.mockResolvedValueOnce({
        data: [{ id: 20, employee_id: 4, type: 'in', timestamp: '2026-04-25T08:00:00.000Z' }],
        error: null,
      });
      mockChain.single.mockResolvedValueOnce({
        data: {
          id: 21,
          employee_id: 4,
          type: 'out',
          entry_mode: 'admin_manual',
        },
        error: null,
      });

      const result = await createManualAttendanceByAdmin({
        adminEmployeeId: 1,
        employeeId: 4,
        type: 'out',
        timestamp: '2026-04-25T17:00:00',
        note: '  Olvido de fichaje  ',
      });

      expect(mockChain.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          employee_id: 4,
          type: 'out',
          entry_mode: 'admin_manual',
          created_by_employee_id: 1,
          admin_note: 'Olvido de fichaje',
        }),
      ]);
      expect(result).toEqual(expect.objectContaining({
        id: 21,
        entry_mode: 'admin_manual',
      }));
    });
  });

  describe('invalidateAttendanceByAdmin', () => {
    it('exige motivo para anular un fichaje', async () => {
      await expect(
        invalidateAttendanceByAdmin(30, { adminEmployeeId: 1, reason: '   ' })
      ).rejects.toThrow('Debes indicar un motivo para anular el fichaje.');
    });

    it('exige administrador para anular un fichaje', async () => {
      await expect(
        invalidateAttendanceByAdmin(30, { adminEmployeeId: null, reason: 'Error' })
      ).rejects.toThrow('No se ha identificado al administrador que realiza la accion.');
    });

    it('avisa si falta la migracion de control auditado al leer el fichaje', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: {
          id: 30,
          employee_id: 4,
          timestamp: '2026-04-25T08:00:00.000Z',
          record_status: null,
        },
        error: null,
      });

      await expect(
        invalidateAttendanceByAdmin(30, { adminEmployeeId: 1, reason: 'Error' })
      ).rejects.toThrow('Debes aplicar la migracion de control auditado de fichajes antes de usar esta accion.');
    });

    it('bloquea un fichaje que ya estaba anulado', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: {
          id: 30,
          employee_id: 4,
          timestamp: '2026-04-25T08:00:00.000Z',
          record_status: 'voided',
        },
        error: null,
      });

      await expect(
        invalidateAttendanceByAdmin(30, { adminEmployeeId: 1, reason: 'Duplicado' })
      ).rejects.toThrow('Este fichaje ya estaba anulado.');
    });

    it('bloquea si el fichaje no es el ultimo activo del dia', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: {
          id: 30,
          employee_id: 4,
          timestamp: '2026-04-25T08:00:00.000Z',
          record_status: 'active',
        },
        error: null,
      });
      mockChain.maybeSingle.mockResolvedValueOnce({
        data: { id: 31 },
        error: null,
      });

      await expect(
        invalidateAttendanceByAdmin(30, { adminEmployeeId: 1, reason: 'Error operativo' })
      ).rejects.toThrow('Solo se puede anular el ultimo fichaje activo del empleado en ese dia.');
    });

    it('avisa si falta la columna de auditoria al buscar el ultimo activo', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: {
          id: 30,
          employee_id: 4,
          timestamp: '2026-04-25T08:00:00.000Z',
          record_status: 'active',
        },
        error: null,
      });
      mockChain.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { code: '42703', message: 'column attendances.record_status does not exist' },
      });

      await expect(
        invalidateAttendanceByAdmin(30, { adminEmployeeId: 1, reason: 'Error operativo' })
      ).rejects.toThrow('Debes aplicar la migracion de control auditado de fichajes antes de usar esta accion.');
    });

    it('propaga errores al buscar el ultimo fichaje activo', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: {
          id: 30,
          employee_id: 4,
          timestamp: '2026-04-25T08:00:00.000Z',
          record_status: 'active',
        },
        error: null,
      });
      mockChain.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: new Error('Fallo Supabase'),
      });

      await expect(
        invalidateAttendanceByAdmin(30, { adminEmployeeId: 1, reason: 'Error operativo' })
      ).rejects.toThrow('Fallo Supabase');
    });

    it('actualiza el fichaje como anulado si es el ultimo activo', async () => {
      mockChain.single
        .mockResolvedValueOnce({
          data: {
            id: 30,
            employee_id: 4,
            timestamp: '2026-04-25T08:00:00.000Z',
            record_status: 'active',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 30,
            employee_id: 4,
            timestamp: '2026-04-25T08:00:00.000Z',
            record_status: 'voided',
            void_reason: 'Error operativo',
          },
          error: null,
        });
      mockChain.maybeSingle.mockResolvedValueOnce({
        data: { id: 30 },
        error: null,
      });

      const result = await invalidateAttendanceByAdmin(30, {
        adminEmployeeId: 1,
        reason: ' Error operativo ',
      });

      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
        record_status: 'voided',
        voided_by_employee_id: 1,
        void_reason: 'Error operativo',
      }));
      expect(result).toEqual(expect.objectContaining({
        id: 30,
        record_status: 'voided',
      }));
    });
  });

  describe('getRecentAttendances', () => {
    it('retorna fichajes recientes normalizados', async () => {
      mockChain.limit.mockResolvedValueOnce({
        data: [{ id: 50, employee_id: 4, type: 'in' }],
        error: null,
      });

      const result = await getRecentAttendances(5);

      expect(mockChain.limit).toHaveBeenCalledWith(5);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 50,
        record_status: 'active',
        entry_mode: 'self_service',
      }));
    });
  });

  describe('getAllAttendancesByDate', () => {
    it('normaliza registros antiguos sin columnas de auditoria', async () => {
      mockChain.order.mockResolvedValueOnce({
        data: [{ id: 40, employee_id: 4, type: 'in' }],
        error: null,
      });

      const result = await getAllAttendancesByDate('2026-04-25');

      expect(result[0]).toEqual(expect.objectContaining({
        id: 40,
        record_status: 'active',
        entry_mode: 'self_service',
      }));
    });
  });
});
