// Danee Shoes & Clean — Auth Service
// Uses Supabase Auth (email/password)

import { getSupabase } from '../supabase';
import type { ServiceResponse } from '../types-supabase';

/**
 * Login with admin email and password
 * Credentials: admin@danee.com / danee123
 */
export async function login(
  email: string,
  password: string
): Promise<ServiceResponse<{ user: any; session: any }>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { user: data.user, session: data.session },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal login' };
  }
}

/**
 * Logout current session
 */
export async function logout(): Promise<ServiceResponse> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal logout' };
  }
}

/**
 * Get current session
 */
export async function getSession(): Promise<ServiceResponse> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data.session,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil session' };
  }
}

/**
 * Listen to auth state changes
 * Returns unsubscribe function
 */
export function onAuthChange(
  callback: (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED', session: any) => void
) {
  const supabase = getSupabase();
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event as any, session);
  });

  return data.subscription;
}

/**
 * Get current authenticated user
 */
export async function getUser(): Promise<ServiceResponse> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil user' };
  }
}
