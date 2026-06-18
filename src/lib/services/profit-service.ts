// Danee Shoes Care — Profit Sharing Service
// Ported from GAS Code.js profit sharing engine

import { getSupabase } from '../supabase';
import type {
  OrderRow,
  SettingsProfitRow,
  ReferralRow,
  MenuJasaRow,
  MenuStoreRow,
  ProfitSharingData,
  Dompet,
  KomisiBreakdown,
  ProfitHistory,
  ServiceResponse,
} from '../types-supabase';

/**
 * Get month range helper
 */
function getMonthRange(month?: number, year?: number) {
  const now = new Date();
  const m = month !== undefined ? month - 1 : now.getMonth();
  const y = year || now.getFullYear();
  const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const endDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate, month: m, year: y };
}

/**
 * Parse percent value — handles both decimal (0.05) and percentage (5%) formats
 */
function parsePercent(val: number | string): number {
  const num = typeof val === 'string' ? parseFloat(val.replace('%', '').trim()) : val;
  if (isNaN(num)) return 0;
  if (num > 1) return num / 100;
  return num;
}

/**
 * Calculate profit sharing data for a given month/year
 *
 * Engine logic (ported from GAS):
 * 1. Get all 'Selesai' orders within date range
 * 2. Parse items from comma-separated layanan field
 * 3. Match HPP costs from settings_profit (longest-match-first)
 * 4. Calculate gross, HPP allocation, referral commissions
 * 5. Net = gross - HPP - commissions
 * 6. Distribution:
 *    - Below target: all goes to target bucket
 *    - At target: fixed base amounts distributed
 *    - Above target: percentage-based distribution per role
 */
export async function getProfitSharingData(
  month?: number,
  year?: number
): Promise<ServiceResponse<ProfitSharingData>> {
  try {
    const supabase = getSupabase();
    const { startDate, endDate } = getMonthRange(month, year);

    // ===== 1. Fetch reference data =====
    const [
      { data: ordersRaw },
      { data: settingsProfitRaw },
      { data: menuJasaRaw },
      { data: menuStoreRaw },
      { data: referralsRaw },
    ] = await Promise.all([
      supabase.from('orders').select('*'),
      supabase.from('settings_profit').select('*'),
      supabase.from('menu_jasa').select('*'),
      supabase.from('menu_store').select('*'),
      supabase.from('referral').select('*').eq('status', 'Aktif'),
    ]);

    const orders = (ordersRaw || []) as OrderRow[];
    const settingsProfit = (settingsProfitRaw || []) as SettingsProfitRow[];
    const menuJasa = (menuJasaRaw || []) as MenuJasaRow[];
    const menuStore = (menuStoreRaw || []) as MenuStoreRow[];
    const referrals = (referralsRaw || []) as ReferralRow[];

    if (!orders.length) {
      return {
        success: true,
        data: {
          omsetGross: 0,
          alokasiHPP: 0,
          totalKomisi: 0,
          omsetNett: 0,
          target: 0,
          dompet: createEmptyDompet(),
          komisiBreakdown: [],
        },
      };
    }

    // ===== 2. Parse configuration =====
    const configHPP: Record<string, { hpp: number; kategori: string }> = {};
    let targetOmset = 0;
    const configPct: Record<string, { clean: number; repair: number; baseGaji: number }> = {};

    for (const row of settingsProfit) {
      const keyLayanan = row.nama_layanan.trim().toLowerCase();
      if (keyLayanan) {
        configHPP[keyLayanan] = { hpp: row.hpp, kategori: (row.kategori || '').toUpperCase() };
      }
      if (row.target_omset > 0) {
        targetOmset += row.target_omset;
      }
      if (row.peran) {
        const peran = row.peran.trim().toLowerCase();
        if (!configPct[peran]) {
          configPct[peran] = { clean: 0, repair: 0, baseGaji: 0 };
        }
        configPct[peran].clean = parsePercent(row.clean_pct);
        configPct[peran].repair = parsePercent(row.repair_pct);
        configPct[peran].baseGaji = row.base_gaji || 0;
      }
    }

    // ===== 3. Build price lookup =====
    const hargaAsliMenu: Record<string, number> = {};
    for (const item of menuJasa) {
      if (item.nama_layanan) {
        hargaAsliMenu[item.nama_layanan.trim().toLowerCase()] = item.harga;
      }
    }
    for (const item of menuStore) {
      if (item.nama_produk) {
        hargaAsliMenu[item.nama_produk.trim().toLowerCase()] = item.harga;
      }
    }

    // ===== 4. Build referral map =====
    const referralMap: Record<string, { nama: string; komisiPct: number }> = {};
    for (const ref of referrals) {
      if (ref.kode) {
        referralMap[ref.kode.trim()] = {
          nama: ref.nama_referral,
          komisiPct: ref.komisi_pct,
        };
      }
    }

    // ===== 5. Sort HPP keys by length descending (longest match first) =====
    const keysHPP = Object.keys(configHPP).sort((a, b) => b.length - a.length);

    // ===== 6. Parse date range =====
    const sDate = new Date(startDate + 'T00:00:00.000Z');
    const eDate = new Date(endDate + 'T23:59:59.999Z');

    // ===== 7. Load structured order items (FASE 1) =====
    const { data: orderItemsRaw } = await supabase
      .from('order_items')
      .select('*');
    const allOrderItems = (orderItemsRaw || []) as any[];

    // Group by order_id for fast lookup
    const orderItemsByOrder: Record<string, any[]> = {};
    for (const oi of allOrderItems) {
      if (!orderItemsByOrder[oi.order_id]) {
        orderItemsByOrder[oi.order_id] = [];
      }
      orderItemsByOrder[oi.order_id].push(oi);
    }

    // ===== 8. Process orders =====
    const selesaiOrders = orders
      .filter((o) => o.status === 'Selesai')
      .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    let omsetGrossBulanan = 0;
    let alokasiHPPBulanan = 0;
    let omsetNettBulanan = 0;
    let targetTerpenuhi = 0;
    let totalKomisiBulanan = 0;
    const komisiBreakdown: KomisiBreakdown[] = [];
    const dompet = createEmptyDompet();

    for (const order of selesaiOrders) {
      const oDate = new Date(order.tanggal);
      if (oDate < sDate || oDate > eDate) continue;

      const hargaFinalNota = order.harga;
      const layananText = order.layanan || '';
      let orderGrossTotal = 0;
      let orderQtyTotal = 0;
      const parsedItems: Array<{ gross: number; totalHPP: number; jalur: 'A' | 'B' }> = [];

      // ═══ Try structured order_items first (FASE 1) ═══
      const structuredItems = orderItemsByOrder[order.id];
      if (structuredItems && structuredItems.length > 0) {
        // Use structured data — HPP from configHPP lookup by nama_item
        for (const si of structuredItems) {
          const qty = si.qty || 1;
          const hargaSatuan = si.harga_satuan || 0;
          const grossItem = hargaSatuan * qty;
          orderGrossTotal += grossItem;
          orderQtyTotal += qty;

          // HPP via keyword matching on nama_item (still needed for backward compat)
          const itemName = (si.nama_item || '').toLowerCase();
          let itemHPP = 0;
          let jalur: 'A' | 'B' = 'A';
          let rn = itemName;

          // Remove discount label in brackets for HPP matching
          const cleanForHPP = rn.replace(/\[.*?\]/g, '').trim();
          rn = cleanForHPP;

          for (const keyMatch of keysHPP) {
            if (!rn) break;
            if (rn.includes(keyMatch)) {
              itemHPP += configHPP[keyMatch].hpp;
              if (configHPP[keyMatch].kategori === 'REPAIR') jalur = 'B';
              rn = rn.replace(keyMatch, '').trim();
            }
          }

          parsedItems.push({ gross: grossItem, totalHPP: itemHPP * qty, jalur });
        }
      } else {
        // ═══ Fallback: parse from orders.layanan text (OLD orders) ═══
        const items = layananText.split(/[,;\n]+/);

        // Helper: find original price
        const cariHargaAsli = (namaOrder: string): number => {
          const nama = namaOrder.trim().toLowerCase();
          if (!nama) return 0;
          if (hargaAsliMenu[nama] !== undefined) return hargaAsliMenu[nama];

          const menuKeys = Object.keys(hargaAsliMenu);
          // Forward match
          for (const key of menuKeys) {
            if (key.includes(nama)) return hargaAsliMenu[key];
          }
          // Reverse match
          for (const key of menuKeys) {
            if (nama.includes(key)) return hargaAsliMenu[key];
          }
          return 0;
        };

        // Parse each item from text
        for (const itemStr of items) {
          const cleanStr = itemStr.trim();
          if (!cleanStr) continue;

          // Remove brackets content
          const noBrackets = cleanStr.replace(/[.*?]/g, '').trim();

          // Extract quantity (Nx pattern)
          const qtyMatch = noBrackets.match(/\(?([0-9]+)\s*[xX]\s*\)?/i);
          let qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
          if (qty < 1) qty = 1;

          // Clean name from quantity markers and price annotations
          const remainingName = noBrackets
            .replace(/\(?\s*[0-9]+\s*[xX]\s*\)?/gi, '')
            .replace(/@\s*[Rr][Pp]\s*[0-9.]+/gi, '')
            .replace(/[Rr][Pp]\s*[0-9.]+/gi, '')
            .replace(/[•–—]/g, '')
            .trim()
            .toLowerCase();

          let hargaAsliSatuan = cariHargaAsli(remainingName);

          // If not found, try extracting inline price
          if (hargaAsliSatuan === 0) {
            const prcMatch = cleanStr.match(/[Rr][Pp]\s*([0-9.]+)/i);
            if (prcMatch) {
              hargaAsliSatuan = parseInt(prcMatch[1].replace(/\./g, ''));
            }
          }

          // Auto-detect quantity for single-item orders with price discrepancy
          if (qty === 1 && items.length === 1 && hargaAsliSatuan > 0 && hargaFinalNota > 0) {
            if (hargaFinalNota >= hargaAsliSatuan * 1.4) {
              qty = Math.round(hargaFinalNota / hargaAsliSatuan);
              if (qty < 2) qty = 2;
            }
          }

          const grossItem = hargaAsliSatuan * qty;
          orderGrossTotal += grossItem;
          orderQtyTotal += qty;

          // === HPP matching (longest match first) ===
          let itemHPP = 0;
          let jalur: 'A' | 'B' = 'A';
          let matchedForward = false;
          let rn = remainingName;

          for (const keyMatch of keysHPP) {
            if (!rn) break;
            if (rn.includes(keyMatch)) {
              itemHPP += configHPP[keyMatch].hpp;
              if (configHPP[keyMatch].kategori === 'REPAIR') jalur = 'B';
              rn = rn.replace(keyMatch, '').trim();
              matchedForward = true;
            }
          }

          // Reverse matching
          if (!matchedForward && rn) {
            for (const keyRev of keysHPP) {
              if (keyRev.includes(rn)) {
                itemHPP += configHPP[keyRev].hpp;
                if (configHPP[keyRev].kategori === 'REPAIR') jalur = 'B';
                break;
              }
            }
          }

          parsedItems.push({ gross: grossItem, totalHPP: itemHPP * qty, jalur });
        }

        // === Scan notes (catatan) for repair keywords (OLD orders only) ===
        const catatan = (order.catatan || '').toLowerCase();
        if (catatan) {
          for (const keyRepair of keysHPP) {
            const cfg = configHPP[keyRepair];
            if (cfg && cfg.kategori === 'REPAIR' && catatan.includes(keyRepair)) {
              const alreadyInLayanan = layananText.toLowerCase().includes(keyRepair);
              if (!alreadyInLayanan) {
                let repairQty = 1;
                if (/semua|2 pasang|3 pasang/i.test(catatan)) {
                  repairQty = orderQtyTotal > 0 ? orderQtyTotal : 1;
                }
                parsedItems.push({ gross: 0, totalHPP: cfg.hpp * repairQty, jalur: 'B' });
              }
            }
          }
        }
      }

      // Fallback: if gross couldn't be calculated but we have items, use order total
      if (orderGrossTotal === 0 && parsedItems.length > 0 && hargaFinalNota > 0) {
        orderGrossTotal = hargaFinalNota;
      }
      if (orderGrossTotal === 0) continue;

      // === Referral commission ===
      let komisiOrder = 0;
      const refCode = (order.referral || '').trim();
      if (refCode && referralMap[refCode] && referralMap[refCode].komisiPct > 0) {
        komisiOrder = Math.round(hargaFinalNota * referralMap[refCode].komisiPct / 100);
        totalKomisiBulanan += komisiOrder;
        komisiBreakdown.push({
          orderId: order.kode,
          layanan: order.layanan,
          namaRef: referralMap[refCode].nama,
          kodeRef: refCode,
          komisiPct: referralMap[refCode].komisiPct,
          nominal: komisiOrder,
          tanggal: order.tanggal,
        });
      }

      // === Proportional distribution ===
      const ratio = orderGrossTotal > 0 ? hargaFinalNota / orderGrossTotal : 1;

      for (const pItem of parsedItems) {
        const discountedGross = pItem.gross * ratio;
        let nettItem = discountedGross - pItem.totalHPP;

        // Deduct proportional commission
        if (komisiOrder > 0 && orderGrossTotal > 0) {
          const komisiItem = Math.round(komisiOrder * (pItem.gross / orderGrossTotal));
          nettItem -= komisiItem;
        }

        omsetGrossBulanan += discountedGross;
        alokasiHPPBulanan += pItem.totalHPP;
        omsetNettBulanan += nettItem;

        let porsiKePersenNett = 0;

        if (targetTerpenuhi < targetOmset) {
          if (targetTerpenuhi + nettItem <= targetOmset) {
            targetTerpenuhi += nettItem;
          } else {
            const sisaKeTarget = targetOmset - targetTerpenuhi;
            porsiKePersenNett = nettItem - sisaKeTarget;
            targetTerpenuhi = targetOmset;

            // Distribute base amounts when target is reached (from DB config)
            dompet.ownerBase = configPct['owner']?.baseGaji ?? 50000;
            dompet.cuciBase = configPct['cuci']?.baseGaji ?? 50000;
            dompet.adminBase = configPct['admin']?.baseGaji ?? 50000;
            dompet.webBase = configPct['web']?.baseGaji ?? 50000;
            const totalBase =
              dompet.ownerBase + dompet.cuciBase + dompet.adminBase + dompet.webBase;
            dompet.kasBase = Math.max(0, targetOmset - totalBase);
          }
        } else {
          porsiKePersenNett = nettItem;
        }

        // Percentage-based distribution for above-target profit
        if (porsiKePersenNett !== 0) {
          for (const [peranKey, rateConfig] of Object.entries(configPct)) {
            const rate = pItem.jalur === 'A' ? rateConfig.clean : rateConfig.repair;
            if (rate > 0) {
              const amount = porsiKePersenNett * rate;
              switch (peranKey) {
                case 'owner':
                  dompet.ownerPct += amount;
                  break;
                case 'kas danee':
                case 'kas':
                  dompet.kasPct += amount;
                  break;
                case 'spesialis cuci':
                case 'cuci':
                  dompet.cuciPct += amount;
                  break;
                case 'spesialis repair':
                case 'repair':
                  dompet.repairPct += amount;
                  break;
                case 'admin':
                  dompet.adminPct += amount;
                  break;
                case 'engineer web':
                case 'web':
                  dompet.webPct += amount;
                  break;
                case 'zakat':
                  dompet.zakatPct += amount;
                  break;
                case 'investor':
                  dompet.investorPct += amount;
                  break;
              }
            }
          }
        }
      }
    }

    return {
      success: true,
      data: {
        omsetGross: Math.round(omsetGrossBulanan),
        alokasiHPP: Math.round(alokasiHPPBulanan),
        totalKomisi: Math.round(totalKomisiBulanan),
        omsetNett: Math.round(omsetNettBulanan),
        target: targetOmset,
        dompet,
        komisiBreakdown,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Kesalahan Engine Profit: ${err.message || 'Unknown error'}`,
    };
  }
}

/**
 * Get profit history summary for last 4 months with growth tracking
 */
export async function getProfitHistorySummary(): Promise<ServiceResponse<ProfitHistory[]>> {
  try {
    const now = new Date();
    const namaBulan = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    const tempResults: ProfitHistory[] = [];

    // Fetch last 4 months
    for (let i = 1; i <= 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();

      const res = await getProfitSharingData(month, year);

      tempResults.push({
        bulan: `${namaBulan[d.getMonth()]} ${year}`,
        gross: res.data?.omsetGross || 0,
        hpp: res.data?.alokasiHPP || 0,
        nett: res.data?.omsetNett || 0,
        target: res.data?.target || 0,
      });
    }

    // Calculate growth for last 3 months (compared to previous month)
    const finalResults: ProfitHistory[] = [];
    for (let j = 0; j < 3; j++) {
      const currMonth = { ...tempResults[j] };
      const prevMonth = tempResults[j + 1];

      const growthRp = currMonth.nett - prevMonth.nett;
      let growthPct = 0;

      if (prevMonth.nett !== 0) {
        growthPct = (growthRp / Math.abs(prevMonth.nett)) * 100;
      } else {
        growthPct = growthRp > 0 ? 100 : growthRp < 0 ? -100 : 0;
      }

      currMonth.growthRp = growthRp;
      currMonth.growthPct = growthPct.toFixed(1);

      finalResults.push(currMonth);
    }

    return { success: true, data: finalResults };
  } catch (err: any) {
    return {
      success: false,
      error: `Error Engine Histori: ${err.message || 'Unknown error'}`,
    };
  }
}

/**
 * Create empty dompet structure
 */
function createEmptyDompet(): Dompet {
  return {
    ownerBase: 0,
    ownerPct: 0,
    cuciBase: 0,
    cuciPct: 0,
    repairPct: 0,
    adminBase: 0,
    adminPct: 0,
    webBase: 0,
    webPct: 0,
    kasBase: 0,
    kasPct: 0,
    zakatPct: 0,
    investorPct: 0,
  };
}

/**
 * Read ALL settings_profit rows and return:
 * - roles: { [peran]: { cleanPct, repairPct } }
 * - targetOmset: sum of target_omset across rows
 */
export async function getAllSettingsProfit(): Promise<ServiceResponse<{ roles: Record<string, { cleanPct: number; repairPct: number; baseGaji: number }>; targetOmset: number }>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('settings_profit').select('*');
    if (error) return { success: false, error: error.message };

    const roles: Record<string, { cleanPct: number; repairPct: number; baseGaji: number }> = {};
    let targetOmset = 0;

    for (const row of data || []) {
      if (row.target_omset > 0) targetOmset += row.target_omset;
      if (row.peran) {
        roles[row.peran.trim().toLowerCase()] = {
          cleanPct: row.clean_pct || 0,
          repairPct: row.repair_pct || 0,
          baseGaji: row.base_gaji || 0,
        };
      }
    }

    // Initialize empty for all known roles
    for (const peran of ['owner', 'kas', 'cuci', 'repair', 'admin', 'web', 'zakat', 'investor']) {
      if (!roles[peran]) roles[peran] = { cleanPct: 0, repairPct: 0, baseGaji: 0 };
    }

    return { success: true, data: { roles, targetOmset } };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil settings profit' };
  }
}

/**
 * Save/upsert a single role record in settings_profit
 * Finds matching row by peran value and updates percentages + target_omset
 */
export async function saveSettingsProfitRole(
  peran: string,
  roleName: string,
  cleanPct: number,
  repairPct: number,
  targetOmset: number,
  baseGaji: number = 0
): Promise<ServiceResponse> {
  try {
    const supabase = getSupabase();
    const peranKey = peran.trim().toLowerCase();

    // Find existing row with this peran
    const { data: existing } = await supabase
      .from('settings_profit')
      .select('id')
      .eq('peran', peranKey)
      .maybeSingle();

    const payload = {
      nama_layanan: `role_${peranKey}`,
      hpp: 0,
      kategori: null as string | null,
      role_name: roleName,
      target_omset: peranKey === 'owner' ? targetOmset : 0, // Store target on owner row
      peran: peranKey,
      clean_pct: cleanPct,
      repair_pct: repairPct,
      base_gaji: baseGaji,
    };

    if (existing) {
      const { error } = await supabase
        .from('settings_profit')
        .update(payload)
        .eq('id', existing.id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase
        .from('settings_profit')
        .insert(payload);
      if (error) return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan setting profit' };
  }
}
