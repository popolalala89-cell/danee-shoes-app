// Danee Shoes & Clean — Admin User Service
// Manages admin users and their menu permissions

import { getSupabase } from '../supabase';
import type { AdminUserRow, ServiceResponse } from '../types-supabase';

export type MenuPermissionId =
  | 'ringkasan'
  | 'pesanan'
  | 'inventory'
  | 'keuangan'
  | 'menu-jasa'
  | 'menu-store'
  | 'penjualan'
  | 'profit-sharing'
  | 'konten'
  | 'diskon'
  | 'referral'
  | 'settings';

export const MENU_PERMISSIONS: { id: MenuPermissionId; label: string; icon: string }[] = [
  { id: 'ringkasan',      label: 'Ringkasan',      icon: 'dashboard' },
  { id: 'pesanan',        label: 'Pesanan',        icon: 'receipt_long' },
  { id: 'inventory',      label: 'Inventory',      icon: 'inventory_2' },
  { id: 'keuangan',       label: 'Keuangan',       icon: 'account_balance' },
  { id: 'menu-jasa',      label: 'Menu Jasa',      icon: 'cleaning_services' },
  { id: 'menu-store',     label: 'Menu Store',     icon: 'storefront' },
  { id: 'penjualan',      label: 'Penjualan',      icon: 'payments' },
  { id: 'profit-sharing', label: 'Profit Sharing',  icon: 'handshake' },
  { id: 'konten',         label: 'Konten Web',     icon: 'public' },
  { id: 'diskon',         label: 'Diskon',         icon: 'local_offer' },
  { id: 'referral',       label: 'Referral',       icon: 'link' },
  { id: 'settings',       label: 'Pengaturan',     icon: 'settings' },
];

/**
 * Map menu permission id to route path
 */
export function permissionToRoute(id: string): string {
  if (id === 'ringkasan') return '/admin';
  return `/admin/${id}`;
}

/**
 * Get current user's permissions from admin_users table
 */
export async function getUserPermissions(email: string): Promise<ServiceResponse<string[]>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('admin_users')
      .select('permissions')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      // If table doesn't exist, return all permissions (fallback)
      if (error.code === '42P01') {
        return { success: true, data: MENU_PERMISSIONS.map(m => m.id) };
      }
      return { success: false, error: error.message };
    }

    if (!data) {
      // User not in admin_users yet — grant all permissions as fallback
      return { success: true, data: MENU_PERMISSIONS.map(m => m.id) };
    }

    return { success: true, data: data.permissions || [] };
  } catch (err: any) {
    // Graceful fallback — return all permissions on error
    return { success: true, data: MENU_PERMISSIONS.map(m => m.id) };
  }
}

/**
 * Get all admin users
 */
export async function getAdminUsers(): Promise<ServiceResponse<AdminUserRow[]>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Create a new admin user
 */
export async function createAdminUser(
  email: string,
  displayName: string,
  permissions: string[]
): Promise<ServiceResponse<AdminUserRow>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        email,
        display_name: displayName,
        permissions,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update admin user permissions
 */
export async function updateUserPermissions(
  userId: string,
  permissions: string[]
): Promise<ServiceResponse<AdminUserRow>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('admin_users')
      .update({ permissions, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update admin user display name
 */
export async function updateUserDisplayName(
  userId: string,
  displayName: string
): Promise<ServiceResponse<AdminUserRow>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('admin_users')
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Toggle user active status
 */
export async function toggleUserActive(
  userId: string,
  isActive: boolean
): Promise<ServiceResponse<AdminUserRow>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('admin_users')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete an admin user
 */
export async function deleteAdminUser(userId: string): Promise<ServiceResponse> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', userId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
