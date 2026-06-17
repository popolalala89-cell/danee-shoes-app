// Danee Shoes & Clean — Supabase Type Definitions
// Using snake_case to match SQL schema column names

// ===== Tables =====

export interface MenuJasaRow {
  id: string;
  kode: string;
  nama_layanan: string;
  kategori: 'Cleaning' | 'Repair';
  harga: number;
  harga_promo: number | null;
  status: 'Aktif' | 'Coming Soon' | 'Nonaktif';
  deskripsi: string | null;
  urutan: number;
  created_at: string;
  updated_at: string;
}

export interface MenuStoreRow {
  id: string;
  kode: string;
  nama_produk: string;
  kategori: string | null;
  harga: number;
  harga_promo: number | null;
  stok: number;
  status: 'Aktif' | 'Nonaktif';
  deskripsi: string | null;
  link_foto: string | null;
  link_marketplace: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  kode: string;
  tanggal: string;
  nama_pelanggan: string;
  kontak_wa: string | null;
  layanan: string;
  harga: number;
  status: OrderStatus;
  catatan: string | null;
  diskon_info: string | null;
  referral: string | null;
  tipe_pembayaran: 'Bayar di Awal' | 'Bayar di Akhir';
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | 'Waiting'
  | 'Checking'
  | 'Proses Repair'
  | 'Proses Cleaning'
  | 'Proses Pengeringan'
  | 'Ready'
  | 'Selesai'
  | 'Batal';

export interface StoreSaleRow {
  id: string;
  kode: string;
  tanggal: string;
  nama_pembeli: string | null;
  produk_id: string | null;
  nama_produk: string;
  qty: number;
  harga_satuan: number;
  total: number;
  created_at: string;
}

export interface InventoryStoreRow {
  id: string;
  produk_id: string;
  nama_produk: string;
  stok_sistem: number;
  stok_fisik: number | null;
  selisih: number;
  update_terakhir: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryBahanRow {
  id: string;
  kode: string;
  nama_bahan: string;
  satuan: string;
  stok_sistem: number;
  stok_fisik: number | null;
  selisih: number;
  update_terakhir: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashflowRow {
  id: string;
  kode: string;
  tanggal: string;
  tipe: 'Pemasukan' | 'Pengeluaran';
  kategori: string;
  sumber_id: string | null;
  keterangan: string | null;
  jumlah: number;
  created_at: string;
}

export interface KontenWebRow {
  id: string;
  kode: string;
  kategori: 'Edukasi' | 'Testimoni' | 'Instagram' | 'YouTube';
  keterangan: string;
  isi_konten: string;
  status: 'Aktif' | 'Nonaktif';
  created_at: string;
  updated_at: string;
}

export interface DiskonEventRow {
  id: string;
  kode: string;
  nama_event: string;
  potongan: number;
  tipe: 'Persentase' | 'Nominal';
  status: 'Aktif' | 'Admin Saja' | 'Nonaktif';
  target_layanan: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralRow {
  id: string;
  kode: string;
  nama_referral: string;
  link: string | null;
  total_klik: number;
  total_order: number;
  total_revenue: number;
  status: 'Aktif' | 'Nonaktif';
  dibuat: string;
  komisi_pct: number;
  created_at: string;
  updated_at: string;
}

export interface SettingsProfitRow {
  id: string;
  nama_layanan: string;
  hpp: number;
  kategori: 'CLEAN' | 'REPAIR' | null;
  role_name: string | null;
  target_omset: number;
  peran: string | null;
  clean_pct: number;
  repair_pct: number;
  created_at: string;
  updated_at: string;
}

export interface SettingsRow {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

// ===== Payload Types (for create/update) =====

export interface MenuJasaCreate {
  nama_layanan: string;
  kategori: 'Cleaning' | 'Repair';
  harga: number;
  harga_promo?: number | null;
  status?: 'Aktif' | 'Coming Soon' | 'Nonaktif';
  deskripsi?: string | null;
  urutan?: number;
}

export interface MenuJasaUpdate {
  nama_layanan?: string;
  kategori?: 'Cleaning' | 'Repair';
  harga?: number;
  harga_promo?: number | null;
  status?: 'Aktif' | 'Coming Soon' | 'Nonaktif';
  deskripsi?: string | null;
  urutan?: number;
}

export interface MenuStoreCreate {
  nama_produk: string;
  kategori?: string | null;
  harga: number;
  harga_promo?: number | null;
  stok?: number;
  status?: 'Aktif' | 'Nonaktif';
  deskripsi?: string | null;
  link_foto?: string | null;
  link_marketplace?: string | null;
}

export interface MenuStoreUpdate {
  nama_produk?: string;
  kategori?: string | null;
  harga?: number;
  harga_promo?: number | null;
  stok?: number;
  status?: 'Aktif' | 'Nonaktif';
  deskripsi?: string | null;
  link_foto?: string | null;
  link_marketplace?: string | null;
}

export interface OrderCreate {
  nama_pelanggan: string;
  kontak_wa?: string | null;
  layanan: string;
  harga: number;
  catatan?: string | null;
  diskon_info?: string | null;
  referral?: string | null;
  tipe_pembayaran?: 'Bayar di Awal' | 'Bayar di Akhir';
}

export interface OrderUpdate {
  nama_pelanggan?: string;
  kontak_wa?: string | null;
  layanan?: string;
  harga?: number;
  catatan?: string | null;
  diskon_info?: string | null;
  referral?: string | null;
  tipe_pembayaran?: 'Bayar di Awal' | 'Bayar di Akhir';
}

export interface StoreSaleCreate {
  nama_pembeli?: string | null;
  produk_id: string;
  nama_produk: string;
  qty: number;
  harga_satuan: number;
  total?: number;
}

export interface CashflowCreate {
  tipe: 'Pemasukan' | 'Pengeluaran';
  kategori: string;
  sumber_id?: string | null;
  keterangan?: string | null;
  jumlah: number;
}

export interface KontenWebCreate {
  kategori: 'Edukasi' | 'Testimoni' | 'Instagram' | 'YouTube';
  keterangan: string;
  isi_konten: string;
  status?: 'Aktif' | 'Nonaktif';
}

export interface KontenWebUpdate {
  kategori?: 'Edukasi' | 'Testimoni' | 'Instagram' | 'YouTube';
  keterangan?: string;
  isi_konten?: string;
  status?: 'Aktif' | 'Nonaktif';
}

export interface DiskonEventCreate {
  nama_event: string;
  potongan: number;
  tipe: 'Persentase' | 'Nominal';
  status?: 'Aktif' | 'Admin Saja' | 'Nonaktif';
  target_layanan?: string | null;
}

export interface DiskonEventUpdate {
  nama_event?: string;
  potongan?: number;
  tipe?: 'Persentase' | 'Nominal';
  status?: 'Aktif' | 'Admin Saja' | 'Nonaktif';
  target_layanan?: string | null;
}

export interface ReferralCreate {
  nama_referral: string;
  komisi_pct: number;
  status?: 'Aktif' | 'Nonaktif';
}

export interface ReferralUpdate {
  nama_referral?: string;
  komisi_pct?: number;
  status?: 'Aktif' | 'Nonaktif';
}

// ===== Dashboard / Profit Sharing =====

export interface DashboardSummary {
  todayIncome: number;
  activeOrders: number;
  activeOrdersList?: OrderRow[];
  lowStock: InventoryStoreRow[];
  topLayanan: { nama: string; total: number }[];
  topProduk: { nama: string; total: number }[];
}

export interface Dompet {
  ownerBase: number;
  ownerPct: number;
  cuciBase: number;
  cuciPct: number;
  repairPct: number;
  adminBase: number;
  adminPct: number;
  webBase: number;
  webPct: number;
  kasBase: number;
  kasPct: number;
  zakatPct: number;
  investorPct: number;
}

export interface KomisiBreakdown {
  orderId: string;
  layanan: string;
  namaRef: string;
  kodeRef: string;
  komisiPct: number;
  nominal: number;
  tanggal: string;
}

export interface ProfitSharingData {
  omsetGross: number;
  alokasiHPP: number;
  totalKomisi: number;
  omsetNett: number;
  target: number;
  dompet: Dompet;
  komisiBreakdown: KomisiBreakdown[];
}

export interface ProfitHistory {
  bulan: string;
  gross: number;
  hpp: number;
  nett: number;
  target: number;
  growthRp?: number;
  growthPct?: string;
}

export interface ThemeSettings {
  primary: string;
  hover: string;
}

// ===== Service Response =====

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
