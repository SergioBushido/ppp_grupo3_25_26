import { requestVacation } from '../src/database/vacationService';
import { differenceInCalendarDays, parseISO } from 'date-fns';

// Mock simple de Supabase
const mockSingle = jest.fn();
const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
const mockSelect = jest.fn().mockReturnValue({ eq: mockEq, single: mockSingle });
const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });

jest.mock('../src/lib/supabase', () => {
  return {
    supabase: {
      from: jest.fn((table) => {
        return {
          select: mockSelect,
          insert: mockInsert
        };
      })
    }
  };
});

describe('vacationService - requestVacation', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería calcular correctamente los días y lanzar error si no hay suficientes disponibles', async () => {
    // 1. Arrange: Simulamos que el empleado tiene solo 3 días disponibles
    mockSingle.mockResolvedValueOnce({
      data: { available_days: 3 },
      error: null
    });

    const payload = {
      employee_id: 1,
      start_date: '2026-05-10',
      end_date: '2026-05-14', // Del 10 al 14 son 5 días
      reason: 'Viaje'
    };

    // 2. Act & Assert: Intentar solicitar 5 días teniendo solo 3 debe lanzar error
    await expect(requestVacation(payload)).rejects.toThrow(
      'No tienes suficientes días disponibles. Necesitas 5, tienes 3.'
    );
  });

  it('debería insertar la solicitud si hay días suficientes', async () => {
    // 1. Arrange: Empleado con 10 días disponibles
    mockSingle
      .mockResolvedValueOnce({ data: { available_days: 10 }, error: null }) // para la validación
      .mockResolvedValueOnce({ data: { id: 99 }, error: null }); // para el retorno del insert

    const payload = {
      employee_id: 1,
      start_date: '2026-06-01',
      end_date: '2026-06-05', // 5 días
      reason: 'Vacaciones verano'
    };

    // 2. Act
    const resultId = await requestVacation(payload);

    // 3. Assert
    expect(resultId).toBe(99);
    // Verificamos que se llamó a la tabla correcta para insertar
    expect(mockInsert).toHaveBeenCalledWith([payload]);
  });
});
