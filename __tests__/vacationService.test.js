import { 
  requestVacation, 
  approveVacation, 
  rejectVacation, 
  cancelVacation, 
  deleteVacation 
} from '../src/database/vacationService';

import { supabase } from '../src/lib/supabase';

// Mocks instanciados DENTRO del factory de jest.mock para evitar errores de hoisting
jest.mock('../src/lib/supabase', () => {
  const mockSingle = jest.fn();
  const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq, single: mockSingle });
  const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
  const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
  const mockRpc = jest.fn();

  return {
    supabase: {
      from: jest.fn(() => ({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
      })),
      rpc: mockRpc,
    },
    _mockSingle: mockSingle,
    _mockInsert: mockInsert,
    _mockUpdate: mockUpdate,
    _mockDelete: mockDelete,
  };
});

const { _mockSingle, _mockInsert, _mockUpdate, _mockDelete } = require('../src/lib/supabase');

describe('vacationService', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestVacation', () => {
    it('debería calcular correctamente los días y lanzar error si no hay suficientes disponibles', async () => {
      _mockSingle.mockResolvedValueOnce({
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
      _mockSingle
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
      expect(_mockInsert).toHaveBeenCalledWith([payload]);
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
      _mockUpdate.mockReturnValueOnce({ eq: jest.fn().mockResolvedValueOnce({ error: null }) });
      
      await rejectVacation(789);
      
      expect(_mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'rejected'
      }));
    });
  });

  describe('deleteVacation', () => {
    it('debería hacer delete en la tabla vacations', async () => {
      _mockDelete.mockReturnValueOnce({ eq: jest.fn().mockResolvedValueOnce({ error: null }) });
      
      await deleteVacation(999);
      
      expect(_mockDelete).toHaveBeenCalled();
    });
  });

});
