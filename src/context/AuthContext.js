import React, { createContext, useContext, useState, useCallback } from 'react';
import { loginEmployee, getEmployeeById } from '../database/employeeService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const employee = await loginEmployee(email, password);
      if (employee) {
        setUser(employee);
        return true;
      } else {
        setError('Credenciales incorrectas. Verifica tu email y contraseña.');
        return false;
      }
    } catch (e) {
      setError('Error al conectar con la base de datos.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const updated = await getEmployeeById(user.id);
      if (updated) setUser(updated);
    } catch (e) {
      console.warn('Error en refreshUser', e);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
