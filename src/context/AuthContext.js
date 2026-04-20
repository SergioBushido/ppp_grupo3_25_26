import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentSession, getEmployeeByAuthUserId, getEmployeeById, signInWithPassword, signOut } from '../database/employeeService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const syncProfileFromSession = useCallback(async (nextSession) => {
    setSession(nextSession);

    if (!nextSession?.user?.id) {
      setUser(null);
      return;
    }

    const employee = await getEmployeeByAuthUserId(nextSession.user.id);
    setUser(employee);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const initialSession = await getCurrentSession();
        if (!isMounted) return;
        await syncProfileFromSession(initialSession);
      } catch (e) {
        if (!isMounted) return;
        try {
          await signOut();
        } catch (_logoutError) {
          // Ignore cleanup errors while restoring the initial session.
        }
        setSession(null);
        setUser(null);
        setError('No se pudo restaurar la sesión.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    bootstrapAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setIsLoading(false);
      setError(null);

      syncProfileFromSession(nextSession).catch((syncError) => {
        console.warn('Error syncing auth session', syncError);
        setSession(nextSession);
        setUser(null);
        setError('La cuenta autenticada no tiene un perfil de empleado asociado.');
        signOut().catch((logoutError) => {
          console.warn('Error closing invalid session', logoutError);
        });
      });
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [syncProfileFromSession]);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const { session: nextSession } = await signInWithPassword(email, password);
      await syncProfileFromSession(nextSession);
      return true;
    } catch (e) {
      const message = e?.message?.includes('Invalid login credentials')
        ? 'Credenciales incorrectas. Verifica tu email y contraseña.'
        : e?.message || 'No se pudo iniciar sesión.';

      try {
        await signOut();
      } catch (_logoutError) {
        // No-op: if login failed before creating a session there is nothing else to clean up.
      }

      setSession(null);
      setUser(null);
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [syncProfileFromSession]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut();
      setSession(null);
      setUser(null);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return null;
    try {
      const updated = await getEmployeeById(user.id);
      if (updated) {
        setUser(updated);
        return updated;
      }
      return null;
    } catch (e) {
      console.warn('Error en refreshUser', e);
      return null;
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    session,
    isLoading,
    error,
    login,
    logout,
    refreshUser,
  }), [user, session, isLoading, error, login, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
