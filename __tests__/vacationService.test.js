import { 
  getVacationsByEmployee,
  getAllVacations,
  getAllPendingVacations,
  getUpcomingVacationsForEmployee,
  requestVacation, 
  editRequestVacation,
  approveVacation, 
  rejectVacation, 
  cancelVacation, 
  reactiveVacation,
  deleteVacation 
} from '../src/database/vacationService';

import { supabase } from '../src/lib/supabase';

jest.mock('../src/lib/supabase', () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };

  return {
    supabase: {
      from: jest.fn(() => mockChain),
      rpc: jest.fn(),
    },
    mockChain
  };
});

const { mockChain } = require('../src/lib/supabase');

describe('vacationService', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getVacationsByEmployee', () => {
    it('debería retornar el historial de vacaciones de un empleado', async () => {
      mockChain.order.mockResolvedValueOnce({ data: [{ id: 1 }], error: null });
      const result = await getVacationsByEmployee(123);
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('getAllVacations', () => {
    it('debería retornar y mapear todas las vacaciones', async () => {
      mockChain.order.mockResolvedValueOnce({ 
        data: [{ id: 1, employees: { name: 'Juan', available_days: 10 } }], 
        error: null 
      });
      const result = await getAllVacations();
      expect(result[0].employee_name).toBe('Juan');
      expect(result[0].employee_available_days).toBe(10);
    });
  });

  describe('getAllPendingVacations', () => {
    it('debería retornar solicitudes pendientes', async () => {
      mockChain.order.mockResolvedValueOnce({ 
        data: [{ id: 2, employees: { name: 'Ana' } }], 
        error: null 
      });
      const result = await getAllPendingVacations();
      expect(result[0].employee_name).toBe('Ana');
    });
  });

  describe('getUpcomingVacationsForEmployee', () => {
    it('debería retornar vacaciones aprobadas y futuras (límite 3)', async () => {
      mockChain.limit.mockResolvedValueOnce({ data: [{ id: 3 }], error: null });
      const result = await getUpcomingVacationsForEmployee(123);
      expect(result).toEqual([{ id: 3 }]);
    });
  });

  describe('requestVacation', () => {
    it('debería calcular correctamente los días y lanzar error si no hay suficientes disponibles', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { available_days: 3 },
        error: null
      });

      const payload = {
        employee_id: 1,
        start_date: '2026-05-10',
        end_date: '2026-05-14', // 5 días
        reason: 'Viaje'
      };

      await expect(requestVacation(payload)).rejects.toThrow(
        'No tienes suficientes días disponibles. Necesitas 5, tienes 3.'
      );
    });

    it('debería insertar la solicitud si hay días suficientes', async () => {
      mockChain.single
        .mockResolvedValueOnce({ data: { available_days: 10 }, error: null })
        .mockResolvedValueOnce({ data: { id: 99 }, error: null });

      const payload = {
        employee_id: 1,
        start_date: '2026-06-01',
        end_date: '2026-06-05',
        reason: 'Vacaciones verano'
      };

      const resultId = await requestVacation(payload);
      expect(resultId).toBe(99);
      expect(mockChain.insert).toHaveBeenCalledWith([payload]);
    });
  });

  describe('editRequestVacation', () => {
    it('debería invocar la RPC de edición', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });
      const result = await editRequestVacation({ vacation_id: 1, start_date: '2026-01-01', end_date: '2026-01-05' });
      expect(supabase.rpc).toHaveBeenCalledWith('edit_vacation_transactional', expect.any(Object));
      expect(result).toEqual({ success: true });
    });
  });

  describe('approveVacation', () => {
    it('debería invocar la RPC transaccional approve_vacation_transactional', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });
      const result = await approveVacation(123);
      expect(supabase.rpc).toHaveBeenCalledWith('approve_vacation_transactional', {
        p_vacation_id: 123,
      });
      expect(result).toEqual({ success: true });
    });

    it('debería lanzar error si la RPC falla', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('Error en RPC') });
      await expect(approveVacation(123)).rejects.toThrow('Error en RPC');
    });
  });

  describe('cancelVacation', () => {
    it('debería invocar la RPC transaccional cancel_vacation_transactional', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });
      const result = await cancelVacation({ id: 456 });
      expect(supabase.rpc).toHaveBeenCalledWith('cancel_vacation_transactional', {
        p_vacation_id: 456,
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('rejectVacation', () => {
    it('debería actualizar el estado de la vacación a rejected', async () => {
      mockChain.eq.mockResolvedValueOnce({ error: null });
      await rejectVacation(789);
      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'rejected'
      }));
    });
  });

  describe('reactiveVacation', () => {
    it('debería actualizar el estado de la vacación a pending', async () => {
      mockChain.eq.mockResolvedValueOnce({ error: null });
      await reactiveVacation(789);
      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'pending'
      }));
    });
  });

  describe('deleteVacation', () => {
    it('debería hacer delete en la tabla vacations', async () => {
      mockChain.eq.mockResolvedValueOnce({ error: null });
      await deleteVacation(999);
      expect(mockChain.delete).toHaveBeenCalled();
    });
  });

});
