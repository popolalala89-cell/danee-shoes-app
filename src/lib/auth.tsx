// Danee Shoes & Clean — Auth Context
// Provides auth state management via Supabase

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabase } from './supabase';
import * as authService from './services/auth-service';
import type { ServiceResponse } from './types-supabase';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface AuthContextValue {
  user: any | null;
  session: any | null;
  loading: boolean;
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
      }

      setLoading(false);

      // 2. Listen to auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (cancelled) return;
          setSession(newSession);
          setUser(newSession?.user ?? null);
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
      cleanup.then((fn) => fn?.());
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
    <AuthContext.Provider value={{ user, session, loading, login, logout }}>
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
