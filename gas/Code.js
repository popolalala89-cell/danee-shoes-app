// ============================================================
// DANEE SHOES & CLEAN - Code.gs (Master Recovery - Final)
// ============================================================

var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1Vz4yrCBv-MvPL7g_qZE0NNqHQxmw5b54VyWr9DdN7iI/edit';
var WA_NUMBER = '6285111619226';

function getWebAppUrl() {
  var stored = PropertiesService.getScriptProperties().getProperty('WEB_APP_URL');
  if (stored) return stored;
  // Fallback: use current service URL but strip /dev
  var url = ScriptApp.getService().getUrl();
  return url.replace(/\/dev$/, '/exec');
}

function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    .setHeader('Access-Control-Max-Age', '3600');
}

function doPost(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
  if (!action) return doGet(e);
  
  // Parse JSON body from POST request
  var body = {};
  try {
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: 'Invalid JSON body' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var token = body.token || '';
  var result;
  
  switch(action) {
    // ===== AUTH =====
    case 'login':
      result = login(body.password || '');
      break;
    case 'checkAuth':
      result = { success: checkAuth(token) };
      break;
    case 'logout':
      result = logout(token);
      break;
    
    // ===== MENU JASA =====
    case 'getMenuJasa':
      result = getMenuJasa();
      break;
    case 'saveMenuJasa':
      result = saveMenuJasa(body.data, token);
      break;
    case 'deleteMenuJasa':
      result = deleteMenuJasa(body.id, token);
      break;
    
    // ===== MENU STORE =====
    case 'getMenuStore':
      result = getMenuStore();
      break;
    case 'saveMenuStore':
      result = saveMenuStore(body.data, token);
      break;
    case 'deleteMenuStore':
      result = deleteMenuStore(body.id, token);
      break;
    
    // ===== ORDERS =====
    case 'getOrders':
      result = getOrders(token);
      break;
    case 'addOrder':
      result = addOrder(body.data, token);
      break;
    case 'updateOrderStatus':
      result = updateOrderStatus(body.orderId, body.newStatus, token);
      break;
    case 'trackOrder':
      result = trackOrder(body.keyword || '');
      break;
    
    // ===== STORE SALES =====
    case 'getSales':
      result = getSales(token);
      break;
    case 'recordSale':
      result = recordSale(body.data, token);
      break;
    
    // ===== INVENTORY STORE =====
    case 'getInventoryStore':
      result = getInventoryStore(token);
      break;
    case 'stockOpnameStore':
      result = stockOpnameStore(body.items, token);
      break;
    case 'purchaseStock':
      result = purchaseStock(body.data, token);
      break;
    
    // ===== BAHAN =====
    case 'getInventoryBahan':
      result = getInventoryBahan(token);
      break;
    case 'addBahan':
      result = addBahan(body.data, token);
      break;
    case 'stockOpnameBahan':
      result = stockOpnameBahan(body.items, token);
      break;
    case 'purchaseBahan':
      result = purchaseBahan(body.data, token);
      break;
    
    // ===== CASHFLOW =====
    case 'getCashflow':
      result = getCashflow(body.filters, token);
      break;
    case 'addCashflowManual':
      result = addCashflowManual(body.data, token);
      break;
    
    // ===== DASHBOARD =====
    case 'getDashboardSummary':
      result = getDashboardSummary(token, body.period || 'bulan_ini');
      break;
    
    // ===== PROFIT SHARING =====
    case 'getProfitSharingData':
      result = getProfitSharingData(token, body.startDate, body.endDate);
      break;
    case 'getProfitHistorySummary':
      result = getProfitHistorySummary(token);
      break;
    
    // ===== KONTEN WEB =====
    case 'getKontenWeb':
      result = getKontenWeb();
      break;
    case 'saveKontenWeb':
      result = saveKontenWeb(body.data, token);
      break;
    case 'deleteKontenWeb':
      result = deleteKontenWeb(body.id, token);
      break;
    
    // ===== DISKON =====
    case 'getDiskonEvent':
      result = getDiskonEvent();
      break;
    case 'saveDiskonEvent':
      result = saveDiskonEvent(body.data, token);
      break;
    case 'deleteDiskonEvent':
      result = deleteDiskonEvent(body.id, token);
      break;
    
    // ===== REFERRAL =====
    case 'getReferralAdmin':
      result = getReferralAdmin(token);
      break;
    case 'saveReferral':
      result = saveReferral(body.data, token);
      break;
    case 'deleteReferral':
      result = deleteReferral(body.id, token);
      break;
    case 'getReferralByCode':
      result = getReferralByCode(body.code || '');
      break;
    case 'trackReferralClick':
      result = trackReferralClick(body.code || '');
      break;
    
    // ===== THEME =====
    case 'getThemeSettings':
      result = getThemeSettings();
      break;
    case 'saveThemeSettings':
      result = saveThemeSettings(body.primaryColor, body.hoverColor, token);
      break;
    
    // ===== UPLOAD =====
    case 'uploadImageToDrive':
      result = uploadImageToDrive(body.base64Data, body.fileName, token);
      break;
    
    default:
      result = { success: false, message: 'Unknown action: ' + action };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result || { success: false, message: 'No result' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// 1. ENTRY POINT (TIDAK BOLEH DIHAPUS - MENCEGAH "UNDEFINED")
// ============================================================
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.waNumber = WA_NUMBER;
  template.pageParam = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'home';
  template.scriptUrl = ScriptApp.getService().getUrl();
  template.refParam = (e && e.parameter && e.parameter.ref) ? e.parameter.ref : '';
  
  return template.evaluate()
    .setTitle('DANEE SHOES & CLEAN')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================
// 2. OTORISASI & LOGIN
// ============================================================
function setAdminPassword(password) {
  password = password || '@Zeprut06';
  var hash = hashPassword(password);
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD', hash);
}

function hashPassword(password) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return digest.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function login(password) {
  var stored = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!stored) {
    setAdminPassword('admin123');
    stored = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  }
  var hashed = hashPassword(password);
  if (hashed === stored) {
    var token = Utilities.getUuid();
    CacheService.getScriptCache().put('AUTH_TOKEN_' + token, 'valid', 1800);
    return { success: true, token: token };
  }
  return { success: false, message: 'Password salah.' };
}

function checkAuth(token) {
  if (!token) return false;
  return CacheService.getScriptCache().get('AUTH_TOKEN_' + token) === 'valid';
}

function logout(token) {
  if (token) CacheService.getScriptCache().remove('AUTH_TOKEN_' + token);
  return { success: true };
}

// ============================================================
// 3. HELPER & ALAT BANTU (Tanggal, Persen, Sheet)
// ============================================================
function getSheet(name) {
  return SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(name);
}

function getOrCreateSheet(name, headers) {
  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) sheet.appendRow(headers);
  }
  return sheet;
}

function generateReferralCode() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var code = '';
  for (var i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateId(prefix, sheet) {
  var data = sheet.getDataRange().getValues();
  var maxNum = 0;
  for (var i = 1; i < data.length; i++) {
    var existingId = String(data[i][0] || '');
    if (existingId.indexOf(prefix) === 0) {
      var num = parseInt(existingId.substring(prefix.length)) || 0;
      if (num > maxNum) maxNum = num;
    }
  }
  return prefix + (maxNum + 1).toString().padStart(3, '0');
}

function formatTimestamp(date) {
  return Utilities.formatDate(date || new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function(h) { return String(h || '').trim(); });
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    if (data[i].join('').trim() === '') continue; 
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      if (Object.prototype.toString.call(val) === '[object Date]') {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      }
      obj[headers[j]] = val;
    }
    result.push(obj);
  }
  return result;
}

function parseDateSafe(dateStr) {
  if (!dateStr) return null;
  try {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      var parts = String(dateStr || '').split(/[\/\-\s]+/);
      if (parts.length === 3) {
        d = new Date(parts[2], parts[0] - 1, parts[1]);
        if (isNaN(d.getTime())) d = new Date(parts[2], parts[1] - 1, parts[0]);
      }
    }
    return isNaN(d.getTime()) ? null : d;
  } catch(e) {}
  return null;
}

function parsePercent(val) {
  var num = Number(String(val || '').replace('%', '').trim());
  if (isNaN(num)) return 0;
  if (num > 1) return num / 100; 
  return num; 
}

// ============================================================
// 4. MODUL MENU & INVENTORY
// ============================================================
function getMenuJasa() {
  try { return { success: true, data: sheetToObjects(getSheet('MenuJasa')) }; } 
  catch(e) { return { success: false, message: e.toString() }; }
}

function saveMenuJasa(data, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getSheet('MenuJasa');
    var hargaPromo = (data.HargaPromo && data.HargaPromo !== '') ? parseFloat(data.HargaPromo) : '';

    if (data.ID) {
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.ID) {
          sheet.getRange(i + 1, 1, 1, 8).setValues([[
            data.ID, data.NamaLayanan, data.Kategori, parseFloat(data.Harga) || 0, 
            hargaPromo, data.Status, data.Deskripsi, parseInt(data.Urutan) || 1
          ]]);
          break;
        }
      }
    } else {
      var newId = generateId('MJ', sheet);
      sheet.appendRow([newId, data.NamaLayanan, data.Kategori, parseFloat(data.Harga) || 0, hargaPromo, data.Status, data.Deskripsi, parseInt(data.Urutan) || 1]);
    }
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function deleteMenuJasa(id, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getSheet('MenuJasa');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) { sheet.getRange(i + 1, 5).setValue('Nonaktif'); break; }
    }
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function getMenuStore() {
  try { return { success: true, data: sheetToObjects(getSheet('MenuStore')) }; } 
  catch(e) { return { success: false, message: e.toString() }; }
}

function saveMenuStore(data, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getSheet('MenuStore');
    var invSheet = getSheet('InventoryStore');
    var hargaPromo = (data.HargaPromo && data.HargaPromo !== '') ? parseFloat(data.HargaPromo) : '';

    if (data.ID) {
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.ID) {
          sheet.getRange(i + 1, 1, 1, 10).setValues([[
            data.ID, data.NamaProduk, data.Kategori, parseFloat(data.Harga) || 0, 
            hargaPromo, parseInt(data.Stok) || 0, data.Status, data.Deskripsi, data.LinkFoto || '', data.LinkMarketplace || ''
          ]]);
          _syncInventoryStore(invSheet, data.ID, data.NamaProduk, parseInt(data.Stok) || 0);
          break;
        }
      }
    } else {
      var newId = generateId('PRD', sheet);
      sheet.appendRow([newId, data.NamaProduk, data.Kategori, parseFloat(data.Harga) || 0, hargaPromo, parseInt(data.Stok) || 0, data.Status, data.Deskripsi, data.LinkFoto || '', data.LinkMarketplace || '']);
      invSheet.appendRow([newId, data.NamaProduk, parseInt(data.Stok) || 0, '', '', formatTimestamp()]);
    }
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function _syncInventoryStore(invSheet, produkId, namaProduk, stok) {
  var rows = invSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === produkId) {
      invSheet.getRange(i + 1, 2).setValue(namaProduk);
      invSheet.getRange(i + 1, 3).setValue(stok);
      invSheet.getRange(i + 1, 6).setValue(formatTimestamp());
      return;
    }
  }
  invSheet.appendRow([produkId, namaProduk, stok, '', '', formatTimestamp()]);
}

function deleteMenuStore(id, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getSheet('MenuStore');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) { sheet.getRange(i + 1, 6).setValue('Nonaktif'); break; }
    }
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function getInventoryStore(token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try { return { success: true, data: sheetToObjects(getSheet('InventoryStore')) }; } 
  catch(e) { return { success: false, message: e.toString() }; }
}

function stockOpnameStore(items, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getSheet('InventoryStore');
    var rows = sheet.getDataRange().getValues();
    items.forEach(function(item) {
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === item.ProdukID) {
          var stokFisik = parseInt(item.StokFisik);
          var stokSistem = parseInt(rows[i][2]) || 0;
          sheet.getRange(i + 1, 4).setValue(stokFisik);
          sheet.getRange(i + 1, 5).setValue(stokFisik - stokSistem);
          sheet.getRange(i + 1, 6).setValue(formatTimestamp());
          break;
        }
      }
    });
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function purchaseStock(data, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var invSheet = getSheet('InventoryStore');
    var menuSheet = getSheet('MenuStore');
    var qty = parseInt(data.Qty) || 0;
    var invRows = invSheet.getDataRange().getValues();

    for (var i = 1; i < invRows.length; i++) {
      if (invRows[i][0] === data.ProdukID) {
        var newStok = (parseInt(invRows[i][2]) || 0) + qty;
        invSheet.getRange(i + 1, 3).setValue(newStok);
        invSheet.getRange(i + 1, 6).setValue(formatTimestamp());

        var menuRows = menuSheet.getDataRange().getValues();
        for (var j = 1; j < menuRows.length; j++) {
          if (menuRows[j][0] === data.ProdukID) {
            menuSheet.getRange(j + 1, 5).setValue(newStok);
            break;
          }
        }
        break;
      }
    }
    _addCashflow('Pengeluaran', 'Pembelian Stok', '', 'Beli stok: ' + data.NamaProduk + ' x' + qty, parseFloat(data.HargaBeli) || 0);
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function getInventoryBahan(token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try { return { success: true, data: sheetToObjects(getSheet('InventoryBahan')) }; } 
  catch(e) { return { success: false, message: e.toString() }; }
}

function addBahan(data, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getSheet('InventoryBahan');
    var newId = generateId('BAH-', sheet);
    sheet.appendRow([newId, data.NamaBahan, data.Satuan, parseInt(data.Stok) || 0, '', '', formatTimestamp()]);
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function stockOpnameBahan(items, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getSheet('InventoryBahan');
    var rows = sheet.getDataRange().getValues();
    items.forEach(function(item) {
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === item.BahanID) {
          var stokFisik = parseInt(item.StokFisik);
          var stokSistem = parseInt(rows[i][3]) || 0;
          sheet.getRange(i + 1, 5).setValue(stokFisik);
          sheet.getRange(i + 1, 6).setValue(stokFisik - stokSistem);
          sheet.getRange(i + 1, 7).setValue(formatTimestamp());
          break;
        }
      }
    });
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function purchaseBahan(data, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getSheet('InventoryBahan');
    var qty = parseInt(data.Qty) || 0;
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.BahanID) {
        var newStok = (parseInt(rows[i][3]) || 0) + qty;
        sheet.getRange(i + 1, 4).setValue(newStok);
        sheet.getRange(i + 1, 7).setValue(formatTimestamp());
        break;
      }
    }
    _addCashflow('Pengeluaran', 'Pembelian Stok', '', 'Beli bahan: ' + data.NamaBahan + ' x' + qty, parseFloat(data.HargaBeli) || 0);
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

// ============================================================
// 5. MODUL ORDERS & SALES
// ============================================================
function getOrders(token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var data = sheetToObjects(getSheet('Orders'));
    data.reverse();
    return { success: true, data: data };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function getSales(token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var data = sheetToObjects(getSheet('StoreSales'));
    data.reverse();
    return { success: true, data: data };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function addOrder(data, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getSheet('Orders');
    var headers = sheet.getDataRange().getValues()[0];
    
    // Verifikasi Header Kolom J (Referral) & K (Tipe Pembayaran)
    if (!headers || headers.length < 10 || String(headers[9] || '').toLowerCase().indexOf('referral') === -1) {
      sheet.getRange(1, 10).setValue('Referral');
    }
    if (headers.length < 11 || String(headers[10] || '').toLowerCase().indexOf('tipe pembayaran') === -1) {
      sheet.getRange(1, 11).setValue('Tipe Pembayaran');
    }
    
    var newId = generateId('ORD-', sheet);
    var refCode = data.ReferralCode || '';
    var tipeBayar = data.TipePembayaran || 'Bayar di Akhir'; 

    sheet.appendRow([
      newId, formatTimestamp(), data.NamaPelanggan, data.KontakWA, data.Layanan, 
      parseFloat(data.Harga) || 0, 'Waiting', data.Catatan || '', data.DiskonInfo || '', refCode, tipeBayar
    ]);
    SpreadsheetApp.flush();
    if (refCode) _updateReferralOrder(refCode, newId, data.Harga);
    
    // 🟢 EKSEKUSI CASHFLOW INSTAN (Hanya untuk Bayar di Awal)
    if (tipeBayar === 'Bayar di Awal') {
       var nominal = parseFloat(data.Harga) || 0;
       if (nominal > 0) {
          _addCashflow('Pemasukan', 'Jasa', newId, 'Pesanan jasa (Lunas Awal): ' + data.Layanan, nominal);
       }
    }
    
    return { success: true, orderId: newId };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function updateOrderStatus(orderId, newStatus, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getSheet('Orders');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === orderId) {
        var oldStatus = rows[i][6];
        var tipeBayar = rows[i][10] || 'Bayar di Akhir'; // Membaca Index 10 (Kolom K)
        
        sheet.getRange(i + 1, 7).setValue(newStatus);
        
        if (newStatus === 'Selesai' && oldStatus !== 'Selesai') {
          var layanan = rows[i][4];
          var harga = rows[i][5];
          
          var cfRaw = getSheet('Cashflow').getDataRange().getValues();
          var isPemasukanSudahMasuk = false;
          var isKomisiSudahMasuk = false;
          for (var r = 1; r < cfRaw.length; r++) {
            if (String(cfRaw[r][4] || '') === orderId) {
              if (String(cfRaw[r][3] || '') === 'Jasa') isPemasukanSudahMasuk = true;
              if (String(cfRaw[r][3] || '') === 'Komisi') isKomisiSudahMasuk = true;
            }
          }
          
          // 🟢 EKSEKUSI CASHFLOW TERTUNDA (Hanya jika belum masuk & statusnya Bayar di Akhir)
          if (!isPemasukanSudahMasuk && tipeBayar !== 'Bayar di Awal') {
            _addCashflow('Pemasukan', 'Jasa', orderId, 'Pesanan jasa (Pelunasan Akhir): ' + layanan, harga);
          }
          
          // Logika Komisi Referral dipertahankan (Tetap tereksekusi saat Selesai)
          var refCode = String(rows[i][9] || '').trim();
          if (refCode && !isKomisiSudahMasuk) {
            var refSheet = getSheet('Referral');
            if (refSheet) {
              var refRows = refSheet.getDataRange().getValues();
              for (var ri = 1; ri < refRows.length; ri++) {
                if (String(refRows[ri][1] || '') === refCode && String(refRows[ri][7] || '') === 'Aktif') {
                  var komisiPct = parseFloat(refRows[ri][9]) || 0;
                  var namaRef = refRows[ri][2] || '';
                  if (komisiPct > 0) {
                    var nominalKomisi = Math.round(harga * komisiPct / 100);
                    _addCashflow('Pengeluaran', 'Komisi', orderId, 'Komisi referral: ' + namaRef + ' (' + komisiPct + '%)', nominalKomisi);
                  }
                  break;
                }
              }
            }
          }
        }
        return { success: true };
      }
    }
    return { success: false, message: 'Order tidak ditemukan.' };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function trackOrder(keyword) {
  try {
    var data = sheetToObjects(getSheet('Orders'));
    keyword = (keyword || '').toString().trim().toLowerCase();
    var found = data.filter(function(r) {
      return (r.OrderID && r.OrderID.toString().toLowerCase().indexOf(keyword) >= 0) ||
             (r.KontakWA && r.KontakWA.toString().toLowerCase().indexOf(keyword) >= 0) ||
             (r.NamaPelanggan && r.NamaPelanggan.toString().toLowerCase().indexOf(keyword) >= 0);
    });
    return { success: true, data: found };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function recordSale(data, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var invSheet = getSheet('InventoryStore');
    var menuSheet = getSheet('MenuStore');
    var saleSheet = getSheet('StoreSales');

    var produkId = data.ProdukID;
    var qty = parseInt(data.Qty) || 1;
    var invRows = invSheet.getDataRange().getValues();
    var stokSistem = 0;
    var invRowIdx = -1;

    for (var i = 1; i < invRows.length; i++) {
      if (invRows[i][0] === produkId) {
        stokSistem = parseInt(invRows[i][2]) || 0;
        invRowIdx = i; break;
      }
    }

    if (invRowIdx < 0) return { success: false, message: 'Produk tidak ditemukan.' };
    if (stokSistem < qty) return { success: false, message: 'Stok tidak cukup.' };

    var newStok = stokSistem - qty;
    invSheet.getRange(invRowIdx + 1, 3).setValue(newStok);
    invSheet.getRange(invRowIdx + 1, 6).setValue(formatTimestamp());

    var menuRows = menuSheet.getDataRange().getValues();
    for (var j = 1; j < menuRows.length; j++) {
      if (menuRows[j][0] === produkId) { menuSheet.getRange(j + 1, 5).setValue(newStok); break; }
    }

    var harga = parseFloat(data.HargaSatuan) || 0;
    var total = harga * qty;
    var newId = generateId('SAL-', saleSheet);
    saleSheet.appendRow([newId, formatTimestamp(), data.NamaPembeli || '', produkId, data.NamaProduk, qty, harga, total]);

    _addCashflow('Pemasukan', 'Penjualan', newId, 'Jual: ' + data.NamaProduk + ' x' + qty, total);
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}


// ============================================================
// 6. MODUL DISKON & KONTEN WEB (VERSI ASLI + DELETE)
// ============================================================
function getDiskonEvent() {
  try {
    var sheet = getSheet('DiskonEvent');
    if (!sheet) return { success: true, data: [] };
    return { success: true, data: sheetToObjects(sheet) };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function saveDiskonEvent(data, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getSheet('DiskonEvent');
    if (!sheet) return { success: false, message: 'Sheet DiskonEvent belum dibuat!' };
    var target = data.TargetLayanan || 'Semua Layanan';

    if (data.ID) {
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.ID) {
          sheet.getRange(i + 1, 1, 1, 6).setValues([[ data.ID, data.NamaEvent, parseFloat(data.Potongan) || 0, data.Tipe, data.Status, target ]]);
          break;
        }
      }
    } else {
      var newId = generateId('EVT-', sheet);
      sheet.appendRow([newId, data.NamaEvent, parseFloat(data.Potongan) || 0, data.Tipe, data.Status, target]);
    }
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function deleteDiskonEvent(id, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getSheet('DiskonEvent');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) { sheet.deleteRow(i + 1); break; }
    }
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function getKontenWeb() {
  try {
    var sheet = getSheet('KontenWeb');
    if (!sheet) return { success: true, data: [] };
    return { success: true, data: sheetToObjects(sheet) };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function saveKontenWeb(data, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getSheet('KontenWeb');
    if (!sheet) return { success: false, message: 'Sheet "KontenWeb" belum dibuat!' };
    if (data.ID) {
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.ID) {
          sheet.getRange(i + 1, 1, 1, 5).setValues([[ data.ID, data.Kategori, data.Keterangan, data.IsiKonten, data.Status ]]);
          break;
        }
      }
    } else {
      var newId = generateId('KW-', sheet);
      sheet.appendRow([newId, data.Kategori, data.Keterangan, data.IsiKonten, data.Status]);
    }
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function deleteKontenWeb(id, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getSheet('KontenWeb');
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) { sheet.deleteRow(i + 1); break; }
    }
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

// ============================================================
// 6B. MODUL REFERRAL
// ============================================================
var REFERRAL_HEADERS = ['ID', 'Kode', 'NamaReferral', 'Link', 'TotalKlik', 'TotalOrder', 'TotalRevenue', 'Status', 'Dibuat', 'KomisiPct'];

function getReferralAdmin(token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getOrCreateSheet('Referral', REFERRAL_HEADERS);
    return { success: true, data: sheetToObjects(sheet) };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function saveReferral(data, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getOrCreateSheet('Referral', REFERRAL_HEADERS);
    if (data.ID) {
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.ID) {
          sheet.getRange(i + 1, 3).setValue(data.NamaReferral || '');
          sheet.getRange(i + 1, 8).setValue(data.Status || 'Aktif');
          sheet.getRange(i + 1, 10).setValue(parseFloat(data.KomisiPct) || 0);
          break;
        }
      }
    } else {
      var newId = generateId('REF-', sheet);
      var kode = generateReferralCode();
      var link = getWebAppUrl() + '?page=home&ref=' + kode;
      sheet.appendRow([newId, kode, data.NamaReferral, link, 0, 0, 0, 'Aktif', formatTimestamp(), parseFloat(data.KomisiPct) || 0]);
    }
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function deleteReferral(id, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var sheet = getSheet('Referral');
    if (!sheet) return { success: false, message: 'Sheet Referral belum ada.' };
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) { sheet.getRange(i + 1, 8).setValue('Nonaktif'); break; }
    }
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function getReferralByCode(code) {
  try {
    var sheet = getSheet('Referral');
    if (!sheet) return null;
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][1] || '') === code && rows[i][7] === 'Aktif') {
        return { id: rows[i][0], kode: rows[i][1], nama: rows[i][2] };
      }
    }
    return null;
  } catch(e) { return null; }
}

function trackReferralClick(code) {
  try {
    var sheet = getSheet('Referral');
    if (!sheet || !code) return { success: true };
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][1] || '') === code && rows[i][7] === 'Aktif') {
        var current = parseInt(rows[i][4]) || 0;
        sheet.getRange(i + 1, 5).setValue(current + 1);
        break;
      }
    }
    return { success: true };
  } catch(e) { return { success: true }; }
}

function _updateReferralOrder(code, orderId, harga) {
  try {
    var sheet = getSheet('Referral');
    if (!sheet || !code) return;
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][1] || '') === code) {
        var totalOrder = (parseInt(rows[i][5]) || 0) + 1;
        var totalRevenue = (parseFloat(rows[i][6]) || 0) + (parseFloat(harga) || 0);
        sheet.getRange(i + 1, 6).setValue(totalOrder);
        sheet.getRange(i + 1, 7).setValue(totalRevenue);
        break;
      }
    }
  } catch(e) { /* silent fail */ }
}

// ============================================================
// 7. CASHFLOW & DASHBOARD
// ============================================================
function _addCashflow(tipe, kategori, sumberId, keterangan, jumlah) {
  var sheet = getSheet('Cashflow');
  var newId = generateId('CF-', sheet);
  sheet.appendRow([newId, formatTimestamp(), tipe, kategori, sumberId, keterangan, jumlah]);
}

function addCashflowManual(data, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    _addCashflow(data.Tipe, data.Kategori, '', data.Keterangan, parseFloat(data.Jumlah) || 0);
    return { success: true };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function getCashflow(filters, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var data = sheetToObjects(getSheet('Cashflow'));
    if (filters && filters.startDate) {
      var start = new Date(filters.startDate);
      data = data.filter(function(r) { return r.Tanggal && new Date(r.Tanggal) >= start; });
    }
    if (filters && filters.endDate) {
      var end = new Date(filters.endDate);
      end.setHours(23,59,59);
      data = data.filter(function(r) { return r.Tanggal && new Date(r.Tanggal) <= end; });
    }
    data.reverse();
    return { success: true, data: data };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function getDashboardSummary(token, period) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  period = period || 'bulan_ini'; 
  
  try {
    var today = new Date();
    var tz = 'Asia/Jakarta'; 
    var f1 = Utilities.formatDate(today, tz, 'yyyy-MM-dd');
    var f2 = Utilities.formatDate(today, tz, 'dd/MM/yyyy');
    var f3 = Utilities.formatDate(today, tz, 'MM/dd/yyyy');
    var f4 = parseInt(Utilities.formatDate(today, tz, 'MM')) + '/' + parseInt(Utilities.formatDate(today, tz, 'dd')) + '/' + Utilities.formatDate(today, tz, 'yyyy');
    
    var currentMonthNum = Utilities.formatDate(today, tz, 'MM');
    var currentYearNum = Utilities.formatDate(today, tz, 'yyyy');
    var currentYearMonth = Utilities.formatDate(today, tz, 'yyyy-MM');

    function cekBulanIni(val) {
      if (!val) return false;
      var d = new Date(val); 
      if (!isNaN(d.getTime())) return (Utilities.formatDate(d, tz, 'MM') === currentMonthNum && Utilities.formatDate(d, tz, 'yyyy') === currentYearNum);
      var str = String(val);
      return (str.indexOf(currentYearMonth) !== -1 || str.indexOf('/' + currentMonthNum + '/' + currentYearNum) !== -1 || str.indexOf('/' + parseInt(currentMonthNum) + '/' + currentYearNum) !== -1);
    }

    var cfData = sheetToObjects(getSheet('Cashflow'));
    var todayIncome = 0;
    cfData.forEach(function(r) {
      if (r.Tipe && String(r.Tipe).trim() === 'Pemasukan' && r.Tanggal) {
        var tStr = String(r.Tanggal);
        if (tStr.indexOf(f1) !== -1 || tStr.indexOf(f2) !== -1 || tStr.indexOf(f3) !== -1 || tStr.indexOf(f4) !== -1) {
           var numStr = String(r.Jumlah).replace(/Rp/gi, '').replace(/\./g, '').trim().replace(/,/g, '.');
           todayIncome += parseFloat(numStr) || 0;
        }
      }
    });

    var ordData = sheetToObjects(getSheet('Orders'));
    var activeOrders = ordData.filter(function(r) { return r.Status && String(r.Status).trim() !== 'Selesai' && String(r.Status).trim() !== 'Batal'; }).length;

    var invData = sheetToObjects(getSheet('InventoryStore'));
    var lowStock = invData.filter(function(r) { return (parseInt(r.StokSistem) || 0) <= 3; });

    var layananMap = {};
    ordData.forEach(function(r) {
      if (!r.Layanan) return;
      if (period === 'bulan_ini' && !cekBulanIni(r.Tanggal)) return; 
      var items = String(r.Layanan).trim().split(','); 
      items.forEach(function(item) {
        var cleanName = item.replace(/\[.*?\]/g, '').replace(/\(\d+[xX]\)/gi, '').replace(/@.*/g, '').trim();
        if (cleanName.endsWith('-')) cleanName = cleanName.slice(0, -1).trim();
        if (cleanName !== '') layananMap[cleanName] = (layananMap[cleanName] || 0) + 1;
      });
    });

    var topLayanan = [];
    for (var key in layananMap) { if (layananMap[key] > 0) topLayanan.push({ nama: key, total: layananMap[key] }); }
    topLayanan.sort(function(a, b) { return b.total - a.total; });

    var topProduk = [];
    try {
      var penSheet = getSheet('StoreSales');
      if (penSheet) {
        var penData = sheetToObjects(penSheet);
        var produkMap = {};
        penData.forEach(function(r) {
          var prodName = r.NamaProduk || r.Produk || r.Nama || r.Item;
          if (!prodName) return;
          if (period === 'bulan_ini' && !cekBulanIni(r.Tanggal)) return; 
          var qty = parseInt(r.Qty || r.Jumlah || r.Pcs || 1) || 1;
          produkMap[String(prodName).trim()] = (produkMap[String(prodName).trim()] || 0) + qty;
        });
        for (var pkey in produkMap) { if (produkMap[pkey] > 0) topProduk.push({ nama: pkey, total: produkMap[pkey] }); }
        topProduk.sort(function(a, b) { return b.total - a.total; });
      }
    } catch(e) {} 

    return { success: true, todayIncome: todayIncome, activeOrders: activeOrders, lowStock: lowStock, topLayanan: topLayanan.slice(0, 5), topProduk: topProduk.slice(0, 5) };
  } catch(e) { return { success: false, message: e.toString() }; }
}

// ============================================================
// 8. UPLOAD GOOGLE DRIVE
// ============================================================
var UPLOAD_FOLDER_ID = '19pGpHPMm16U6KR-WqDF1K5Tr6UsJvFis'; 

function uploadImageToDrive(base64Data, fileName, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var splitBase = base64Data.split(',');
    var type = splitBase[0].split(';')[0].replace('data:', '');
    var byteCharacters = Utilities.base64Decode(splitBase[1]);
    var blob = Utilities.newBlob(byteCharacters, type, fileName);

    var folder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return { success: true, url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1080' };
  } catch(e) { return { success: false, message: e.toString() }; }
}

// ============================================================
// 9. ENGINE PROFIT SHARING & HISTORI (FINAL PERFECTED)
// ============================================================
function getProfitSharingData(token, startDate, endDate) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  
  try {
    if (!startDate || !endDate || startDate === "undefined" || endDate === "undefined") {
      var now = new Date(); var y = now.getFullYear(); var m = now.getMonth();
      if (!startDate || startDate === "undefined") {
        var fDay = new Date(y, m, 1);
        startDate = fDay.getFullYear() + '-' + String(fDay.getMonth() + 1).padStart(2, '0') + '-01';
      }
      if (!endDate || endDate === "undefined") {
        var lDay = new Date(y, m + 1, 0);
        endDate = lDay.getFullYear() + '-' + String(lDay.getMonth() + 1).padStart(2, '0') + '-' + String(lDay.getDate()).padStart(2, '0');
      }
    }

    var ordSheet = getSheet('Orders');
    var setSheet = getSheet('Settings_Profit');
    var jasaSheet = getSheet('MenuJasa');
    var storeSheet = getSheet('MenuStore');
    
    if (!ordSheet || !setSheet || !jasaSheet || !storeSheet) return { success: false, message: 'Sheet tidak lengkap.' };
    
    var ordData = sheetToObjects(ordSheet);
    var setValues = setSheet.getDataRange().getValues();
    var configHPP = {}; var targetOmset = 0; var configPct = {};
    
    for (var i = 1; i < setValues.length; i++) {
      var row = setValues[i];
      if (row[0] && row[1] !== "") {
        var keyLayanan = String(row[0] || '').trim().toLowerCase();
        configHPP[keyLayanan] = { hpp: Number(row[1]), kategori: String(row[2] || '').trim().toUpperCase() };
      }
      if (row[4] && row[5] !== "") { targetOmset += Number(row[5]); }
      if (row[7]) {
        var peran = String(row[7] || '').trim().toLowerCase();
        configPct[peran] = { clean: parsePercent(row[8]), repair: parsePercent(row[9]) };
      }
    }
    
    var hargaAsliMenu = {};
    var jasaData = jasaSheet.getDataRange().getValues();
    for(var j=1; j<jasaData.length; j++) { if(jasaData[j][1]) hargaAsliMenu[String(jasaData[j][1] || '').trim().toLowerCase()] = Number(jasaData[j][3]) || 0; }
    var storeData = storeSheet.getDataRange().getValues();
    for(var s=1; s<storeData.length; s++) { if(storeData[s][1]) hargaAsliMenu[String(storeData[s][1] || '').trim().toLowerCase()] = Number(storeData[s][3]) || 0; }

    function cariHargaAsli(namaOrder) {
      var nama = String(namaOrder || '').trim().toLowerCase();
      if (!nama) return 0;
      if (hargaAsliMenu[nama] !== undefined) return hargaAsliMenu[nama];
      var menuKeys = Object.keys(hargaAsliMenu);
      for (var i = 0; i < menuKeys.length; i++) { if (menuKeys[i].indexOf(nama) !== -1) return hargaAsliMenu[menuKeys[i]]; }
      for (var i = 0; i < menuKeys.length; i++) { if (nama.indexOf(menuKeys[i]) !== -1) return hargaAsliMenu[menuKeys[i]]; }
      return 0;
    }
    
    ordData.sort(function(a, b) { return new Date(a.Tanggal) - new Date(b.Tanggal); });

    var sParts = String(startDate || '').split('-'); 
    var eParts = String(endDate || '').split('-');
    if (sParts.length < 3 || eParts.length < 3) return { success: false, message: 'Format tanggal tidak valid.' };
    var sDate = new Date(sParts[0], sParts[1] - 1, sParts[2], 0, 0, 0);
    var eDate = new Date(eParts[0], eParts[1] - 1, eParts[2], 23, 59, 59);

    var omsetGrossBulanan = 0;
    var alokasiHPPBulanan = 0;
    var omsetNettBulanan = 0;
    var targetTerpenuhi = 0; 

    var dompet = {
      ownerBase: 0, ownerPct: 0, cuciBase: 0, cuciPct: 0, repairPct: 0,
      adminBase: 0, adminPct: 0, webBase: 0, webPct: 0, kasBase: 0, kasPct: 0,
      zakatPct: 0, investorPct: 0
    };

    var keysHPP = Object.keys(configHPP).sort(function(a, b) { return b.length - a.length; });

    // Pre-load referral map (sekali scan, bukan per-order)
    var referralMap = {};
    var refSheet = getSheet('Referral');
    if (refSheet) {
      var refRows = refSheet.getDataRange().getValues();
      for (var ri = 1; ri < refRows.length; ri++) {
        var kode = String(refRows[ri][1] || '').trim();
        if (kode && String(refRows[ri][7] || '') === 'Aktif') {
          referralMap[kode] = {
            nama: refRows[ri][2] || '',
            komisiPct: parseFloat(refRows[ri][9]) || 0
          };
        }
      }
    }
    var totalKomisiBulanan = 0;
    var komisiBreakdown = [];  // untuk detail popup per order

    for (var o = 0; o < ordData.length; o++) {
      var r = ordData[o];
      if (!r.Tanggal || String(r.Status || '').trim().toLowerCase() !== 'selesai') continue;
      
      var oDate = parseDateSafe(r.Tanggal);
      if (!oDate || oDate < sDate || oDate > eDate) continue;
      
      var hargaFinalNota = Number(r.Harga) || 0;
      var layananText = String(r.Layanan || '');
      var items = layananText.split(/[,;\n]+/);
      var orderGrossTotal = 0;
      var orderQtyTotal = 0;
      var parsedItems = [];
      
      for (var it = 0; it < items.length; it++) {
        var itemStr = String(items[it] || '').trim();
        if (!itemStr) continue;
        
        var cleanItemStr = String(itemStr).replace(/\[.*?\]/g, '').trim();
        var qtyM = cleanItemStr.match(/\(?\s*(\d+)\s*[xX]\s*\)?/i);
        var qty = (qtyM && qtyM[1]) ? parseInt(qtyM[1]) : 1;
        if (qty < 1) qty = 1;
        
        var remainingName = String(cleanItemStr)
          .replace(/\(?\s*\d+\s*[xX]\s*\)?/gi, '').replace(/@\s*Rp\s*[\d\.]+/gi, '').replace(/Rp\s*[\d\.]+/gi, '').replace(/[•\-–—]/g, '').trim().toLowerCase();
        
        var hargaAsliSatuan = cariHargaAsli(remainingName);
        if (hargaAsliSatuan === 0) {
          var prcM = cleanItemStr.match(/Rp\s*([\d\.]+)/i);
          hargaAsliSatuan = (prcM && prcM[1]) ? parseInt(String(prcM[1]).replace(/\./g, '')) : 0;
        }
        
        if (qty === 1 && items.length === 1 && hargaAsliSatuan > 0 && hargaFinalNota > 0) {
          if (hargaFinalNota >= hargaAsliSatuan * 1.4) {
            qty = Math.round(hargaFinalNota / hargaAsliSatuan);
            if (qty < 2) qty = 2;
          }
        }
        
        var grossItem = hargaAsliSatuan * qty;
        orderGrossTotal += grossItem;
        orderQtyTotal += qty;
        
        var itemHPP = 0;
        var jalur = 'A';
        var matchedForward = false;
        var rn = remainingName;
        
        for (var k = 0; k < keysHPP.length; k++) {
          if (!rn) break;
          var keyMatch = keysHPP[k];
          if (rn.indexOf(keyMatch) !== -1) {
            itemHPP += configHPP[keyMatch].hpp;
            if (configHPP[keyMatch].kategori === 'REPAIR') jalur = 'B';
            rn = String(rn || '').replace(keyMatch, '').trim();
            matchedForward = true;
          }
        }
        
        if (!matchedForward && rn) {
          for (var k2 = 0; k2 < keysHPP.length; k2++) {
            var keyRev = keysHPP[k2];
            if (keyRev.indexOf(rn) !== -1) {
              itemHPP += configHPP[keyRev].hpp;
              if (configHPP[keyRev].kategori === 'REPAIR') jalur = 'B';
              break;
            }
          }
        }
        parsedItems.push({ gross: grossItem, totalHPP: itemHPP * qty, jalur: jalur });
      }
      
      var catatan = String(r.Catatan || '').toLowerCase();
      if (catatan) {
        for (var kk = 0; kk < keysHPP.length; kk++) {
          var keyRepair = keysHPP[kk];
          var cfg = configHPP[keyRepair];
          
          if (cfg && cfg.kategori === 'REPAIR') {
             if (catatan.indexOf(keyRepair) !== -1) {
                var alreadyInLayanan = layananText.toLowerCase().indexOf(keyRepair) !== -1;
                if (!alreadyInLayanan) {
                  var repairQty = 1;
                  if (catatan.match(/semua|2 pasang|3 pasang/i)) { repairQty = orderQtyTotal > 0 ? orderQtyTotal : 1; }
                  parsedItems.push({ gross: 0, totalHPP: cfg.hpp * repairQty, jalur: 'B' });
                  catatan = catatan.replace(new RegExp(keyRepair, 'g'), '');
                }
             }
          }
        }
      }
      
      if (orderGrossTotal === 0 && parsedItems.length > 0 && hargaFinalNota > 0) orderGrossTotal = hargaFinalNota; 
      if (orderGrossTotal === 0) continue;

      // Komisi referral (dipotong sebelum target — ikut alur profit sharing)
      var komisiOrder = 0;
      var refCode = String(r.Referral || '').trim();
      if (refCode && referralMap[refCode] && referralMap[refCode].komisiPct > 0) {
        komisiOrder = Math.round(hargaFinalNota * referralMap[refCode].komisiPct / 100);
        totalKomisiBulanan += komisiOrder;
        komisiBreakdown.push({
          orderId: String(r.OrderID || ''),
          layanan: String(r.Layanan || ''),
          namaRef: String(referralMap[refCode].nama),
          kodeRef: refCode,
          komisiPct: referralMap[refCode].komisiPct,
          nominal: komisiOrder,
          tanggal: String(r.Tanggal || '')
        });
      }

      var ratio = orderGrossTotal > 0 ? (hargaFinalNota / orderGrossTotal) : 1;

      parsedItems.forEach(function(pItem) {
        var discountedGross = pItem.gross * ratio;
        var nettItem = discountedGross - pItem.totalHPP;
        
        // Potong komisi referral proporsional per item (ikut alur target)
        var komisiItem = 0;
        if (komisiOrder > 0 && orderGrossTotal > 0) {
          komisiItem = Math.round(komisiOrder * (pItem.gross / orderGrossTotal));
          nettItem -= komisiItem;
        }
        
        omsetGrossBulanan += discountedGross;
        alokasiHPPBulanan += pItem.totalHPP;
        omsetNettBulanan += nettItem;

        var porsiKePersenNett = 0;

        if (targetTerpenuhi < targetOmset) {
          if (targetTerpenuhi + nettItem <= targetOmset) {
            targetTerpenuhi += nettItem;
          } else {
            var sisaKeTarget = targetOmset - targetTerpenuhi;
            porsiKePersenNett = nettItem - sisaKeTarget;
            targetTerpenuhi = targetOmset;

            dompet.ownerBase = 50000; dompet.cuciBase = 50000;
            dompet.adminBase = 50000; dompet.webBase = 50000;
            dompet.kasBase = targetOmset - 200000;
          }
        } else { porsiKePersenNett = nettItem; }

        if (porsiKePersenNett !== 0) {
          for (var peranKey in configPct) {
            if (!configPct.hasOwnProperty(peranKey)) continue;
            var rate = (pItem.jalur === 'A') ? configPct[peranKey].clean : configPct[peranKey].repair;
            if (rate > 0) {
              if (peranKey === 'owner') dompet.ownerPct += porsiKePersenNett * rate;
              else if (peranKey === 'kas danee' || peranKey === 'kas') dompet.kasPct += porsiKePersenNett * rate;
              else if (peranKey === 'spesialis cuci' || peranKey === 'cuci') dompet.cuciPct += porsiKePersenNett * rate;
              else if (peranKey === 'spesialis repair' || peranKey === 'repair') dompet.repairPct += porsiKePersenNett * rate;
              else if (peranKey === 'admin') dompet.adminPct += porsiKePersenNett * rate;
              else if (peranKey === 'engineer web' || peranKey === 'web') dompet.webPct += porsiKePersenNett * rate;
              else if (peranKey === 'zakat') dompet.zakatPct += porsiKePersenNett * rate;
              else if (peranKey === 'investor') dompet.investorPct += porsiKePersenNett * rate;
            }
          }
        }
      });
    }

    omsetGrossBulanan = Math.round(omsetGrossBulanan);
    alokasiHPPBulanan = Math.round(alokasiHPPBulanan);
    totalKomisiBulanan = Math.round(totalKomisiBulanan);
    // omsetNettBulanan sudah include pemotongan komisi (dipotong di nettItem)
    omsetNettBulanan = Math.round(omsetNettBulanan);

    return { success: true, omsetGross: omsetGrossBulanan, alokasiHPP: alokasiHPPBulanan, totalKomisi: totalKomisiBulanan, omsetNett: omsetNettBulanan, target: targetOmset, dompet: dompet, komisiBreakdown: komisiBreakdown };

  } catch(e) { return { success: false, message: 'Kesalahan Engine Profit: ' + e.toString() }; }
}

// ============================================================
// ENGINE HISTORI BUKU BESAR + GROWTH TRACKER (TURN 172)
// ============================================================
function getProfitHistorySummary(token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  
  try {
    var tempResults = [];
    var now = new Date();
    var namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    // Tarik 4 bulan ke belakang untuk mendapatkan "Batu Pijakan" (Pembanding)
    for (var i = 1; i <= 4; i++) {
       var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
       var y = d.getFullYear();
       var m = String(d.getMonth() + 1).padStart(2, '0');
       
       var firstDay = y + '-' + m + '-01';
       var lastDay = y + '-' + m + '-' + String(new Date(y, d.getMonth() + 1, 0).getDate());

       var res = getProfitSharingData(token, firstDay, lastDay); 
       var rNett = (res && res.success) ? res.omsetNett : 0;
       var rGross = (res && res.success) ? res.omsetGross : 0;
       var rHpp = (res && res.success) ? res.alokasiHPP : 0;
       var rTarget = (res && res.success) ? res.target : 0;

       tempResults.push({
          bulan: namaBulan[d.getMonth()] + ' ' + y,
          gross: rGross, hpp: rHpp, nett: rNett, target: rTarget
       });
    }

    var finalResults = [];
    // Hitung selisih 3 bulan terakhir (Indeks 0, 1, 2) dibandingkan bulan sebelumnya
    for (var j = 0; j < 3; j++) {
       var currMonth = tempResults[j];     // Bulan yang sedang dihitung
       var prevMonth = tempResults[j+1];   // 1 Bulan sebelumnya (Patokan)
       
       var growthRp = currMonth.nett - prevMonth.nett;
       var growthPct = 0;

       // Rumus Persentase Growth (Aman dari pembagian angka nol)
       if (prevMonth.nett !== 0) {
          growthPct = (growthRp / Math.abs(prevMonth.nett)) * 100;
       } else {
          if (growthRp > 0) growthPct = 100;
          else if (growthRp < 0) growthPct = -100;
       }

       currMonth.growthRp = growthRp;
       currMonth.growthPct = growthPct.toFixed(1); // Potong 1 angka di belakang koma
       
       finalResults.push(currMonth);
    }

    return { success: true, data: finalResults };
  } catch(e) {
    return { success: false, message: 'Error Engine Histori: ' + e.toString() };
  }
}

// ============================================================
// THEME ENGINE - ENGINE KONFIGURASI WARNA (ULTRA-FAST CACHE)
// ============================================================

// Fungsi mengambil warna aktif saat ini
function getThemeSettings() {
  try {
    var p = PropertiesService.getScriptProperties();
    return {
      success: true,
      primary: p.getProperty('THEME_PRIMARY') || '#034BB9', // Default warna zoom logo baru
      hover: p.getProperty('THEME_HOVER') || '#023C94'
    };
  } catch(e) { 
    return { success: false, primary: '#034BB9', hover: '#023C94', message: e.toString() }; 
  }
}

// Fungsi menyimpan warna baru dari panel admin
function saveThemeSettings(primaryColor, hoverColor, token) {
  if (!checkAuth(token)) return { success: false, message: 'Tidak terautentikasi.' };
  try {
    var p = PropertiesService.getScriptProperties();
    p.setProperty('THEME_PRIMARY', primaryColor);
    p.setProperty('THEME_HOVER', hoverColor);
    return { success: true };
  } catch(e) { 
    return { success: false, message: e.toString() }; 
  }
}