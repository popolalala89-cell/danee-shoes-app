// Danee Shoes Care — Auth Context
// Provides auth state management via Supabase

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabase } from './supabase';
import * as authService from './services/auth-service';
import * as adminUserService from './services/admin-user-service';
import type { ServiceResponse } from './types-supabase';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface AuthContextValue {
  user: any | null;
  session: any | null;
  loading: boolean;
  permissions: string[];
  hasPermission: (menuId: string) => boolean;
  login: (email: string, password: string) => Promise<ServiceResponse>;
  logout: () => Promise<ServiceResponse>;
}

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);

  /* ---- Load permissions from admin_users table ---- */
  const loadPermissions = useCallback(async (email?: string) => {
    if (!email) return;
    const result = await adminUserService.getUserPermissions(email);
    if (result.success && result.data) {
      setPermissions(result.data);
    }
  }, []);

  /* ---- Check if user has access to a menu ---- */
  const hasPermission = useCallback((menuId: string): boolean => {
    return permissions.length === 0 || permissions.includes(menuId);
  }, [permissions]);

  /* ---- Bootstrap: check existing session + subscribe to changes ---- */
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const supabase = getSupabase();

      // 1. Get current session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user ?? null);
        // Load permissions
        loadPermissions(currentSession.user?.email);
      }

      setLoading(false);

      // 2. Listen to auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (cancelled) return;
          setSession(newSession);
          setUser(newSession?.user ?? null);
          if (newSession?.user?.email) {
            loadPermissions(newSession.user.email);
          } else {
            setPermissions([]);
          }
        }
      );

      return () => {
        cancelled = true;
        subscription.unsubscribe();
      };
    }

    const cleanup = bootstrap();
    return () => {
      cancelled = true;
      cleanup.then((fn) => { if (typeof fn === 'function') fn(); });
    };
  }, []);

  /* ---- Login ---- */
  const login = useCallback(
    async (email: string, password: string): Promise<ServiceResponse> => {
      const result = await authService.login(email, password);
      if (result.success) {
        setUser(result.data?.user ?? null);
        setSession(result.data?.session ?? null);
      }
      return result;
    },
    []
  );

  /* ---- Logout ---- */
  const logout = useCallback(async (): Promise<ServiceResponse> => {
    const result = await authService.logout();
    if (result.success) {
      setUser(null);
      setSession(null);
    }
    return result;
  }, []);

  /* ---- Render ---- */
  return (
    <AuthContext.Provider value={{ user, session, loading, permissions, hasPermission, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthProvider;
