// Danee Shoes Care — Type Definitions
// Matching GAS backend exactly

export interface MenuJasa {
  ID: string;
  NamaLayanan: string;
  Kategori: string;
  Harga: number;
  HargaPromo?: number | string;
  Status: string;
  Deskripsi: string;
  Urutan: number;
  [key: string]: any;
}

export interface MenuStore {
  ID: string;
  NamaProduk: string;
  Kategori: string;
  Harga: number;
  Stok: number;
  Status: string;
  Deskripsi: string;
  LinkFoto: string;
  LinkMarketplace: string;
  [key: string]: any;
}

export interface Order {
  OrderID: string;
  Tanggal: string;
  NamaPelanggan: string;
  KontakWA: string;
  Layanan: string;
  Harga: number;
  Status: string;
  Catatan: string;
  DiskonInfo: string;
  Referral: string;
  TipePembayaran: string;
  [key: string]: any;
}

export interface StoreSale {
  ID: string;
  Tanggal: string;
  NamaPembeli: string;
  ProdukID: string;
  NamaProduk: string;
  Qty: number;
  HargaSatuan: number;
  Total: number;
  [key: string]: any;
}

export interface InventoryItem {
  ProdukID: string;
  NamaProduk: string;
  StokSistem: number;
  StokFisik?: number;
  Selisih?: number;
  Update?: string;
  [key: string]: any;
}

export interface BahanItem {
  BahanID: string;
  NamaBahan: string;
  Satuan: string;
  StokSistem: number;
  StokFisik?: number;
  Selisih?: number;
  Update?: string;
  [key: string]: any;
}

export interface Cashflow {
  ID: string;
  Tanggal: string;
  Tipe: string;
  Kategori: string;
  SumberID: string;
  Keterangan: string;
  Jumlah: number;
  [key: string]: any;
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
  labaDitahan: number;
}

export interface ProfitSharing {
  omsetGross: number;
  alokasiHPP: number;
  totalKomisi: number;
  omsetNett: number;
  target: number;
  dompet: Dompet;
  komisiBreakdown: KomisiBreakdown[];
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

export interface ProfitHistory {
  bulan: string;
  gross: number;
  hpp: number;
  nett: number;
  target: number;
  growthRp?: number;
  growthPct?: string;
}

export interface KontenWeb {
  ID: string;
  Kategori: string;
  Keterangan: string;
  IsiKonten: string;
  Status: string;
  [key: string]: any;
}

export interface DiskonEvent {
  ID: string;
  NamaEvent: string;
  Potongan: number;
  Tipe: string;
  Status: string;
  TargetLayanan: string;
  [key: string]: any;
}

export interface Referral {
  ID: string;
  Kode: string;
  NamaReferral: string;
  Link: string;
  TotalKlik: number;
  TotalOrder: number;
  TotalRevenue: number;
  Status: string;
  Dibuat: string;
  KomisiPct: number;
  [key: string]: any;
}

export interface DashboardSummary {
  todayIncome: number;
  activeOrders: number;
  lowStock: InventoryItem[];
  topLayanan: { nama: string; total: number }[];
  topProduk: { nama: string; total: number }[];
}

export interface ThemeSettings {
  primary: string;
  hover: string;
}

export type OrderStatus =
  | 'Waiting'
  | 'Checking'
  | 'Proses Repair'
  | 'Proses Cleaning'
  | 'Proses Pengeringan'
  | 'Ready'
  | 'Selesai';
