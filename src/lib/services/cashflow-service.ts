// Danee Shoes & Clean — Cashflow Service
// Cashflow management with filtering and summary

import { getSupabase } from '../supabase';
import type {
  CashflowRow,
  CashflowCreate,
  ServiceResponse,
} from '../types-supabase';

const TABLE = 'cashflow';

/**
 * Get all cashflow entries with optional filters
 * @param tipe - Filter by type: 'Pemasukan' or 'Pengeluaran'
 * @param startDate - Filter by start date (ISO string)
 * @param endDate - Filter by end date (ISO string)
 */
export async function getAll(
  tipe?: 'Pemasukan' | 'Pengeluaran',
  startDate?: string,
  endDate?: string
): Promise<ServiceResponse<CashflowRow[]>> {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from(TABLE)
      .select('*')
      .order('tanggal', { ascending: false });

    if (tipe) {
      query = query.eq('tipe', tipe);
    }

    if (startDate) {
      query = query.gte('tanggal', startDate);
    }

    if (endDate) {
      // Include end of day for endDate
      const endDateEnd = endDate + 'T23:59:59.999Z';
      query = query.lte('tanggal', endDateEnd);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil data cashflow' };
  }
}

/**
 * Create a new cashflow entry manually
 */
export async function create(
  payload: CashflowCreate
): Promise<ServiceResponse<CashflowRow>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        tipe: payload.tipe,
        kategori: payload.kategori,
        sumber_id: payload.sumber_id || null,
        keterangan: payload.keterangan || null,
        jumlah: payload.jumlah,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menambah cashflow' };
  }
}

/**
 * Get summary totals for income and expense within a date range
 */
export async function getSummary(
  startDate?: string,
  endDate?: string
): Promise<
  ServiceResponse<{
    totalPemasukan: number;
    totalPengeluaran: number;
    saldo: number;
    countPemasukan: number;
    countPengeluaran: number;
  }>
> {
  try {
    const supabase = getSupabase();
    let query = supabase.from(TABLE).select('tipe, jumlah');

    if (startDate) {
      query = query.gte('tanggal', startDate);
    }
    if (endDate) {
      query = query.lte('tanggal', endDate + 'T23:59:59.999Z');
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    const rows = data || [];
    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    let countPemasukan = 0;
    let countPengeluaran = 0;

    for (const row of rows) {
      if (row.tipe === 'Pemasukan') {
        totalPemasukan += row.jumlah;
        countPemasukan++;
      } else if (row.tipe === 'Pengeluaran') {
        totalPengeluaran += row.jumlah;
        countPengeluaran++;
      }
    }

    return {
      success: true,
      data: {
        totalPemasukan,
        totalPengeluaran,
        saldo: totalPemasukan - totalPengeluaran,
        countPemasukan,
        countPengeluaran,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil ringkasan cashflow' };
  }
}
