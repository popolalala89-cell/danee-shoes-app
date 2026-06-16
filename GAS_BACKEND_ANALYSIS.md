# DANEE SHOES & CLEAN - Complete GAS Backend Analysis
# =====================================================
# Generated: 2026-06-16
# Source: Google Apps Script project (clasp pulled)
# Spreadsheet: https://docs.google.com/spreadsheets/d/1Vz4yrCBv-MvPL7g_qZE0NNqHQxmw5b54VyWr9DdN7iI/edit
# WhatsApp Number: 6285111619226
# Upload Folder ID: 19pGpHPMm16U6KR-WqDF1K5Tr6UsJvFis
# =====================================================

## 1. GLOBAL CONSTANTS & CONFIGURATION

```
SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1Vz4yrCBv-MvPL7g_qZE0NNqHQxmw5b54VyWr9DdN7iI/edit'
WA_NUMBER = '6285111619226'
UPLOAD_FOLDER_ID = '19pGpHPMm16U6KR-WqDF1K5Tr6UsJvFis'
```

Script Properties (PropertiesService):
- ADMIN_PASSWORD: SHA-256 hash of admin password
- WEB_APP_URL: Cached web app URL
- THEME_PRIMARY: Primary color hex (default: '#034BB9')
- THEME_HOVER: Hover color hex (default: '#023C94')

Cache (CacheService, 30-min TTL):
- AUTH_TOKEN_{token}: 'valid' (for session management)

---

## 2. AUTHENTICATION SYSTEM

### Password Hashing
- Algorithm: SHA-256 (Utilities.computeDigest)
- Default password: 'admin123' (set if no password exists)
- Stored as hex string in Script Properties

### Login Flow
1. Client sends `password` via POST body
2. Server hashes password, compares with stored hash
3. On success: generates UUID token, stores in CacheService with 30-min TTL
4. Returns: `{ success: true, token: 'uuid-string' }`

### Auth Check
- `checkAuth(token)`: checks CacheService for 'AUTH_TOKEN_{token}' === 'valid'
- All admin endpoints require valid token (passed in POST body as `token`)

### Logout
- Removes token from CacheService
- Returns: `{ success: true }`

---

## 3. API ARCHITECTURE

### Entry Points
- `doGet(e)`: Serves HTML template (Index.html) with injected variables:
  - `waNumber`: WhatsApp number
  - `pageParam`: URL ?page= parameter (default: 'home')
  - `scriptUrl`: Web app URL
  - `refParam`: URL ?ref= parameter (referral code)

- `doPost(e)`: Main API router
  - Reads `action` from URL parameter or POST body
  - Parses JSON body from `e.postData.contents`
  - Routes to handler functions via switch statement
  - Returns JSON responses

- `doOptions(e)`: CORS preflight handler (allows all origins)

### Request Format
```json
POST /exec?action=ACTION_NAME
Content-Type: application/json

{
  "token": "auth-token",
  "data": { ... },
  "id": "record-id",
  "orderId": "ORD-001",
  "newStatus": "Selesai",
  "keyword": "search-term",
  "filters": { "startDate": "...", "endDate": "..." },
  "period": "bulan_ini",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "code": "referral-code",
  "base64Data": "data:image/png;base64,...",
  "fileName": "image.png",
  "primaryColor": "#034BB9",
  "hoverColor": "#023C94",
  "items": [...],
  "qty": 1,
  "HargaBeli": 50000
}
```

### Response Format
```json
{
  "success": true/false,
  "message": "error message (on failure)",
  "data": [...],
  "token": "auth-token (on login)",
  "orderId": "ORD-001 (on addOrder)",
  "url": "drive-url (on upload)"
}
```

---

## 4. COMPLETE API ENDPOINTS

### AUTH MODULE
| Action | Method | Auth | Parameters | Returns |
|--------|--------|------|------------|---------|
| login | POST | No | password | {success, token} |
| checkAuth | POST | No | token | {success: bool} |
| logout | POST | Yes | token | {success} |

### MENU JASA (Services)
| Action | Method | Auth | Parameters | Returns |
|--------|--------|------|------------|---------|
| getMenuJasa | POST | No | - | {success, data: MenuJasa[]} |
| saveMenuJasa | POST | Yes | data: {ID?, NamaLayanan, Kategori, Harga, HargaPromo?, Status, Deskripsi, Urutan} | {success} |
| deleteMenuJasa | POST | Yes | id | {success} |

### MENU STORE (Products)
| Action | Method | Auth | Parameters | Returns |
|--------|--------|------|------------|---------|
| getMenuStore | POST | No | - | {success, data: MenuStore[]} |
| saveMenuStore | POST | Yes | data: {ID?, NamaProduk, Kategori, Harga, HargaPromo?, Stok, Status, Deskripsi, LinkFoto?, LinkMarketplace?} | {success} |
| deleteMenuStore | POST | Yes | id | {success} |

### ORDERS
| Action | Method | Auth | Parameters | Returns |
|--------|--------|------|------------|---------|
| getOrders | POST | Yes | - | {success, data: Orders[]} (reversed) |
| addOrder | POST | Yes | data: {NamaPelanggan, KontakWA, Layanan, Harga, Catatan?, DiskonInfo?, ReferralCode?, TipePembayaran?} | {success, orderId} |
| updateOrderStatus | POST | Yes | orderId, newStatus | {success} |
| trackOrder | POST | No | keyword | {success, data: Orders[]} |

### STORE SALES
| Action | Method | Auth | Parameters | Returns |
|--------|--------|------|------------|---------|
| getSales | POST | Yes | - | {success, data: StoreSales[]} (reversed) |
| recordSale | POST | Yes | data: {ProdukID, Qty, HargaSatuan, NamaPembeli?, NamaProduk} | {success} |

### INVENTORY STORE (Dagangan)
| Action | Method | Auth | Parameters | Returns |
|--------|--------|------|------------|---------|
| getInventoryStore | POST | Yes | - | {success, data: InventoryStore[]} |
| stockOpnameStore | POST | Yes | items: [{ProdukID, StokFisik}] | {success} |
| purchaseStock | POST | Yes | data: {ProdukID, NamaProduk, Qty, HargaBeli} | {success} |

### INVENTORY BAHAN (Raw Materials)
| Action | Method | Auth | Parameters | Returns |
|--------|--------|------|------------|---------|
| getInventoryBahan | POST | Yes | - | {success, data: InventoryBahan[]} |
| addBahan | POST | Yes | data: {NamaBahan, Satuan, Stok} | {success} |
| stockOpnameBahan | POST | Yes | items: [{BahanID, StokFisik}] | {success} |
| purchaseBahan | POST | Yes | data: {BahanID, NamaBahan, Qty, HargaBeli} | {success} |

### CASHFLOW
| Action | Method | Auth | Parameters | Returns |
|--------|--------|------|------------|---------|
| getCashflow | POST | Yes | filters: {startDate?, endDate?} | {success, data: Cashflow[]} (reversed) |
| addCashflowManual | POST | Yes | data: {Tipe, Kategori, Keterangan, Jumlah} | {success} |

### DASHBOARD
| Action | Method | Auth | Parameters | Returns |
|--------|--------|------|------------|---------|
| getDashboardSummary | POST | Yes | period: 'bulan_ini' (default) | {success, data: {todayIncome, activeOrders, lowStock[], topLayanan[], topProduk[]}} |

### PROFIT SHARING
| Action | Method | Auth | Parameters | Returns |
|--------|--------|------|------------|---------|
| getProfitSharingData | POST | Yes | startDate, endDate | {success, data: {omsetGross, alokasiHPP, totalKomisi, omsetNett, target, dompet, komisiBreakdown[]}} |
| getProfitHistorySummary | POST | Yes | - | {success, data: [{bulan, gross, hpp, nett, target, growthRp, growthPct}]} |

### KONTEN WEB (Content Management)
| Action | Method | Auth | Parameters | Returns |
|--------|--------|------|------------|---------|
| getKontenWeb | POST | No | - | {success, data: KontenWeb[]} |
| saveKontenWeb | POST | Yes | data: {ID?, Kategori, Keterangan, IsiKonten, Status} | {success} |
| deleteKontenWeb | POST | Yes | id | {success} |

### DISKON EVENTS
| Action | Method | Auth | Parameters | Returns |
|--------|--------|------|------------|---------|
| getDiskonEvent | POST | No | - | {success, data: DiskonEvent[]} |
| saveDiskonEvent | POST | Yes | data: {ID?, NamaEvent, Potongan, Tipe, Status, TargetLayanan?} | {success} |
| deleteDiskonEvent | POST | Yes | id | {success} |

### REFERRALS
| Action | Method | Auth | Parameters | Returns |
|--------|--------|------|------------|---------|
| getReferralAdmin | POST | Yes | - | {success, data: Referral[]} |
| saveReferral | POST | Yes | data: {ID?, NamaReferral, KomisiPct} | {success} |
| deleteReferral | POST | Yes | id | {success} |
| getReferralByCode | POST | No | code | {id, kode, nama} or null |
| trackReferralClick | POST | No | code | {success} |

### THEME
| Action | Method | Auth | Parameters | Returns |
|--------|--------|------|------------|---------|
| getThemeSettings | POST | No | - | {success, data: {primary, hover}} |
| saveThemeSettings | POST | Yes | primaryColor, hoverColor | {success} |

### UPLOAD
| Action | Method | Auth | Parameters | Returns |
|--------|--------|------|------------|---------|
| uploadImageToDrive | POST | Yes | base64Data, fileName | {success, url} |

---

## 5. GOOGLE SHEETS DATA STRUCTURES

### Sheet: MenuJasa
| Col | Header | Type | Description |
|-----|--------|------|-------------|
| A | ID | String | Auto-generated: MJ001, MJ002, etc. |
| B | NamaLayanan | String | Service name (e.g., "Fast Clean") |
| C | Kategori | String | "Cleaning" or "Repair" |
| D | Harga | Number | Price in Rp |
| E | HargaPromo | Number/String | Promo price (empty if none) |
| F | Status | String | "Aktif", "Coming Soon", "Nonaktif" |
| G | Deskripsi | String | Service description |
| H | Urutan | Number | Display order (1, 2, 3...) |

### Sheet: MenuStore
| Col | Header | Type | Description |
|-----|--------|------|-------------|
| A | ID | String | Auto-generated: PRD001, PRD002, etc. |
| B | NamaProduk | String | Product name |
| C | Kategori | String | Product category |
| D | Harga | Number | Price in Rp |
| E | HargaPromo | Number/String | Promo price (empty if none) |
| F | Stok | Number | Current stock |
| G | Status | String | "Aktif", "Nonaktif" |
| H | Deskripsi | String | Product description |
| I | LinkFoto | String | Image URL |
| J | LinkMarketplace | String | Shopee/marketplace URL |

### Sheet: Orders
| Col | Header | Type | Description |
|-----|--------|------|-------------|
| A | OrderID | String | Auto-generated: ORD-001, ORD-002, etc. |
| B | Tanggal | String | Timestamp: yyyy-MM-dd HH:mm:ss |
| C | NamaPelanggan | String | Customer name |
| D | KontakWA | String | WhatsApp number |
| E | Layanan | String | Service(s) - comma-separated if multiple |
| F | Harga | Number | Total price in Rp |
| G | Status | String | "Waiting", "Checking", "Proses Repair", "Proses Cleaning", "Proses Pengeringan", "Ready", "Selesai", "Batal" |
| H | Catatan | String | Notes (can contain repair items) |
| I | DiskonInfo | String | Discount info text |
| J | Referral | String | Referral code (6 chars) |
| K | TipePembayaran | String | "Bayar di Akhir" or "Bayar di Awal" |

### Sheet: StoreSales
| Col | Header | Type | Description |
|-----|--------|------|-------------|
| A | SaleID | String | Auto-generated: SAL-001, SAL-002, etc. |
| B | Tanggal | String | Timestamp |
| C | NamaPembeli | String | Buyer name |
| D | ProdukID | String | Product ID (PRD-xxx) |
| E | NamaProduk | String | Product name |
| F | Qty | Number | Quantity sold |
| G | HargaSatuan | Number | Unit price |
| H | Total | Number | Total (Qty × HargaSatuan) |

### Sheet: InventoryStore
| Col | Header | Type | Description |
|-----|--------|------|-------------|
| A | ProdukID | String | Product ID (matches MenuStore) |
| B | NamaProduk | String | Product name |
| C | StokSistem | Number | System stock |
| D | StokFisik | Number | Physical count (stock opname) |
| E | Selisih | Number | Difference (Fisik - Sistem) |
| F | UpdateTerakhir | String | Last update timestamp |

### Sheet: InventoryBahan
| Col | Header | Type | Description |
|-----|--------|------|-------------|
| A | BahanID | String | Auto-generated: BAH-001, BAH-002, etc. |
| B | NamaBahan | String | Material name |
| C | Satuan | String | Unit (Liter, Botol, Pcs) |
| D | StokSistem | Number | System stock |
| E | StokFisik | Number | Physical count |
| F | Selisih | Number | Difference |
| G | UpdateTerakhir | String | Last update timestamp |

### Sheet: Cashflow
| Col | Header | Type | Description |
|-----|--------|------|-------------|
| A | CashflowID | String | Auto-generated: CF-001, CF-002, etc. |
| B | Tanggal | String | Timestamp |
| C | Tipe | String | "Pemasukan" or "Pengeluaran" |
| D | Kategori | String | "Jasa", "Penjualan", "Pembelian Stok", "Komisi", "Operasional", "Lainnya" |
| E | SumberID | String | Related OrderID/SaleID (or empty for manual) |
| F | Keterangan | String | Description |
| G | Jumlah | Number | Amount in Rp |

### Sheet: KontenWeb
| Col | Header | Type | Description |
|-----|--------|------|-------------|
| A | ID | String | Auto-generated: KW-001, KW-002, etc. |
| B | Kategori | String | "Edukasi", "Testimoni", "Instagram", "YouTube" |
| C | Keterangan | String | Caption/title |
| D | IsiKonten | String | Image URL or social media link |
| E | Status | String | "Aktif", "Nonaktif" |

### Sheet: DiskonEvent
| Col | Header | Type | Description |
|-----|--------|------|-------------|
| A | ID | String | Auto-generated: EVT-001, EVT-002, etc. |
| B | NamaEvent | String | Event name |
| C | Potongan | Number | Discount amount (Rp or %) |
| D | Tipe | String | "Persentase" or "Nominal" |
| E | Status | String | "Aktif", "Admin Saja", "Nonaktif" |
| F | TargetLayanan | String | "Semua Layanan", "Semua Menu Jasa", "Semua Menu Store", or specific item name |

### Sheet: Referral
| Col | Header | Type | Description |
|-----|--------|------|-------------|
| A | ID | String | Auto-generated: REF-001, REF-002, etc. |
| B | Kode | String | 6-char code (e.g., "A3B7K9") |
| C | NamaReferral | String | Referrer name |
| D | Link | String | Full referral URL |
| E | TotalKlik | Number | Click counter |
| F | TotalOrder | Number | Order counter |
| G | TotalRevenue | Number | Total revenue from referrals |
| H | Status | String | "Aktif", "Nonaktif" |
| I | Dibuat | String | Creation timestamp |
| J | KomisiPct | Number | Commission percentage (e.g., 5 for 5%) |

### Sheet: Settings_Profit
| Col | Header | Type | Description |
|-----|--------|------|-------------|
| A | NamaLayanan | String | Service/product name (lowercase key) |
| B | HPP | Number | Cost of goods sold per unit |
| C | Kategori | String | "CLEAN" or "REPAIR" |
| D | (empty) | - | - |
| E | RoleName | String | Role name for profit sharing |
| F | TargetOmset | Number | Target turnover amount |
| G | (empty) | - | - |
| H | Peran | String | Role: "owner", "spesialis cuci", "spesialis repair", "admin", "engineer web", "kas danee", "zakat", "investor" |
| I | CleanPct | Number | Profit share % for cleaning services |
| J | RepairPct | Number | Profit share % for repair services |

---

## 6. BUSINESS RULES & LOGIC

### Order Status Flow
Waiting → Checking → Proses Repair/Proses Cleaning → Proses Pengeringan → Ready → Selesai
(Also: Batal for cancelled orders)

### Payment Types
1. **Bayar di Akhir** (Pay Later): Cashflow entry created when status changes to "Selesai"
2. **Bayar di Awal** (Pay Upfront): Cashflow entry created immediately when order is placed

### Cashflow Auto-Generation Rules
1. **Order (Bayar di Awal)**: Creates "Pemasukan" / "Jasa" entry on order creation
2. **Order (Bayar di Awal)**: Does NOT create duplicate on status change to "Selesai"
3. **Order (Bayar di Akhir)**: Creates "Pemasukan" / "Jasa" entry when status → "Selesai"
4. **Referral Commission**: On order "Selesai", if referral code exists and referral is "Aktif":
   - Calculates: harga × komisiPct / 100
   - Creates "Pengeluaran" / "Komisi" cashflow entry
5. **Store Sale**: Creates "Pemasukan" / "Penjualan" entry
6. **Stock Purchase (Store)**: Creates "Pengeluaran" / "Pembelian Stok" entry
7. **Bahan Purchase**: Creates "Pengeluaran" / "Pembelian Stok" entry

### Stock Management Rules
- **MenuStore & InventoryStore are synced**: When MenuStore is saved, InventoryStore is updated via `_syncInventoryStore()`
- **recordSale**: Checks stock availability, decrements both InventoryStore and MenuStore
- **purchaseStock**: Increments both InventoryStore and MenuStore
- **Stock Opname**: Records physical count, calculates difference

### Delete Behavior (Soft Delete)
- MenuJasa delete: Sets Status to "Nonaktif" (column F → actually column 5 = E, but code writes to column 5 which is E=HargaPromo... BUG: should be column 6/F)
- MenuStore delete: Sets Status to "Nonaktif" (column 6 = G)
- Referral delete: Sets Status to "Nonaktif" (column 8 = H)
- DiskonEvent delete: Actually deletes the row (`sheet.deleteRow()`)
- KontenWeb delete: Actually deletes the row (`sheet.deleteRow()`)

### ID Generation
- Format: `{PREFIX}{sequential_number_padded_to_3}`
- MJ001, MJ002... (MenuJasa)
- PRD001, PRD002... (MenuStore)
- ORD-001, ORD-002... (Orders)
- SAL-001, SAL-002... (StoreSales)
- CF-001, CF-002... (Cashflow)
- KW-001, KW-002... (KontenWeb)
- EVT-001, EVT-002... (DiskonEvent)
- REF-001, REF-002... (Referral)
- BAH-001, BAH-002... (InventoryBahan)

### Referral Code Generation
- 6 characters from: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
- (Excludes: I, O, 0, 1 to avoid confusion)
- Referral URL: `{webAppUrl}?page=home&ref={code}`

---

## 7. PROFIT SHARING ENGINE (Detailed)

### Data Sources
- Orders sheet (filtered by status="Selesai" and date range)
- Settings_Profit sheet (HPP costs + role percentages)
- MenuJasa sheet (original prices for gross calculation)
- MenuStore sheet (original prices for gross calculation)
- Referral sheet (commission rates)

### Calculation Flow
1. **Date Range**: Defaults to current month if not specified
2. **Filter Orders**: Only "Selesai" orders within date range
3. **Parse Items**: Splits comma/semicolon/newline-separated service names
4. **Qty Detection**: Regex for `(Nx)` or `Nx` patterns
5. **Price Lookup**: Matches item name against MenuJasa/MenuStore prices
6. **HPP Matching**: Matches item name against Settings_Profit HPP config
   - Uses longest-match-first strategy (sorted by key length)
   - Falls back to reverse matching (key contains item name)
7. **Category Detection**: Items with "REPAIR" category → Jalur B (repair path)
8. **Repair Detection from Catatan**: Scans order notes for repair keywords
9. **Referral Commission**: Deducted proportionally per item before target calculation

### Profit Distribution ("Dompet" = Wallet)
The engine uses a target-based system:

1. **Below Target**: Net revenue accumulates toward target
2. **At Target**: Fixed base amounts distributed:
   - ownerBase: Rp 50,000
   - cuciBase: Rp 50,000
   - adminBase: Rp 50,000
   - webBase: Rp 50,000
   - kasBase: targetOmset - 200,000
3. **Above Target**: Percentage-based distribution using role configs

### Role Distribution Keys
- owner
- spesialis cuci / cuci
- spesialis repair / repair
- admin
- engineer web / web
- kas danee / kas
- zakat
- investor

Each role has separate percentages for "Clean" (Jalur A) and "Repair" (Jalur B) paths.

---

## 8. DASHBOARD SUMMARY ENGINE

### Metrics Calculated
1. **todayIncome**: Sum of "Pemasukan" cashflow entries matching today's date (multiple format matching)
2. **activeOrders**: Count of orders NOT in "Selesai" or "Batal" status
3. **lowStock**: Inventory items where StokSistem <= 3
4. **topLayanan**: Top 5 most-ordered services (parsed from comma-separated Layanan field, cleaned of brackets/quantities)
5. **topProduk**: Top 5 most-sold products from StoreSales

### Period Filtering
- `cekBulanIni()`: Checks if a date string falls within current month
- Supports multiple date formats: yyyy-MM-dd, dd/MM/yyyy, MM/dd/yyyy

---

## 9. HISTORY & GROWTH TRACKER

### getProfitHistorySummary()
- Fetches last 4 months of profit data
- Calculates month-over-month growth for last 3 months
- Growth formula: (currentNett - previousNett) / |previousNett| × 100
- Returns: [{bulan, gross, hpp, nett, target, growthRp, growthPct}]

---

## 10. FRONTEND ARCHITECTURE

### Page Routing
- `?page=home` (default): Landing page with public content
- `?page=admin`: Admin dashboard (requires login)

### Landing Page Sections
1. Hero section with CTA buttons
2. Edukasi (Education) - Digital book viewer with page navigation
3. Testimoni - Infinite scroll testimonial cards
4. Menu Cleaning - Service cards with promo pricing
5. Menu Repair - Repair service cards
6. Store Produk - Product cards
7. Order Tracking - Search by OrderID/WA/Name

### Admin Dashboard Tabs
1. Ringkasan (Summary/Dashboard)
2. Menu Jasa (Service management)
3. Menu Store (Product management)
4. Pesanan (Orders management)
5. Penjualan (Sales recording)
6. Inventory (Dagangan + Bahan Baku tabs)
7. Cashflow (with date filters and chart)
8. Profit Sharing (with history table)
9. Konten Web (Content management)
10. Manajemen Diskon (Discount events)
11. Referral (Referral code management)

### Discount Engine (Frontend)
- `applyEventDiscount()`: Applies active events to menu prices
- Priority: Active event > Sheet HargaPromo > Original price
- Target matching: Specific item, "Semua Menu Jasa", "Semua Menu Store", "Semua Layanan"

### Cart System (Frontend)
- Multi-item cart with delivery method selection (Dropoff/Pickup)
- Payment method: Bayar Nanti or QRIS
- Generates WhatsApp message with formatted order details
- QRIS image embedded as base64 in HTML

---

## 11. HELPER FUNCTIONS

| Function | Purpose |
|----------|---------|
| getSheet(name) | Get sheet by name from spreadsheet |
| getOrCreateSheet(name, headers) | Get or create sheet with headers |
| generateId(prefix, sheet) | Generate sequential ID |
| generateReferralCode() | Generate 6-char referral code |
| formatTimestamp(date) | Format date as 'yyyy-MM-dd HH:mm:ss' |
| sheetToObjects(sheet) | Convert sheet data to array of objects |
| parseDateSafe(dateStr) | Safely parse date strings |
| parsePercent(val) | Parse percentage (handles >1 as raw %) |
| hashPassword(password) | SHA-256 hash |
| _syncInventoryStore() | Sync MenuStore ↔ InventoryStore |
| _addCashflow() | Internal cashflow entry creator |
| _updateReferralOrder() | Update referral order/revenue counters |

---

## 12. SHEET AUTO-CREATION

The following sheets are auto-created if missing:
- Referral (with REFERRAL_HEADERS)
- All others are expected to exist

---

## 13. OAUTH SCOPES
- https://www.googleapis.com/auth/script.projects
- https://www.googleapis.com/auth/spreadsheets
- https://www.googleapis.com/auth/drive
- https://www.googleapis.com/auth/script.external_request

---

## 14. WEBAPP CONFIGURATION
- executeAs: USER_DEPLOYING
- access: ANYONE_ANONYMOUS
- Runtime: V8
- Timezone: Asia/Jakarta

---

## 15. FILES IN GAS PROJECT
1. Code.js - All server-side logic (1425 lines)
2. Index.html - Main HTML template with all UI (1293 lines)
3. JavaScript.html - Client-side JavaScript (3186 lines)
4. Styles.html - CSS styles (1003 lines)
5. appsscript.json - Project configuration
