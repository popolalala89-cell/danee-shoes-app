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
  ProfitSnapshotRow,
  AuditOrderDetail,
  AuditOrderItem,
  LaporanLabaRugi,
  LaporanPendapatan,
  LaporanBiaya,
  LaporanDistribusiRole,
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

// ===== FASE 3: Snapshot helpers =====

/**
 * Load profit snapshot for a given month/year
 * Returns null if no snapshot exists yet
 */
async function loadProfitSnapshot(
  bulan: number,
  tahun: number
): Promise<ProfitSharingData | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profit_snapshot')
      .select('*')
      .eq('bulan', bulan)
      .eq('tahun', tahun)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as unknown as ProfitSnapshotRow;

    return {
      omsetGross: row.omset_gross,
      alokasiHPP: row.alokasi_hpp,
      totalKomisi: row.total_komisi,
      omsetNett: row.omset_nett,
      target: row.target_omset,
      dompet: row.dompet,
      komisiBreakdown: row.komisi_breakdown,
    };
  } catch {
    return null;
  }
}

/**
 * Save/upsert profit snapshot for a given month/year
 */
async function saveProfitSnapshot(
  bulan: number,
  tahun: number,
  data: ProfitSharingData
): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('profit_snapshot').upsert(
      {
        bulan,
        tahun,
        omset_gross: data.omsetGross,
        alokasi_hpp: data.alokasiHPP,
        total_komisi: data.totalKomisi,
        omset_nett: data.omsetNett,
        target_omset: data.target,
        dompet: data.dompet as any,
        komisi_breakdown: data.komisiBreakdown as any,
        terakhir_update: new Date().toISOString(),
      },
      { onConflict: 'bulan, tahun' }
    );
  } catch {
    // Silent — snapshot is optional, calculation result already returned
  }
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
  year?: number,
  forceRecalculate: boolean = false
): Promise<ServiceResponse<ProfitSharingData>> {
  try {
    const supabase = getSupabase();
    const { startDate, endDate, month: m, year: y } = getMonthRange(month, year);

    // ═══ FASE 3: Check snapshot first (unless force recalculate) ═══
    const bulanNum = m + 1;
    if (!forceRecalculate) {
      const snapshot = await loadProfitSnapshot(bulanNum, y);
      if (snapshot) {
        return { success: true, data: snapshot };
      }
    }

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

    // Build HPP lookup maps for store products (harga_beli)
    const hargaBeliProdukById: Record<string, number> = {};
    const hargaBeliProdukByName: Record<string, number> = {};
    for (const p of menuStore) {
      const hb = (p as any).harga_beli || 0;
      if (hb > 0) {
        hargaBeliProdukById[p.id] = hb;
        if (p.nama_produk) hargaBeliProdukByName[p.nama_produk.trim().toLowerCase()] = hb;
      }
    }

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
    const configPct: Record<string, { persen: number; baseGaji: number }> = {};

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
          configPct[peran] = { persen: 0, baseGaji: 0 };
        }
        configPct[peran].persen = parsePercent(row.persen);
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

          // Produk: jika tidak ada HPP dari keyword match, pakai harga_beli dari menu_store
          if (itemHPP === 0 && (si.tipe === 'produk' || si.store_id)) {
            const hb = si.store_id ? hargaBeliProdukById[si.store_id] : 0;
            if (hb > 0) itemHPP = hb;
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

          // Produk fallback: jika tidak ada HPP dari keyword match, pakai harga_beli dari menu_store
          if (itemHPP === 0) {
            const hb = hargaBeliProdukByName[remainingName] || 0;
            if (hb > 0) itemHPP = hb;
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
            dompet.spesialisBase = configPct['spesialis']?.baseGaji ?? 50000;
            dompet.adminBase = configPct['admin']?.baseGaji ?? 50000;
            dompet.webBase = configPct['web']?.baseGaji ?? 50000;
            const totalBase =
              dompet.ownerBase + dompet.spesialisBase + dompet.adminBase + dompet.webBase;
            dompet.kasBase = Math.max(0, targetOmset - totalBase);
          }
        } else {
          porsiKePersenNett = nettItem;
        }

        // Percentage-based distribution for above-target profit
        if (porsiKePersenNett !== 0) {
          for (const [peranKey, rateConfig] of Object.entries(configPct)) {
            const rate = rateConfig.persen;
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
                case 'spesialis repair':
                case 'repair':
                  dompet.spesialisPct += amount;
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

    // ═══ Laba Ditahan = sisa laba dari target yang belum terdistribusi ═══
    const totalBaseTerpakai =
      dompet.ownerBase + dompet.spesialisBase + dompet.adminBase + dompet.webBase + dompet.kasBase;
    dompet.labaDitahan = Math.max(0, targetTerpenuhi - totalBaseTerpakai);

    const result: ProfitSharingData = {
      omsetGross: Math.round(omsetGrossBulanan),
      alokasiHPP: Math.round(alokasiHPPBulanan),
      totalKomisi: Math.round(totalKomisiBulanan),
      omsetNett: Math.round(omsetNettBulanan),
      target: targetOmset,
      dompet,
      komisiBreakdown,
    };

    // ═══ FASE 3: Save snapshot for future loads ═══
    await saveProfitSnapshot(bulanNum, y, result);

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Kesalahan Engine Profit: ${err.message || 'Unknown error'}`,
    };
  }
}

/**
 * Get per-order audit details for a given month/year (FASE 4)
 * Shows each order's gross, HPP, komisi, nett, and item-level breakdown
 */
export async function getAuditOrderDetails(
  month?: number,
  year?: number
): Promise<ServiceResponse<AuditOrderDetail[]>> {
  try {
    const supabase = getSupabase();
    const { startDate, endDate, month: m, year: y } = getMonthRange(month, year);

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
      return { success: true, data: [] };
    }

    // ===== 2. Parse config (same as engine) =====
    const configHPP: Record<string, { hpp: number; kategori: string }> = {};
    for (const row of settingsProfit) {
      const keyLayanan = row.nama_layanan.trim().toLowerCase();
      if (keyLayanan) {
        configHPP[keyLayanan] = { hpp: row.hpp, kategori: (row.kategori || '').toUpperCase() };
      }
    }

    const hargaAsliMenu: Record<string, number> = {};
    for (const item of menuJasa) {
      if (item.nama_layanan) hargaAsliMenu[item.nama_layanan.trim().toLowerCase()] = item.harga;
    }
    for (const item of menuStore) {
      if (item.nama_produk) hargaAsliMenu[item.nama_produk.trim().toLowerCase()] = item.harga;
    }

    const referralMap: Record<string, { nama: string; komisiPct: number }> = {};
    for (const ref of referrals) {
      if (ref.kode) {
        referralMap[ref.kode.trim()] = {
          nama: ref.nama_referral,
          komisiPct: ref.komisi_pct,
        };
      }
    }

    const keysHPP = Object.keys(configHPP).sort((a, b) => b.length - a.length);

    // ===== 3. Load order items =====
    const { data: orderItemsRaw } = await supabase
      .from('order_items')
      .select('*');
    const allOrderItems = (orderItemsRaw || []) as any[];
    const orderItemsByOrder: Record<string, any[]> = {};
    for (const oi of allOrderItems) {
      if (!orderItemsByOrder[oi.order_id]) orderItemsByOrder[oi.order_id] = [];
      orderItemsByOrder[oi.order_id].push(oi);
    }

    // ===== 4. Process each order =====
    const sDate = new Date(startDate + 'T00:00:00.000Z');
    const eDate = new Date(endDate + 'T23:59:59.999Z');

    const selesaiOrders = orders
      .filter((o) => o.status === 'Selesai')
      .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    const auditResults: AuditOrderDetail[] = [];

    for (const order of selesaiOrders) {
      const oDate = new Date(order.tanggal);
      if (oDate < sDate || oDate > eDate) continue;

      const hargaFinalNota = order.harga;
      const layananText = order.layanan || '';
      let orderGrossTotal = 0;
      let orderQtyTotal = 0;
      const auditItems: AuditOrderItem[] = [];

      // Try structured order_items first
      const structuredItems = orderItemsByOrder[order.id];
      if (structuredItems && structuredItems.length > 0) {
        for (const si of structuredItems) {
          const qty = si.qty || 1;
          const hargaSatuan = si.harga_satuan || 0;
          const grossItem = hargaSatuan * qty;
          orderGrossTotal += grossItem;
          orderQtyTotal += qty;

          const itemName = (si.nama_item || '').toLowerCase();
          let itemHPP = 0;
          let jalur: 'A' | 'B' = 'A';
          let rn = itemName.replace(/\[.*?\]/g, '').trim();

          for (const keyMatch of keysHPP) {
            if (!rn) break;
            if (rn.includes(keyMatch)) {
              itemHPP += configHPP[keyMatch].hpp;
              if (configHPP[keyMatch].kategori === 'REPAIR') jalur = 'B';
              rn = rn.replace(keyMatch, '').trim();
            }
          }

          auditItems.push({
            nama: si.nama_item || '',
            qty,
            hargaSatuan,
            gross: grossItem,
            hpp: itemHPP * qty,
            jalur,
          });
        }
      } else {
        // Fallback parse from layanan text
        const items = layananText.split(/[,;\n]+/);

        const cariHargaAsli = (namaOrder: string): number => {
          const nama = namaOrder.trim().toLowerCase();
          if (!nama) return 0;
          if (hargaAsliMenu[nama] !== undefined) return hargaAsliMenu[nama];
          for (const key of Object.keys(hargaAsliMenu)) {
            if (key.includes(nama)) return hargaAsliMenu[key];
          }
          for (const key of Object.keys(hargaAsliMenu)) {
            if (nama.includes(key)) return hargaAsliMenu[key];
          }
          return 0;
        };

        for (const itemStr of items) {
          const cleanStr = itemStr.trim();
          if (!cleanStr) continue;

          const noBrackets = cleanStr.replace(/[.*?]/g, '').trim();
          const qtyMatch = noBrackets.match(/\(?([0-9]+)\s*[xX]\s*\)?/i);
          let qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
          if (qty < 1) qty = 1;

          const remainingName = noBrackets
            .replace(/\(?\s*[0-9]+\s*[xX]\s*\)?/gi, '')
            .replace(/@\s*[Rr][Pp]\s*[0-9.]+/gi, '')
            .replace(/[Rr][Pp]\s*[0-9.]+/gi, '')
            .replace(/[•–—]/g, '')
            .trim()
            .toLowerCase();

          let hargaAsliSatuan = cariHargaAsli(remainingName);
          if (hargaAsliSatuan === 0) {
            const prcMatch = cleanStr.match(/[Rr][Pp]\s*([0-9.]+)/i);
            if (prcMatch) hargaAsliSatuan = parseInt(prcMatch[1].replace(/\./g, ''));
          }

          if (qty === 1 && items.length === 1 && hargaAsliSatuan > 0 && hargaFinalNota > 0) {
            if (hargaFinalNota >= hargaAsliSatuan * 1.4) {
              qty = Math.round(hargaFinalNota / hargaAsliSatuan);
              if (qty < 2) qty = 2;
            }
          }

          const grossItem = hargaAsliSatuan * qty;
          orderGrossTotal += grossItem;
          orderQtyTotal += qty;

          let itemHPP = 0;
          let jalur: 'A' | 'B' = 'A';
          let rn = remainingName;

          for (const keyMatch of keysHPP) {
            if (!rn) break;
            if (rn.includes(keyMatch)) {
              itemHPP += configHPP[keyMatch].hpp;
              if (configHPP[keyMatch].kategori === 'REPAIR') jalur = 'B';
              rn = rn.replace(keyMatch, '').trim();
            }
          }

          if (itemHPP === 0 && rn) {
            for (const keyRev of keysHPP) {
              if (keyRev.includes(rn)) {
                itemHPP += configHPP[keyRev].hpp;
                if (configHPP[keyRev].kategori === 'REPAIR') jalur = 'B';
                break;
              }
            }
          }

          auditItems.push({
            nama: remainingName || cleanStr,
            qty,
            hargaSatuan: hargaAsliSatuan,
            gross: grossItem,
            hpp: itemHPP * qty,
            jalur,
          });
        }

        // Scan notes for repair keywords
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
                auditItems.push({
                  nama: `[catatan] ${keyRepair}`,
                  qty: repairQty,
                  hargaSatuan: 0,
                  gross: 0,
                  hpp: cfg.hpp * repairQty,
                  jalur: 'B',
                });
              }
            }
          }
        }
      }

      // Fallback gross
      if (orderGrossTotal === 0 && auditItems.length > 0 && hargaFinalNota > 0) {
        orderGrossTotal = hargaFinalNota;
      }
      if (orderGrossTotal === 0) continue;

      // Referral commission
      let komisiOrder = 0;
      const refCode = (order.referral || '').trim();
      if (refCode && referralMap[refCode] && referralMap[refCode].komisiPct > 0) {
        komisiOrder = Math.round(hargaFinalNota * referralMap[refCode].komisiPct / 100);
      }

      // Calculate per-order totals
      const totalHPP = auditItems.reduce((sum, i) => sum + i.hpp, 0);
      const ratio = orderGrossTotal > 0 ? hargaFinalNota / orderGrossTotal : 1;
      const grossAfterDiscount = Math.round(orderGrossTotal * ratio);
      const nett = grossAfterDiscount - totalHPP - komisiOrder;
      const selisih = Math.abs(grossAfterDiscount - totalHPP - komisiOrder - nett);

      auditResults.push({
        kode: order.kode || order.id,
        tanggal: order.tanggal,
        layanan: layananText || '-',
        gross: grossAfterDiscount,
        alokasiHPP: totalHPP,
        komisi: komisiOrder,
        nett,
        items: auditItems,
        status: selisih <= 2 ? 'SINKRON' : 'SELISIH',
        selisih,
      });
    }

    return { success: true, data: auditResults };
  } catch (err: any) {
    return {
      success: false,
      error: `Gagal memuat audit detail: ${err.message || 'Unknown error'}`,
    };
  }
}

/**
 * FASE 5: Get full P&L (Laba Rugi) report for a given month/year
 * Categorizes revenue by Cleaning / Repair / Store
 * Categorizes HPP by Cleaning / Repair
 * Shows distribution breakdown with balance verification
 */
export async function getLaporanLabaRugi(
  month?: number,
  year?: number
): Promise<ServiceResponse<LaporanLabaRugi>> {
  try {
    const supabase = getSupabase();
    const { startDate, endDate, month: m, year: y } = getMonthRange(month, year);
    const bulanNum = m + 1;

    const namaBulan = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const periode = `${namaBulan[m]} ${y}`;

    // ===== 1. Fetch all reference data =====
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

    // ===== 2. Parse config =====
    const configHPP: Record<string, { hpp: number; kategori: string }> = {};
    for (const row of settingsProfit) {
      const key = row.nama_layanan.trim().toLowerCase();
      if (key) configHPP[key] = { hpp: row.hpp, kategori: (row.kategori || '').toUpperCase() };
    }
    const keysHPP = Object.keys(configHPP).sort((a, b) => b.length - a.length);

    // Build price lookup from menu_jasa
    const skipHargaMenu: Record<string, number> = {};
    for (const item of menuJasa) {
      if (item.nama_layanan) skipHargaMenu[item.nama_layanan.trim().toLowerCase()] = item.harga;
    }
    // Track which menu items are store products
    const storeNames: Set<string> = new Set();
    for (const item of menuStore) {
      if (item.nama_produk) storeNames.add(item.nama_produk.trim().toLowerCase());
    }

    // Build HPP lookup maps for store products (harga_beli)
    const hargaBeliProdukById: Record<string, number> = {};
    const hargaBeliProdukByName: Record<string, number> = {};
    for (const p of menuStore) {
      const hb = (p as any).harga_beli || 0;
      if (hb > 0) {
        hargaBeliProdukById[p.id] = hb;
        if (p.nama_produk) hargaBeliProdukByName[p.nama_produk.trim().toLowerCase()] = hb;
      }
    }

    // ===== 3. Referral map =====
    const referralMap: Record<string, { komisiPct: number }> = {};
    for (const ref of referrals) {
      if (ref.kode) referralMap[ref.kode.trim()] = { komisiPct: ref.komisi_pct };
    }

    // ===== 4. Load order_items =====
    const { data: orderItemsRaw } = await supabase
      .from('order_items')
      .select('*');
    const orderItemsByOrder: Record<string, any[]> = {};
    for (const oi of (orderItemsRaw || []) as any[]) {
      if (!orderItemsByOrder[oi.order_id]) orderItemsByOrder[oi.order_id] = [];
      orderItemsByOrder[oi.order_id].push(oi);
    }

    // ===== 5. Categorize and sum =====
    const sDate = new Date(startDate + 'T00:00:00.000Z');
    const eDate = new Date(endDate + 'T23:59:59.999Z');

    const selesaiOrders = orders
      .filter((o) => o.status === 'Selesai')
      .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    let pendapatanCleaning = 0;
    let pendapatanRepair = 0;
    let pendapatanProduk = 0;
    let hppCleaning = 0;
    let hppRepair = 0;
    let hppProduk = 0;
    let totalKomisi = 0;

    for (const order of selesaiOrders) {
      const oDate = new Date(order.tanggal);
      if (oDate < sDate || oDate > eDate) continue;

      const hargaFinalNota = order.harga;
      const layananText = order.layanan || '';
      let orderGrossTotal = 0;
      let orderQtyTotal = 0;

      // Track per-item categories for this order
      const itemCategories: { gross: number; category: 'cleaning' | 'repair' | 'produk'; hpp: number }[] = [];

      // Try structured items first
      const structuredItems = orderItemsByOrder[order.id];
      if (structuredItems && structuredItems.length > 0) {
        for (const si of structuredItems) {
          const qty = si.qty || 1;
          const hargaSatuan = si.harga_satuan || 0;
          const grossItem = hargaSatuan * qty;
          orderGrossTotal += grossItem;
          orderQtyTotal += qty;

          const itemName = (si.nama_item || '').toLowerCase();
          const tipe = (si.tipe || '').toLowerCase();

          // Determine category from tipe field or name lookup
          let category: 'cleaning' | 'repair' | 'produk' = 'cleaning';
          if (tipe === 'produk' || storeNames.has(itemName)) {
            category = 'produk';
          } else {
            // Check if name matches repair HPP
            for (const key of keysHPP) {
              if (itemName.includes(key) && configHPP[key]?.kategori === 'REPAIR') {
                category = 'repair';
                break;
              }
            }
          }

          // Calculate item HPP
          let itemHPP = 0;
          let rn = itemName.replace(/\[.*?\]/g, '').trim();
          for (const keyMatch of keysHPP) {
            if (!rn) break;
            if (rn.includes(keyMatch)) {
              itemHPP += configHPP[keyMatch].hpp * qty;
              rn = rn.replace(keyMatch, '').trim();
            }
          }

          // Produk: jika tidak ada HPP dari keyword match, pakai harga_beli dari menu_store
          if (itemHPP === 0 && category === 'produk') {
            const hb = si.store_id ? hargaBeliProdukById[si.store_id] : hargaBeliProdukByName[itemName] || 0;
            if (hb > 0) itemHPP = hb * qty;
          }

          itemCategories.push({ gross: grossItem, category, hpp: itemHPP });
        }
      } else {
        // Fallback: parse from layanan text
        const items = layananText.split(/[,;\n]+/);

        for (const itemStr of items) {
          const cleanStr = itemStr.trim();
          if (!cleanStr) continue;

          const qtyMatch = cleanStr.match(/\(?([0-9]+)\s*[xX]\s*\)?/i);
          let qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
          if (qty < 1) qty = 1;

          const noBrackets = cleanStr.replace(/[.*?]/g, '').trim();
          const remainingName = noBrackets
            .replace(/\(?\s*[0-9]+\s*[xX]\s*\)?/gi, '')
            .replace(/@\s*[Rr][Pp]\s*[0-9.]+/gi, '')
            .replace(/[Rr][Pp]\s*[0-9.]+/gi, '')
            .replace(/[•–—]/g, '')
            .trim()
            .toLowerCase();

          if (!remainingName) continue;

          // Get price
          let hargaSatuan = skipHargaMenu[remainingName] || 0;
          if (hargaSatuan === 0) {
            const prcMatch = cleanStr.match(/[Rr][Pp]\s*([0-9.]+)/i);
            if (prcMatch) hargaSatuan = parseInt(prcMatch[1].replace(/\./g, ''));
          }

          if (qty === 1 && items.length === 1 && hargaSatuan > 0 && hargaFinalNota > 0) {
            if (hargaFinalNota >= hargaSatuan * 1.4) {
              qty = Math.round(hargaFinalNota / hargaSatuan);
              if (qty < 2) qty = 2;
            }
          }

          const grossItem = hargaSatuan * qty;
          orderGrossTotal += grossItem;
          orderQtyTotal += qty;

          // Determine category
          let category: 'cleaning' | 'repair' | 'produk' = 'cleaning';
          if (storeNames.has(remainingName)) {
            category = 'produk';
          } else {
            for (const key of keysHPP) {
              if (remainingName.includes(key) && configHPP[key]?.kategori === 'REPAIR') {
                category = 'repair';
                break;
              }
            }
          }

          // HPP
          let itemHPP = 0;
          let rn = remainingName;
          for (const keyMatch of keysHPP) {
            if (!rn) break;
            if (rn.includes(keyMatch)) {
              itemHPP += configHPP[keyMatch].hpp * qty;
              rn = rn.replace(keyMatch, '').trim();
            }
          }

          // Reverse match fallback
          if (itemHPP === 0 && rn) {
            for (const keyRev of keysHPP) {
              if (keyRev.includes(rn)) {
                itemHPP += configHPP[keyRev].hpp * qty;
                break;
              }
            }
          }

          // Produk fallback: jika masih 0 dan nama cocok dengan produk store, pakai harga_beli
          if (itemHPP === 0 && category === 'produk') {
            const hb = hargaBeliProdukByName[remainingName] || 0;
            if (hb > 0) itemHPP = hb * qty;
          }

          itemCategories.push({ gross: grossItem, category, hpp: itemHPP });
        }

        // Scan notes for repair HPP
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
                itemCategories.push({
                  gross: 0,
                  category: 'repair',
                  hpp: cfg.hpp * repairQty,
                });
              }
            }
          }
        }
      }

      if (orderGrossTotal === 0 && itemCategories.length > 0 && hargaFinalNota > 0) {
        orderGrossTotal = hargaFinalNota;
      }
      if (orderGrossTotal === 0) continue;

      // Proportional allocation for discount
      const ratio = orderGrossTotal > 0 ? hargaFinalNota / orderGrossTotal : 1;

      // Referral commission
      const refCode = (order.referral || '').trim();
      let komisiOrder = 0;
      if (refCode && referralMap[refCode] && referralMap[refCode].komisiPct > 0) {
        komisiOrder = Math.round(hargaFinalNota * referralMap[refCode].komisiPct / 100);
        totalKomisi += komisiOrder;
      }

      for (const ic of itemCategories) {
        const discountedGross = Math.round(ic.gross * ratio);
        switch (ic.category) {
          case 'cleaning':
            pendapatanCleaning += discountedGross;
            hppCleaning += ic.hpp;
            break;
          case 'repair':
            pendapatanRepair += discountedGross;
            hppRepair += ic.hpp;
            break;
          case 'produk':
            pendapatanProduk += discountedGross;
            hppProduk += ic.hpp;
            break;
        }
      }
    }

    // ===== 6. Get distribution from existing snapshot/engine =====
    const distRes = await getProfitSharingData(bulanNum, y, false);
    const target = distRes.data?.target || 0;
    const omsetNett = distRes.data?.omsetNett || 0;
    const modePersen = omsetNett >= target;

    // Build distribution array
    const WALLET_MAP: { role: string; baseKey: string | null; pctKey: string | null }[] = [
      { role: 'Owner', baseKey: 'ownerBase', pctKey: 'ownerPct' },
      { role: 'Kas (Operasional)', baseKey: 'kasBase', pctKey: 'kasPct' },
      { role: 'Spesialis', baseKey: 'spesialisBase', pctKey: 'spesialisPct' },
      { role: 'Admin (Marketing)', baseKey: 'adminBase', pctKey: 'adminPct' },
      { role: 'Engineer Web', baseKey: 'webBase', pctKey: 'webPct' },
      { role: 'Zakat (2.5%)', baseKey: null, pctKey: 'zakatPct' },
      { role: 'Investor', baseKey: null, pctKey: 'investorPct' },
      { role: 'Laba Ditahan', baseKey: 'labaDitahan', pctKey: null },
    ];

    const dompet = distRes.data?.dompet || {} as Dompet;
    const distribusi: LaporanDistribusiRole[] = WALLET_MAP.map((w) => {
      const base = w.baseKey ? (dompet as any)[w.baseKey] || 0 : 0;
      const pct = w.pctKey ? (dompet as any)[w.pctKey] || 0 : 0;
      return { role: w.role, base, pct, total: base + pct };
    });

    const totalDistribusi = distribusi.reduce((s, d) => s + d.total, 0);
    const totalPendapatan = pendapatanCleaning + pendapatanRepair + pendapatanProduk;
    const totalBiaya = hppCleaning + hppRepair + hppProduk + totalKomisi;
    const labaBersih = totalPendapatan - totalBiaya;

    const laporan: LaporanLabaRugi = {
      periode,
      pendapatan: {
        cleaning: Math.round(pendapatanCleaning),
        repair: Math.round(pendapatanRepair),
        produk: Math.round(pendapatanProduk),
        total: Math.round(totalPendapatan),
      },
      biaya: {
        hppCleaning: Math.round(hppCleaning),
        hppRepair: Math.round(hppRepair),
        hppProduk: Math.round(hppProduk),
        komisiReferral: Math.round(totalKomisi),
        total: Math.round(totalBiaya),
      },
      labaBersih: Math.round(labaBersih),
      distribusi,
      totalDistribusi: Math.round(totalDistribusi),
      balance: Math.abs(labaBersih - totalDistribusi) <= 2,
      target,
      modePersen,
    };

    return { success: true, data: laporan };
  } catch (err: any) {
    return {
      success: false,
      error: `Gagal memuat laporan laba rugi: ${err.message || 'Unknown error'}`,
    };
  }
}

/**
 * Get profit history summary for last 4 months with growth tracking
 * Reads from profit_snapshot table (FASE 3)
 */
export async function getProfitHistorySummary(): Promise<ServiceResponse<ProfitHistory[]>> {
  try {
    const supabase = getSupabase();
    const namaBulan = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    // Read all snapshots ordered by year/month descending
    const { data: snapshots, error } = await supabase
      .from('profit_snapshot')
      .select('*')
      .order('tahun', { ascending: false })
      .order('bulan', { ascending: false })
      .limit(6); // Get up to 6 to ensure we have enough for growth calc

    if (error) {
      // Fallback: recalculate via engine
      return getProfitHistorySummaryLegacy();
    }

    if (!snapshots || snapshots.length === 0) {
      return getProfitHistorySummaryLegacy();
    }

    const rows = snapshots as unknown as ProfitSnapshotRow[];

    // Build temp results
    const tempResults: ProfitHistory[] = rows.map((r) => ({
      bulan: `${namaBulan[r.bulan - 1]} ${r.tahun}`,
      gross: r.omset_gross,
      hpp: r.alokasi_hpp,
      nett: r.omset_nett,
      target: r.target_omset,
    }));

    // Take top 4
    const top4 = tempResults.slice(0, 4);

    // Calculate growth between consecutive months (current vs next in array = previous chronologically)
    const finalResults: ProfitHistory[] = [];
    for (let j = 0; j < top4.length - 1; j++) {
      const currMonth = { ...top4[j] };
      const nextMonth = top4[j + 1]; // next in desc order = previous month

      const growthRp = currMonth.nett - nextMonth.nett;
      let growthPct = 0;

      if (nextMonth.nett !== 0) {
        growthPct = (growthRp / Math.abs(nextMonth.nett)) * 100;
      } else {
        growthPct = growthRp > 0 ? 100 : growthRp < 0 ? -100 : 0;
      }

      currMonth.growthRp = growthRp;
      currMonth.growthPct = growthPct.toFixed(1);
      finalResults.push(currMonth);
    }

    // Last entry has no comparison
    if (top4.length > 0) {
      finalResults.push(top4[top4.length - 1]);
    }

    return { success: true, data: finalResults };
  } catch {
    // Fallback on any error
    return getProfitHistorySummaryLegacy();
  }
}

/**
 * Legacy fallback: recalculate profit history by running the engine for each month
 */
async function getProfitHistorySummaryLegacy(): Promise<ServiceResponse<ProfitHistory[]>> {
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

      const res = await getProfitSharingData(month, year, false); // false = don't force recalc, use snapshot if exists

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
    spesialisBase: 0,
    spesialisPct: 0,
    adminBase: 0,
    adminPct: 0,
    webBase: 0,
    webPct: 0,
    kasBase: 0,
    kasPct: 0,
    zakatPct: 0,
    investorPct: 0,
    labaDitahan: 0,
  };
}

/**
 * Read ALL settings_profit rows and return:
 * - roles: { [peran]: { persen, baseGaji } }
 * - targetOmset: sum of target_omset across rows
 */
export async function getAllSettingsProfit(): Promise<ServiceResponse<{ roles: Record<string, { persen: number; baseGaji: number }>; targetOmset: number }>> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('settings_profit').select('*');
    if (error) return { success: false, error: error.message };

    const roles: Record<string, { persen: number; baseGaji: number }> = {};
    let targetOmset = 0;

    for (const row of data || []) {
      if (row.target_omset > 0) targetOmset += row.target_omset;
      if (row.peran) {
        roles[row.peran.trim().toLowerCase()] = {
          persen: row.persen || 0,
          baseGaji: row.base_gaji || 0,
        };
      }
    }

    // Initialize empty for all known roles
    for (const peran of ['owner', 'kas', 'spesialis', 'admin', 'web', 'zakat', 'investor']) {
      if (!roles[peran]) roles[peran] = { persen: 0, baseGaji: 0 };
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
  persen: number,
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
      persen: persen,
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
