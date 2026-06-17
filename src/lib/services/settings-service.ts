// Danee Shoes & Clean — Settings Service
// Theme, WhatsApp number, and generic key-value settings

import { getSupabase } from '../supabase';
import type { ThemeSettings, ServiceResponse } from '../types-supabase';

const SETTINGS_TABLE = 'settings';

/**
 * Get theme settings (primary and hover colors)
 * Falls back to defaults if not set
 */
export async function getThemeSettings(): Promise<ServiceResponse<ThemeSettings>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('key, value')
      .in('key', ['theme_primary', 'theme_hover']);

    if (error) {
      return { success: false, error: error.message };
    }

    const settings: Record<string, string> = {};
    for (const row of data || []) {
      settings[row.key] = row.value;
    }

    return {
      success: true,
      data: {
        primary: settings['theme_primary'] || '#034BB9',
        hover: settings['theme_hover'] || '#023C94',
      },
    };
  } catch (err: any) {
    return {
      success: true,
      data: { primary: '#034BB9', hover: '#023C94' },
      error: err.message,
    };
  }
}

/**
 * Save theme settings
 */
export async function saveThemeSettings(
  primary: string,
  hover: string
): Promise<ServiceResponse> {
  try {
    const supabase = getSupabase();

    // Upsert both settings
    const { error: err1 } = await supabase
      .from(SETTINGS_TABLE)
      .upsert({ key: 'theme_primary', value: primary }, { onConflict: 'key' });

    if (err1) {
      return { success: false, error: err1.message };
    }

    const { error: err2 } = await supabase
      .from(SETTINGS_TABLE)
      .upsert({ key: 'theme_hover', value: hover }, { onConflict: 'key' });

    if (err2) {
      return { success: false, error: err2.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan tema' };
  }
}

/**
 * Get WhatsApp number from settings
 */
export async function getWaNumber(): Promise<ServiceResponse<string>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('value')
      .eq('key', 'wa_number')
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.value || '6285111619226' };
  } catch (err: any) {
    return { success: true, data: '6285111619226', error: err.message };
  }
}

/**
 * Save WhatsApp number
 */
export async function saveWaNumber(
  waNumber: string
): Promise<ServiceResponse> {
  return saveSetting('wa_number', waNumber);
}

/**
 * Save a generic setting (upsert by key)
 */
export async function saveSetting(
  key: string,
  value: string
): Promise<ServiceResponse> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(SETTINGS_TABLE)
      .upsert({ key, value }, { onConflict: 'key' });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan setting' };
  }
}

/**
 * Get a setting by key
 */
export async function getSetting(
  key: string
): Promise<ServiceResponse<string | null>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.value || null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil setting' };
  }
}
