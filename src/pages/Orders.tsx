import React, { useState, useEffect, useCallback } from 'react';
import { getAll as getOrders, create as createOrder, updateStatus as updateOrderStatus, update as updateOrder, trackOrder } from '../lib/services/order-service';
import { getAllDiskon, getAllReferral } from '../lib/services/konten-service';
import { getAll as getMenuJasa } from '../lib/services/menu-jasa-service';
import { formatCurrency, formatDate } from '../lib/utils';
import { getSetting, saveSetting } from '../lib/services/settings-service';
import type { OrderRow, OrderStatus, DiskonEventRow, MenuJasaRow, ReferralRow } from '../lib/types-supabase';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const ORDER_STATUSES = ['Semua', 'Waiting', 'Checking', 'Proses Cleaning', 'Proses Repair', 'Proses Pengeringan', 'Ready', 'Selesai', 'Batal'] as const;
const TERMINAL_STATUSES = ['Selesai', 'Batal'];

const STATUS_CONFIG: Record<string, { icon: string; cls: string }> = {
  Waiting: { icon: 'hourglass_empty', cls: 'oc-status-waiting' },
  Checking: { icon: 'search', cls: 'oc-status-checking' },
  'Proses Repair': { icon: 'build', cls: 'oc-status-proses' },
  'Proses Cleaning': { icon: 'cleaning_services', cls: 'oc-status-proses' },
  'Proses Pengeringan': { icon: 'air', cls: 'oc-status-proses' },
  Ready: { icon: 'check_circle', cls: 'oc-status-ready' },
  Selesai: { icon: 'task_alt', cls: 'oc-status-selesai' },
  Batal: { icon: 'cancel', cls: 'oc-status-batal' },
};

function isTerminal(status: string): boolean { return TERMINAL_STATUSES.includes(status); }

function getActionIcon(targetStatus: string): string {
  switch (targetStatus) {
    case 'Checking': return 'search';
    case 'Proses Cleaning': return 'cleaning_services';
    case 'Proses Repair': return 'build';
    case 'Proses Pengeringan': return 'air';
    case 'Ready': return 'check_circle';
    case 'Selesai': return 'task_alt';
    case 'Batal': return 'cancel';
    default: return 'arrow_forward';
  }
}

function getNextStatuses(status: string): { label: string; target: string; variant: string }[] {
  switch (status) {
    case 'Waiting':
      return [
        { label: '▶ Checking', target: 'Checking', variant: 'btn-primary' },
        { label: '✕ Batal', target: 'Batal', variant: 'btn-danger' },
      ];
    case 'Checking':
      return [
        { label: '▶ Proses Cleaning', target: 'Proses Cleaning', variant: 'btn-primary' },
        { label: '✕ Batal', target: 'Batal', variant: 'btn-danger' },
      ];
    case 'Proses Cleaning':
      return [
        { label: '▶ Proses Repair', target: 'Proses Repair', variant: 'btn-primary' },
        { label: '✓ Selesai', target: 'Selesai', variant: 'btn-success' },
        { label: '✕ Batal', target: 'Batal', variant: 'btn-danger' },
      ];
    case 'Proses Repair':
      return [
        { label: '▶ Proses Pengeringan', target: 'Proses Pengeringan', variant: 'btn-primary' },
        { label: '✓ Selesai', target: 'Selesai', variant: 'btn-success' },
        { label: '✕ Batal', target: 'Batal', variant: 'btn-danger' },
      ];
    case 'Proses Pengeringan':
      return [
        { label: '▶ Ready', target: 'Ready', variant: 'btn-primary' },
        { label: '✓ Selesai', target: 'Selesai', variant: 'btn-success' },
        { label: '✕ Batal', target: 'Batal', variant: 'btn-danger' },
      ];
    case 'Ready':
      return [
        { label: '✓ Selesai', target: 'Selesai', variant: 'btn-success' },
        { label: '✕ Batal', target: 'Batal', variant: 'btn-danger' },
      ];
    default:
      return [];
  }
}

function Orders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Add order modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRISModal, setShowQRISModal] = useState(false);
  const [qrisImage, setQrisImage] = useState<string>('');
  const [addNama, setAddNama] = useState('');
  const [addWa, setAddWa] = useState('');
  const [addCatatan, setAddCatatan] = useState('');
  const [addTipeBayar, setAddTipeBayar] = useState('Bayar di Akhir');
  const [addReferral, setAddReferral] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Cart (multi-item per order, seperti AppScript) ──
  interface CartItem { nama: string; harga: number; qty: number; service_id?: string; diskon: number; }
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  // Cart input: layanan + harga
  const [cartInputLayanan, setCartInputLayanan] = useState('');
  const [cartInputHarga, setCartInputHarga] = useState('');
  // Cart input: per-item diskon (seperti AppScript: Tanpa, Event, ManualPersen, ManualNominal)
  const [cartDiskonTipe, setCartDiskonTipe] = useState<'Tanpa' | 'Event' | 'ManualPersen' | 'ManualNominal'>('Tanpa');
  const [cartDiskonEventId, setCartDiskonEventId] = useState('');
  const [cartDiskonNama, setCartDiskonNama] = useState('');
  const [cartDiskonNilai, setCartDiskonNilai] = useState('');

  // Global diskon state (order-level, like AppScript)
  const [availableDiskon, setAvailableDiskon] = useState<DiskonEventRow[]>([]);
  const [diskonLoading, setDiskonLoading] = useState(false);
  const [addDiskonTipe, setAddDiskonTipe] = useState<'Tanpa' | 'Event' | 'ManualPersen' | 'ManualNominal'>('Tanpa');
  const [addDiskonEventId, setAddDiskonEventId] = useState('');
  const [addDiskonNama, setAddDiskonNama] = useState('');
  const [addDiskonNilai, setAddDiskonNilai] = useState('');
  const [addSuccessMsg, setAddSuccessMsg] = useState('');

  // Layanan list
  const [layananList, setLayananList] = useState<MenuJasaRow[]>([]);
  const [layananLoading, setLayananLoading] = useState(false);
  const [referralList, setReferralList] = useState<ReferralRow[]>([]);
  const [referralLoading, setReferralLoading] = useState(false);

  // Detail modal
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [cetakStruk, setCetakStruk] = useState<OrderRow | null>(null);

  // Edit modal
  const [editOrder, setEditOrder] = useState<OrderRow | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editWa, setEditWa] = useState('');
  const [editLayanan, setEditLayanan] = useState('');
  const [editHarga, setEditHarga] = useState('');
  const [editCatatan, setEditCatatan] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => { fetchOrders(); }, []);

  // Load QRIS image from database settings
  useEffect(() => {
    getSetting('qris_image').then((res) => {
      if (res.success && res.data) {
        setQrisImage(res.data);
      }
    }).catch(() => {});
  }, []);

  // Fetch diskon events + layanan when add modal opens
  useEffect(() => {
    if (showAddModal) {
      setDiskonLoading(true);
      setLayananLoading(true);
      getAllDiskon().then((res) => {
        if (res.success) {
          setAvailableDiskon((res.data || []).filter((d) => d.status === 'Aktif' || d.status === 'Admin Saja'));
        }
      }).finally(() => setDiskonLoading(false));
      getMenuJasa().then((res) => {
        if (res.success) {
          setLayananList(res.data || []);
        }
      }).finally(() => setLayananLoading(false));
      setReferralLoading(true);
      getAllReferral().then((res) => {
        if (res.success) {
          setReferralList(res.data || []);
        }
      }).finally(() => setReferralLoading(false));
    }
  }, [showAddModal]);

  async function fetchOrders() {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrders();
      if (res.success) {
        setOrders(res.data || []);
      } else {
        setError(res.error || 'Gagal mengambil data pesanan');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal mengambil data pesanan');
    } finally {
      setLoading(false);
    }
  }

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { fetchOrders(); return; }
    setSearching(true);
    try {
      const res = await trackOrder(q.trim());
      if (res.success && res.data) {
        setOrders(Array.isArray(res.data) ? res.data : [res.data]);
      } else {
        fetchOrders();
      }
    } catch {
      fetchOrders();
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, doSearch]);

  const filteredOrders = filter === 'Semua' ? orders : orders.filter((o) => o.status === filter);

  async function handleStatusUpdate(orderId: string, newStatus: OrderStatus) {
    try {
      await updateOrderStatus(orderId, newStatus);
      await fetchOrders();
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui status');
    }
  }

  // ── Cart functions (seperti AppScript) ──

  function calcItemDiskon(hargaAsli: number): { potongan: number; namaLabel: string; hargaFinal: number } {
    let potongan = 0;
    let label = '';
    if (cartDiskonTipe === 'Event' && cartDiskonEventId) {
      const ev = availableDiskon.find(d => d.id === cartDiskonEventId);
      if (ev) {
        potongan = ev.tipe === 'Persentase'
          ? Math.round(hargaAsli * (ev.potongan / 100))
          : Math.min(ev.potongan, hargaAsli);
        label = ' [' + ev.nama_event + ']';
      }
    } else if (cartDiskonTipe === 'ManualPersen') {
      const pct = parseFloat(cartDiskonNilai) || 0;
      potongan = Math.round(hargaAsli * (pct / 100));
      label = ' [' + (cartDiskonNama.trim() || 'Diskon Manual') + ' ' + pct + '%]';
    } else if (cartDiskonTipe === 'ManualNominal') {
      const nominal = parseFloat(cartDiskonNilai) || 0;
      potongan = Math.min(nominal, hargaAsli);
      label = ' [' + (cartDiskonNama.trim() || 'Diskon Manual') + ' -' + formatCurrency(potongan) + ']';
    }
    return { potongan, namaLabel: label, hargaFinal: hargaAsli - potongan };
  }

  function addToCart() {
    if (!cartInputLayanan.trim() || !cartInputHarga.trim()) {
      setError('Pilih layanan terlebih dahulu'); return;
    }
    const hargaAsli = parseFloat(cartInputHarga);
    if (!hargaAsli || hargaAsli <= 0) { setError('Harga tidak valid'); return; }

    const { namaLabel, hargaFinal } = calcItemDiskon(hargaAsli);
    const namaFinal = cartInputLayanan + (namaLabel || '');

    // Cari service_id dari dropdown yang dipilih
    const selectedService = layananList.find((s) => s.nama_layanan === cartInputLayanan.trim());

    // Hitung diskon per item
    const diskonPerItem = hargaAsli - hargaFinal;

    // Reset per-item diskon (seperti AppScript)
    setCartDiskonTipe('Tanpa');
    setCartDiskonEventId('');
    setCartDiskonNama('');
    setCartDiskonNilai('');

    setCartItems(prev => {
      const exist = prev.find(x => x.nama === namaFinal && x.harga === hargaFinal);
      if (exist) {
        return prev.map(x =>
          x.nama === namaFinal && x.harga === hargaFinal
            ? { ...x, qty: x.qty + 1 }
            : x
        );
      }
      return [...prev, {
        nama: namaFinal,
        harga: hargaFinal,
        qty: 1,
        service_id: selectedService?.id,
        diskon: diskonPerItem,
      }];
    });
    setCartInputLayanan('');
    setCartInputHarga('');
    setError(null);
  }

  function removeFromCart(idx: number) {
    setCartItems(prev => prev.filter((_, i) => i !== idx));
  }

  function getSubtotal(): number {
    return cartItems.reduce((sum, item) => sum + item.harga * item.qty, 0);
  }

  function buildLayananText(): string {
    return cartItems.map(item =>
      `${item.nama} (${item.qty}x) @ ${formatCurrency(item.harga)}`
    ).join(', ');
  }

  // ── End cart functions ──

  // ── Struk / Receipt helpers (seperti AppScript) ──
  interface StrukItem { namaMurni: string; qty: number; hargaSatuan: number; promoLabel: string; }

  function parseLayananItems(layanan: string): StrukItem[] {
    if (!layanan) return [];
    return layanan.split(', ').map((part) => {
      const p = part.split(' @ ');
      const namaPart = p[0]?.trim() || '';
      const hargaStr = p[1]?.trim() || '0';
      const hargaSatuan = parseInt(hargaStr.replace(/[^0-9]/g, '')) || 0;
      const qtyMatch = namaPart.match(/\((\d+)x\)/);
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      const promoMatch = namaPart.match(/\[(.*?)\]/);
      const promoLabel = promoMatch ? promoMatch[1] : '';
      const namaMurni = namaPart.replace(/\s*\(\d+x\)/, '').replace(/\s*\[.*?\]/g, '').trim();
      return { namaMurni, qty, hargaSatuan, promoLabel };
    });
  }

  function extractDiskonNominal(info: string): number {
    if (!info) return 0;
    // Pattern: "Event Name @ -Rp5.000" or "Event Name: -Rp5.000"
    const match = info.match(/(?:@|:)\s*-?Rp?\s*([\d.,]+)/i);
    if (match) return parseInt(match[1].replace(/[.,]/g, '')) || 0;
    const numMatch = info.match(/[\d.,]+/);
    return numMatch ? parseInt(numMatch[0].replace(/[.,]/g, '')) || 0 : 0;
  }
  // ── End struk helpers ──

  // ── Cetak Struk via iframe (seperti AppScript, biar ga 12 halaman) ──
  const handlePrintStruk = useCallback(() => {
    const o = cetakStruk;
    if (!o) return;

    const items = parseLayananItems(o.layanan || '');
    const subtotal = items.reduce((s, i) => s + i.hargaSatuan * i.qty, 0);
    const diskonNominal = extractDiskonNominal(o.diskon_info || '');
    const total = o.harga ?? 0;
    const totalAsli = total + diskonNominal;
    const persenHemat = totalAsli > 0 ? Math.round((diskonNominal / totalAsli) * 100) : 0;

    // Build HTML rows
    let barisLayanan = '';
    let totalHematItem = 0;

    items.forEach((item) => {
      // Cari harga normal dari layananList
      const svc = layananList.find((s) => s.nama_layanan === item.namaMurni);
      const normalSatuan = svc ? svc.harga : item.hargaSatuan;
      const normalTotal = normalSatuan * item.qty;
      const bayarTotal = item.hargaSatuan * item.qty;
      const isPromo = normalTotal > bayarTotal;
      const hematItem = normalTotal - bayarTotal;
      totalHematItem += isPromo ? hematItem : 0;

      let namaTampil = item.namaMurni + ' (' + item.qty + 'x)';
      let hargaHtml = formatCurrency(bayarTotal);

      if (isPromo) {
        hargaHtml = '<del style="font-size:11px;color:#666;">' + formatCurrency(normalTotal) + '</del><br>' + formatCurrency(bayarTotal);
        barisLayanan += '<tr><td style="vertical-align:top;padding-right:10px;padding-bottom:2px;">' + namaTampil + '</td><td style="text-align:right;vertical-align:top;white-space:nowrap;padding-bottom:2px;">' + hargaHtml + '</td></tr>';
        const labelPromo = item.promoLabel || 'Promo';
        barisLayanan += '<tr><td style="font-size:12px;font-style:italic;padding-left:15px;padding-bottom:8px;color:#16a34a;">↳ Diskon ' + labelPromo + '</td><td style="text-align:right;font-size:13px;padding-bottom:8px;color:#16a34a;">-' + formatCurrency(hematItem) + '</td></tr>';
      } else {
        barisLayanan += '<tr><td style="vertical-align:top;padding-right:10px;padding-bottom:6px;">' + namaTampil + '<br><span style="font-size:11px;color:#666;">@ ' + formatCurrency(item.hargaSatuan) + '</span></td><td style="text-align:right;vertical-align:top;padding-bottom:6px;white-space:nowrap;">' + formatCurrency(bayarTotal) + '</td></tr>';
      }
    });

    const grandTotalHemat = totalHematItem + diskonNominal;

    // Skema diskon global
    let diskonLabel = '';
    let diskonNilai = '';
    if (o.diskon_info) {
      const dParts = o.diskon_info.split(' @ ');
      diskonLabel = dParts[0]?.trim() || '';
      diskonNilai = dParts[1] ? dParts[1].trim() : '';
    }

    const tipeBayar = o.tipe_pembayaran || 'Bayar di Akhir';
    const fmtTgl = formatDate(o.tanggal || '');

    // Build full HTML
    const html = '<!DOCTYPE html><html><head><title>Struk ' + (o.kode || '') + '</title>' +
      '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
      '<style>' +
      'body{font-family:"Courier New",monospace;padding:15px;color:#000;margin:0;line-height:1.4;font-size:14px;}' +
      '.center{text-align:center;} ' +
      '.line{border-bottom:2px dashed #000;margin:15px 0;} ' +
      'table{width:100%;font-size:14px;border-collapse:collapse;} ' +
      'td{padding-bottom:5px;} ' +
      '@media print{body{padding:5px;}}' +
      '</style></head><body>' +
      '<div class="center"><h2 style="margin-bottom:5px;">Danee Shoes Care</h2>' +
      '<p style="font-size:12px;margin-top:0;">Jln. Alternatif Kawasan BIC, Perum Griya Utami 2 Cibening, Blok F No. 11<br>Bungursari, Purwakarta — 41181<br>IG : @daneeshoescare<br>WA : 0851-1161-9226</p></div>' +
      '<div class="line"></div>' +
      '<p><strong>NO: ' + (o.kode || o.id?.slice(0, 8) || '') + '</strong><br>Tgl: ' + fmtTgl + '<br>Status Pengerjaan: ' + o.status + '<br>Tipe Pembayaran: <strong>' + tipeBayar + '</strong></p>' +
      '<p>Pelanggan: ' + o.nama_pelanggan + ' — ' + o.kontak_wa + '</p>' +
      '<div class="line"></div>' +
      '<table>' + barisLayanan +
      (diskonNilai ? '<tr><td style="padding-top:8px;padding-bottom:8px;font-style:italic;font-size:13px;border-top:1px dashed #ccc;">' + diskonLabel + '</td><td style="text-align:right;padding-top:8px;padding-bottom:8px;white-space:nowrap;border-top:1px dashed #ccc;">' + diskonNilai + '</td></tr>' : '') +
      (o.catatan ? '<tr><td colspan="2" style="font-size:12px;padding-top:8px;border-top:1px dashed #ccc;">Ket: ' + o.catatan + '</td></tr>' : '') +
      '</table>' +
      '<div class="line"></div>' +
      '<h3 style="text-align:right;margin:10px 0 2px 0;">Total: ' + formatCurrency(total) + '</h3>' +
      '<p style="text-align:right;font-size:12px;margin:0 0 ' + (grandTotalHemat > 0 ? '5px' : '15px') + ' 0;font-style:italic;">(Status: ' + tipeBayar + ')</p>' +
      (grandTotalHemat > 0
        ? '<div style="text-align:right;font-size:13px;font-weight:bold;padding:8px 0;border-top:2px solid #000;border-bottom:2px solid #000;margin-bottom:15px;">ANDA HEMAT: ' + formatCurrency(grandTotalHemat) + ' (' + persenHemat + '%)</div>'
        : '<div class="line"></div>') +
      '<div class="center"><p style="font-weight:bold;margin-bottom:5px;">Terima Kasih atas Kepercayaan Anda</p><p style="font-size:12px;margin-top:0;font-style:italic;">bersihnya pasti, pedenya kembali !!!</p></div>' +
      '</body></html>';

    // Buat iframe hidden untuk print
    const oldIframe = document.getElementById('print-struk-iframe');
    if (oldIframe) oldIframe.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'print-struk-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 500);
    }
  }, [cetakStruk, layananList]);

  function handleTambahOrder(e: React.FormEvent, closeAfterSave: boolean = false) {
    e.preventDefault();
    if (!addNama.trim() || !addWa.trim()) {
      setError('Harap isi Nama dan WA'); return;
    }
    if (cartItems.length === 0) {
      setError('Belum ada item pesanan. Tambah layanan ke keranjang.'); return;
    }

    const subtotal = getSubtotal();
    let potonganGlobal = 0;
    let diskonTextInfo = '';

    // Hitung diskon global (seperti AppScript: Event, ManualPersen, ManualNominal)
    if (addDiskonTipe === 'Event' && addDiskonEventId) {
      const ev = availableDiskon.find((d) => d.id === addDiskonEventId);
      if (ev) {
        diskonTextInfo = ev.nama_event;
        if (ev.tipe === 'Persentase') {
          potonganGlobal = Math.round(subtotal * (ev.potongan / 100));
          diskonTextInfo += ` (${ev.potongan}%): -${formatCurrency(potonganGlobal)}`;
        } else {
          potonganGlobal = Math.min(ev.potongan, subtotal);
          diskonTextInfo += `: -${formatCurrency(potonganGlobal)}`;
        }
      }
    } else if (addDiskonTipe === 'ManualPersen') {
      const namaDiskon = addDiskonNama.trim() || 'Diskon Manual';
      const pct = parseFloat(addDiskonNilai) || 0;
      potonganGlobal = Math.round(subtotal * (pct / 100));
      diskonTextInfo = `${namaDiskon} (${pct}%): -${formatCurrency(potonganGlobal)}`;
    } else if (addDiskonTipe === 'ManualNominal') {
      const namaDiskon = addDiskonNama.trim() || 'Diskon Manual';
      const nominal = parseFloat(addDiskonNilai) || 0;
      potonganGlobal = Math.min(nominal, subtotal);
      diskonTextInfo = `${namaDiskon}: -${formatCurrency(potonganGlobal)}`;
    }

    const hargaFinal = subtotal - potonganGlobal;
    const layananText = buildLayananText();

    // Build structured items array (FASE 1)
    const structuredItems = cartItems.map((item, idx) => ({
      service_id: item.service_id || null,
      store_id: null,
      tipe: 'jasa' as const,
      nama_item: item.nama,
      qty: item.qty,
      harga_satuan: item.harga,
      diskon_per_item: item.diskon,
      subtotal: item.harga * item.qty,
      urutan: idx + 1,
    }));

    setSubmitting(true);
    setError(null);
    createOrder({
      nama_pelanggan: addNama.trim(),
      kontak_wa: addWa.trim(),
      layanan: layananText,
      harga: hargaFinal,
      catatan: addCatatan.trim() || null,
      diskon_info: potonganGlobal > 0 ? diskonTextInfo : null,
      tipe_pembayaran: addTipeBayar as 'Bayar di Awal' | 'Bayar di Akhir',
      referral: addReferral.trim() || null,
      items: structuredItems,
    })
      .then((res) => {
        if (res.success) {
          setAddSuccessMsg(`✓ Order berhasil dibuat untuk ${addNama.trim()} — ${cartItems.length} item`);
          if (closeAfterSave) {
            closeAddModal();
          } else {
            // Reset semua form (Tambah Lagi), modal tetap buka
            setAddNama(''); setAddWa(''); setAddCatatan(''); setAddTipeBayar('Bayar di Akhir');
            setAddReferral(''); setAddDiskonTipe('Tanpa'); setAddDiskonEventId('');
            setAddDiskonNama(''); setAddDiskonNilai(''); setCartItems([]);
            setCartInputLayanan(''); setCartInputHarga('');
            setCartDiskonTipe('Tanpa'); setCartDiskonEventId(''); setCartDiskonNama(''); setCartDiskonNilai('');
          }
          fetchOrders();
        } else {
          setError(res.error || 'Gagal menambah order');
        }
      })
      .catch((err: any) => setError(err?.message || 'Gagal menambah order'))
      .finally(() => setSubmitting(false));
  }

  function closeAddModal() {
    setShowAddModal(false);
    setAddSuccessMsg('');
  }

  function handleTambahDanTutup(e: React.FormEvent) {
    handleTambahOrder(e, true);
  }

  function resetAddForm() {
    setAddNama(''); setAddWa(''); setAddCatatan('');
    setAddTipeBayar('Bayar di Akhir'); setAddReferral('');
    setAddDiskonTipe('Tanpa'); setAddDiskonEventId('');
    setAddDiskonNama(''); setAddDiskonNilai('');
    setCartItems([]); setCartInputLayanan(''); setCartInputHarga('');
    setCartDiskonTipe('Tanpa'); setCartDiskonEventId(''); setCartDiskonNama(''); setCartDiskonNilai('');
  }

  function openEdit(order: OrderRow) {
    setEditOrder(order);
    setEditNama(order.nama_pelanggan || '');
    setEditWa(order.kontak_wa || '');
    setEditLayanan(order.layanan || '');
    setEditHarga(String(order.harga ?? ''));
    setEditCatatan(order.catatan || '');
  }

  function closeEdit() { setEditOrder(null); }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editOrder) return;
    if (!editNama.trim() || !editWa.trim() || !editLayanan.trim() || !editHarga.trim()) {
      setError('Harap isi Nama, WA, Layanan, dan Harga'); return;
    }
    setEditSubmitting(true);
    try {
      const res = await updateOrder(editOrder.id, {
        nama_pelanggan: editNama.trim(),
        kontak_wa: editWa.trim(),
        layanan: editLayanan.trim(),
        harga: parseFloat(editHarga) || 0,
        catatan: editCatatan.trim() || null,
      });
      if (res.success) {
        setEditOrder(null);
        await fetchOrders();
      } else {
        setError(res.error || 'Gagal mengupdate order');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal mengupdate order');
    } finally {
      setEditSubmitting(false);
    }
  }

  function openQRIS() {
    setShowQRISModal(true);
  }

  /** Bagikan QRIS — native Capacitor di APK, Web Share API di browser */
  async function handleShareQRIS() {
    if (!qrisImage) return;

    // Helper: copy teks ke clipboard
    function fallbackClipboard() {
      try {
        const tmp = document.createElement('textarea');
        tmp.value = 'QRIS Danee Shoes Care — Scan untuk pembayaran';
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
        alert('Teks QRIS sudah disalin ke clipboard. Silakan tempel di chat pelanggan.\n\nAtau screenshot QRIS ini langsung.');
      } catch (_) {
        alert('Silakan screenshot QRIS ini untuk dibagikan ke pelanggan.');
      }
    }

    try {
      const parts = qrisImage.split(',');
      if (parts.length < 2) return;
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
      const base64Data = parts[1];

      const isNative = Capacitor.isNativePlatform();

      /* ── jalur native: Capacitor Filesystem + Share ── */
      if (isNative) {
        try {
          const fileName = `qris_${Date.now()}.png`;
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });

          const result = await Share.share({
            title: 'QRIS Pembayaran Danee Shoes',
            text: 'Pembayaran Danee Shoes Care — Scan QRIS',
            files: [savedFile.uri],
            dialogTitle: 'Bagikan QRIS ke Pelanggan',
          });
          // Kapasitor Share sukses — user sudah milih aplikasi share
          return;
        } catch (e: any) {
          // User cancel share atau error → fallback ke web
          if (e?.code !== 'canceled' && e?.message !== 'User cancelled share dialog') {
            console.warn('Native share gagal, fallback ke web:', e);
          } else {
            return; // User cancel — diam aja
          }
        }
      }

      /* ── jalur web: Web Share API ── */
      const raw = atob(base64Data);
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const file = new File([blob], 'QRIS_Danee_Shoes.png', { type: mime });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'QRIS Pembayaran Danee Shoes',
          text: 'Scan QRIS untuk pembayaran',
        });
      } else if (navigator.share) {
        await navigator.share({
          title: 'QRIS Pembayaran Danee Shoes',
          text: 'Scan QRIS Danee Shoes Care untuk pembayaran',
          url: window.location.href,
        });
      } else {
        fallbackClipboard();
      }
    } catch (e) {
      fallbackClipboard();
    }
  }

  // Loading state
  if (loading && orders.length === 0) {
    return (
      <div className="admin-main">
        <div className="page-header-md3"><h1>Pesanan</h1></div>
        <div className="loading-overlay"><div className="loading-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="admin-main">
      {/* Search Bar — MD3 */}
      <div className="search-bar-md3">
        <span className="mat-icon">search</span>
        <input type="text" placeholder="Cari kode, nama, atau WA..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {/* Action Buttons — QRIS + Tambah Order */}
      <div className="row-actions">
        <button className="btn-outline-action" onClick={openQRIS}>
          <span className="mat-icon">qr_code_scanner</span>
          <span>QRIS</span>
        </button>
        <button className="btn-fill-action" onClick={() => { resetAddForm(); setShowAddModal(true); }}>
          <span className="mat-icon filled">add</span>
          <span>Tambah Order</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="mat-icon" style={{ fontSize: 18 }}>error_outline</span>
            <span>{error}</span>
          </div>
          <button className="btn btn-sm btn-white" onClick={() => setError(null)} style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 8, minHeight: 28 }}>
            <span className="mat-icon" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>
      )}

      {/* Filter Chips — MD3 */}
      <div className="filter-chips">
        {ORDER_STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          const isActive = filter === s;
          const chipIcon = s === 'Semua' ? 'list' : (cfg?.icon || '');
          return (
            <button key={s} className={`filter-chip${isActive ? ' active' : ''}`} onClick={() => setFilter(s)}>
              {chipIcon && <span className="mat-icon">{chipIcon}</span>}
              {s === 'Semua' ? 'Semua' : s}
            </button>
          );
        })}
      </div>

      {searching && <div className="loading-overlay"><div className="loading-spinner" /></div>}

      {/* Order list — MD3 Cards */}
      {filteredOrders.length === 0 ? (
        <div className="empty-state-md3">
          <span className="mat-icon">receipt_long</span>
          <p>Tidak ada pesanan</p>
        </div>
      ) : (
        <div className="order-list">
          {filteredOrders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || { icon: '', cls: '' };
            const stts = order.status === 'Proses Cleaning' || order.status === 'Proses Repair' || order.status === 'Proses Pengeringan' ? 'Proses' : order.status;
            return (
              <div key={order.id} className="order-card-md3" onClick={() => setDetailOrder(order)}>
                {/* Header: Kode + Status */}
                <div className="oc-header">
                  <span className="oc-kode">#{order.kode || order.id?.slice(0, 8).toUpperCase()}</span>
                  <span className={`oc-status ${cfg.cls}`}>
                    <span className="mat-icon">{cfg.icon}</span>
                    {stts}
                  </span>
                </div>

                {/* Body: Nama + Harga */}
                <div className="oc-body">
                  <div className="oc-customer">
                    <div className="oc-nama">{order.nama_pelanggan}</div>
                    <div className="oc-wa">{order.kontak_wa}</div>
                  </div>
                  <div className="oc-harga">{formatCurrency(order.harga ?? 0)}</div>
                </div>

                {/* Layanan */}
                <div className="oc-layanan">{order.layanan}</div>

                {/* Actions */}
                {!isTerminal(order.status) && (
                  <div className="oc-actions" onClick={(e) => e.stopPropagation()}>
                    {getNextStatuses(order.status).map((btn) => {
                      let btnCls = 'oc-action-primary';
                      if (btn.variant === 'btn-success') btnCls = 'oc-action-success';
                      if (btn.variant === 'btn-danger') btnCls = 'oc-action-danger';
                      return (
                        <button key={btn.target} className={btnCls} onClick={() => handleStatusUpdate(order.id, btn.target as OrderStatus)}>
                          <span className="mat-icon">{getActionIcon(btn.target)}</span>
                          {btn.label.replace(/^[▶✓✕]\s*/, '')}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {loading && <div className="loading-overlay"><div className="loading-spinner" /></div>}

      {/* ─── Tambah Order Modal (Cart + Dual Diskon, seperti AppScript) ─── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => closeAddModal()}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h3>Tambah Order</h3>
              <button className="modal-close" onClick={() => closeAddModal()}>&times;</button>
            </div>
            <form onSubmit={(e) => handleTambahOrder(e, false)}>
              <div className="modal-body">
                {addSuccessMsg && (
                  <div style={{ background: '#dcfce7', color: '#166534', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-sm)', fontSize: '0.9rem', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{addSuccessMsg}</span>
                    <span style={{ fontSize: '0.75rem', color: '#166534' }}>👍</span>
                  </div>
                )}

                {/* Data Pelanggan */}
                <div className="form-group"><label>Nama Pelanggan</label><input type="text" className="form-control" value={addNama} onChange={(e) => setAddNama(e.target.value)} required /></div>
                <div className="form-group"><label>Kontak WA</label><input type="text" className="form-control" value={addWa} onChange={(e) => setAddWa(e.target.value)} required /></div>

                {/* ── Cart: Tambah Item (seperti AppScript) ── */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius)', padding: 'var(--space-sm)', marginTop: 'var(--space-sm)', background: '#f8fafc' }}>
                  <label style={{ fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 'var(--space-xs)' }}>
                    🛒 Tambah Layanan
                  </label>

                  {/* Baris 1: Layanan + Harga */}
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 'var(--space-xs)' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      {layananLoading ? (
                        <p className="text-muted" style={{ fontSize: '0.85rem' }}>Memuat layanan...</p>
                      ) : (
                        <select className="form-control" value={cartInputLayanan} onChange={(e) => {
                          const selected = e.target.value;
                          setCartInputLayanan(selected);
                          const svc = layananList.find((s) => s.nama_layanan === selected);
                          if (svc) {
                            setCartInputHarga(String(svc.harga_promo ?? svc.harga));
                          } else {
                            setCartInputHarga('');
                          }
                        }}>
                          <option value="">-- Pilih Layanan --</option>
                          {layananList.filter((s) => s.status === 'Aktif').map((svc) => (
                            <option key={svc.id} value={svc.nama_layanan}>
                              {svc.nama_layanan} — {svc.kategori} ({formatCurrency(svc.harga_promo ?? svc.harga)})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div style={{ width: 120 }}>
                      <input type="number" className="form-control" value={cartInputHarga} onChange={(e) => setCartInputHarga(e.target.value)} min={0} placeholder="Harga" />
                    </div>
                  </div>

                  {/* Baris 2: Per-Item Diskon (seperti AppScript) */}
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 'var(--space-xs)' }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block' }}>Diskon/Item</label>
                      <select className="form-control" value={cartDiskonTipe} onChange={(e) => {
                        setCartDiskonTipe(e.target.value as any);
                        setCartDiskonEventId('');
                        setCartDiskonNama('');
                        setCartDiskonNilai('');
                      }}>
                        <option value="Tanpa">Tanpa Diskon</option>
                        <option value="Event">Event Promo</option>
                        <option value="ManualPersen">Manual (%)</option>
                        <option value="ManualNominal">Manual (Rp)</option>
                      </select>
                    </div>

                    {cartDiskonTipe === 'Event' && (
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block' }}>Pilih Event</label>
                        {diskonLoading ? (
                          <p className="text-muted" style={{ fontSize: '0.8rem' }}>Memuat...</p>
                        ) : (
                          <select className="form-control" value={cartDiskonEventId} onChange={(e) => setCartDiskonEventId(e.target.value)}>
                            <option value="">-- Pilih --</option>
                            {availableDiskon.map((ev) => (
                              <option key={ev.id} value={ev.id}>
                                {ev.nama_event} ({ev.tipe === 'Persentase' ? `${ev.potongan}%` : `Rp${ev.potongan.toLocaleString('id-ID')}`})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {(cartDiskonTipe === 'ManualPersen' || cartDiskonTipe === 'ManualNominal') && (
                      <>
                        <div style={{ flex: 1, minWidth: 100 }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block' }}>Nama</label>
                          <input type="text" className="form-control" value={cartDiskonNama} onChange={(e) => setCartDiskonNama(e.target.value)} placeholder="Cth: Relasi" />
                        </div>
                        <div style={{ width: 90 }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block' }}>
                            {cartDiskonTipe === 'ManualPersen' ? '%' : 'Rp'}
                          </label>
                          <input type="number" className="form-control" value={cartDiskonNilai} onChange={(e) => setCartDiskonNilai(e.target.value)} min={0} placeholder="0" />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Tombol Tambah */}
                  <button type="button" className="btn btn-primary" onClick={addToCart} disabled={!cartInputLayanan.trim() || !cartInputHarga.trim()}
                    style={{ width: '100%' }}>
                    + Tambah ke Keranjang
                  </button>

                  {/* Daftar item di keranjang */}
                  <div style={{ marginTop: 'var(--space-sm)', maxHeight: 200, overflowY: 'auto' }}>
                    {cartItems.length === 0 ? (
                      <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '10px 0' }}>
                        Daftar pesanan masih kosong.
                      </p>
                    ) : (
                      <>
                        {cartItems.map((item, idx) => (
                          <div key={idx} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#fff', padding: '6px 10px', borderRadius: 'var(--radius)',
                            marginBottom: 4, border: '1px solid #e2e8f0', fontSize: '0.85rem'
                          }}>
                            <div>
                              <strong>{item.nama}</strong> <span style={{ color: 'var(--primary)', fontWeight: 600 }}>x{item.qty}</span>
                              <br /><span className="text-muted">{formatCurrency(item.harga)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <strong>{formatCurrency(item.harga * item.qty)}</strong>
                              <button type="button" onClick={() => removeFromCart(idx)} style={{
                                background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '2px 6px'
                              }} title="Hapus">&times;</button>
                            </div>
                          </div>
                        ))}
                        {/* Subtotal keranjang */}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 10px', borderTop: '2px solid #e2e8f0', marginTop: 4, fontWeight: 700
                        }}>
                          <span>Subtotal ({cartItems.reduce((s, i) => s + i.qty, 0)} item)</span>
                          <span>{formatCurrency(getSubtotal())}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Diskon Global (seperti AppScript) ── */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius)', padding: 'var(--space-sm)', marginTop: 'var(--space-sm)', background: '#fff' }}>
                  <label style={{ fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 'var(--space-xs)' }}>
                    💰 Diskon Global (Seluruh Order)
                  </label>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <select className="form-control" value={addDiskonTipe} onChange={(e) => { setAddDiskonTipe(e.target.value as any); setAddDiskonEventId(''); setAddDiskonNama(''); setAddDiskonNilai(''); }}>
                        <option value="Tanpa">Tanpa Diskon</option>
                        <option value="Event">Event Promo</option>
                        <option value="ManualPersen">Manual Potongan (%)</option>
                        <option value="ManualNominal">Manual Potongan (Rp)</option>
                      </select>
                    </div>

                    {addDiskonTipe === 'Event' && (
                      <div style={{ flex: 1, minWidth: 140 }}>
                        {diskonLoading ? (
                          <p className="text-muted" style={{ fontSize: '0.8rem' }}>Memuat...</p>
                        ) : availableDiskon.length === 0 ? (
                          <p className="text-muted" style={{ fontSize: '0.8rem' }}>Tidak ada event aktif</p>
                        ) : (
                          <select className="form-control" value={addDiskonEventId} onChange={(e) => setAddDiskonEventId(e.target.value)}>
                            <option value="">-- Pilih Event Promo --</option>
                            {availableDiskon.map((ev) => (
                              <option key={ev.id} value={ev.id}>
                                {ev.nama_event} ({ev.tipe === 'Persentase' ? `${ev.potongan}%` : `Rp${ev.potongan.toLocaleString('id-ID')}`})
                                {ev.target_layanan ? ` — ${ev.target_layanan}` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {(addDiskonTipe === 'ManualPersen' || addDiskonTipe === 'ManualNominal') && (
                      <>
                        <div style={{ flex: 1, minWidth: 100 }}>
                          <input type="text" className="form-control" value={addDiskonNama} onChange={(e) => setAddDiskonNama(e.target.value)} placeholder="Cth: Karyawan" />
                        </div>
                        <div style={{ width: 90 }}>
                          <input type="number" className="form-control" value={addDiskonNilai} onChange={(e) => setAddDiskonNilai(e.target.value)} min={0} placeholder="0" />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Ringkasan Harga */}
                <div style={{ background: '#f8fafc', padding: 'var(--space-sm)', borderRadius: 'var(--radius)', marginTop: 'var(--space-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>Subtotal</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(getSubtotal())}</span>
                  </div>
                  {(addDiskonTipe !== 'Tanpa') && (() => {
                    const subtotal = getSubtotal();
                    let pot = 0;
                    let lbl = '';
                    if (addDiskonTipe === 'Event' && addDiskonEventId) {
                      const ev = availableDiskon.find((d) => d.id === addDiskonEventId);
                      if (ev) {
                        pot = ev.tipe === 'Persentase' ? Math.round(subtotal * (ev.potongan / 100)) : Math.min(ev.potongan, subtotal);
                        lbl = ev.nama_event;
                      }
                    } else if (addDiskonTipe === 'ManualPersen') {
                      const pct = parseFloat(addDiskonNilai) || 0;
                      pot = Math.round(subtotal * (pct / 100));
                      lbl = addDiskonNama.trim() || 'Diskon Manual';
                    } else if (addDiskonTipe === 'ManualNominal') {
                      pot = Math.min(parseFloat(addDiskonNilai) || 0, subtotal);
                      lbl = addDiskonNama.trim() || 'Diskon Manual';
                    }
                    const final = subtotal - pot;
                    return (
                      <>
                        {pot > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#16a34a' }}>
                            <span>Potongan {lbl ? `(${lbl})` : ''}</span>
                            <span style={{ fontWeight: 600 }}>-{formatCurrency(pot)}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, borderTop: '1px solid #e2e8f0', paddingTop: '4px', marginTop: '4px' }}>
                          <span>Total Akhir</span>
                          <span style={{ color: '#16a34a' }}>{formatCurrency(final)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Catatan & lainnya */}
                <div className="form-group"><label>Catatan</label><textarea className="form-control" value={addCatatan} onChange={(e) => setAddCatatan(e.target.value)} rows={2} /></div>
                <div className="form-group"><label>Tipe Pembayaran</label>
                  <select className="form-control" value={addTipeBayar} onChange={(e) => setAddTipeBayar(e.target.value)}>
                    <option value="Bayar di Awal">Bayar di Awal</option>
                    <option value="Bayar di Akhir">Bayar di Akhir</option>
                  </select>
                </div>
                <div className="form-group"><label>Referral <span style={{fontSize:'0.75rem',color:'#94a3b8'}}>(opsional)</span></label>
                  <select className="form-control" value={addReferral} onChange={(e) => setAddReferral(e.target.value)}>
                    <option value="">-- Tanpa Referral --</option>
                    {referralLoading ? (
                      <option value="" disabled>Memuat...</option>
                    ) : (
                      referralList.filter((r) => r.status === 'Aktif').map((ref) => (
                        <option key={ref.id} value={ref.kode}>
                          {ref.kode} — {ref.nama_referral}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-white" onClick={() => closeAddModal()} disabled={submitting}>Tutup</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || cartItems.length === 0}>
                  {submitting ? 'Menyimpan...' : 'Tambah Lagi'}
                </button>
                <button type="button" className="btn btn-success" onClick={handleTambahDanTutup} disabled={submitting || cartItems.length === 0}>
                  {submitting ? 'Menyimpan...' : 'Simpan & Tutup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {detailOrder && (
        <div className="modal-overlay" onClick={() => setDetailOrder(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detail Order — {detailOrder.kode || detailOrder.id?.slice(0, 8)}</h3>
              <button className="modal-close" onClick={() => setDetailOrder(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <table className="detail-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <DetailRow label="Kode" value={detailOrder.kode || detailOrder.id} />
                  <DetailRow label="Tanggal" value={formatDate(detailOrder.tanggal || '')} />
                  <DetailRow label="Nama Pelanggan" value={detailOrder.nama_pelanggan} />
                  <DetailRow label="Kontak WA" value={detailOrder.kontak_wa} />
                  <DetailRow label="Layanan" value={detailOrder.layanan} />
                  <DetailRow label="Harga" value={formatCurrency(detailOrder.harga ?? 0)} />
                  <DetailRow label="Status" value={<span className={`badge ${STATUS_CONFIG[detailOrder.status]?.cls || ''}`}>{STATUS_CONFIG[detailOrder.status]?.icon || ''} {detailOrder.status}</span>} />
                  <DetailRow label="Catatan" value={detailOrder.catatan || '-'} />
                  <DetailRow label="Diskon Info" value={detailOrder.diskon_info || '-'} />
                  <DetailRow label="Referral" value={detailOrder.referral || '-'} />
                  <DetailRow label="Tipe Pembayaran" value={detailOrder.tipe_pembayaran || '-'} />
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button className="btn btn-white" onClick={() => setDetailOrder(null)}>Tutup</button>
              <button className="btn btn-white" style={{ borderColor: '#f59e0b', color: '#92400e' }} onClick={() => { setCetakStruk(detailOrder); }}>🖨️ Struk</button>
              {!isTerminal(detailOrder.status) && (
                <button className="btn btn-primary" onClick={() => { openEdit(detailOrder); setDetailOrder(null); }}>✏️ Edit</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Struk / Receipt Modal (seperti AppScript) ─── */}
      {cetakStruk && (
        <div className="modal-overlay" onClick={() => setCetakStruk(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>🖨️ Struk Pesanan</h3>
              <button className="modal-close" onClick={() => setCetakStruk(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px', background: '#fff', fontFamily: "'Courier New', monospace", color: '#000' }}>
              {/* Header Toko */}
              <div style={{ textAlign: 'center', marginBottom: 16, borderBottom: '2px dashed #000', paddingBottom: 14 }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem' }}>Danee Shoes Care</h2>
                <p style={{ fontSize: '0.72rem', margin: 0, lineHeight: 1.6 }}>
                  Jln. Alternatif Kawasan BIC<br />
                  Perum Griya Utami 2 Cibening, Blok F No. 11<br />
                  Bungursari, Purwakarta — 41181<br />
                  IG: @daneeshoescare | WA: 0851-1161-9226
                </p>
              </div>

              {/* Info Order */}
              <p style={{ fontSize: '0.82rem', margin: '0 0 4px 0', lineHeight: 1.6 }}>
                <strong>NO: {cetakStruk.kode || cetakStruk.id?.slice(0, 8)}</strong><br />
                Tgl: {formatDate(cetakStruk.tanggal || '')}<br />
                Status: {cetakStruk.status}<br />
                Tipe Bayar: <strong>{cetakStruk.tipe_pembayaran || '-'}</strong>
              </p>
              <p style={{ fontSize: '0.82rem', margin: '0 0 16px 0' }}>
                Pelanggan: {cetakStruk.nama_pelanggan} — {cetakStruk.kontak_wa}
              </p>

              <div style={{ borderBottom: '2px dashed #000', marginBottom: 16 }} />

              {/* Daftar Item + Perhitungan */}
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                <tbody>
                  {(() => {
                    const items = parseLayananItems(cetakStruk.layanan || '');
                    const subtotal = items.reduce((s, i) => s + i.hargaSatuan * i.qty, 0);
                    const diskonNominal = extractDiskonNominal(cetakStruk.diskon_info || '');
                    const total = cetakStruk.harga ?? 0;
                    return (
                      <>
                        {items.map((item, idx) => {
                          // Cari harga normal dari layananList untuk coret (seperti AppScript)
                          const svc = layananList.find((s) => s.nama_layanan === item.namaMurni);
                          const normalSatuan = svc ? svc.harga : item.hargaSatuan;
                          const normalTotal = normalSatuan * item.qty;
                          const bayarTotal = item.hargaSatuan * item.qty;
                          const isPromo = normalTotal > bayarTotal;
                          return (
                            <React.Fragment key={idx}>
                              <tr>
                                <td style={{ verticalAlign: 'top', paddingRight: 8, paddingBottom: isPromo ? 2 : 6 }}>
                                  <div>{item.namaMurni} ({item.qty}x)</div>
                                  <span style={{ fontSize: '0.72rem', color: '#666' }}>@ {formatCurrency(item.hargaSatuan)}</span>
                                  {item.promoLabel && <span style={{ fontSize: '0.72rem', fontStyle: 'italic', color: '#16a34a' }}> [{item.promoLabel}]</span>}
                                </td>
                                <td style={{ textAlign: 'right', verticalAlign: 'top', paddingBottom: isPromo ? 2 : 6, whiteSpace: 'nowrap' }}>
                                  {isPromo ? (
                                    <>
                                      <del style={{ fontSize: '0.72rem', color: '#666' }}>{formatCurrency(normalTotal)}</del><br />
                                      <span style={{ fontWeight: 600 }}>{formatCurrency(bayarTotal)}</span>
                                    </>
                                  ) : (
                                    formatCurrency(bayarTotal)
                                  )}
                                </td>
                              </tr>
                              {isPromo && (
                                <tr>
                                  <td style={{ fontSize: '0.72rem', fontStyle: 'italic', paddingLeft: 15, paddingBottom: 6, color: '#16a34a' }}>
                                    ↳ Diskon {item.promoLabel || 'Spesial'}
                                  </td>
                                  <td style={{ textAlign: 'right', fontSize: '0.75rem', paddingBottom: 6, color: '#16a34a' }}>
                                    -{formatCurrency(normalTotal - bayarTotal)}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}

                        {items.length > 1 && (
                          <tr>
                            <td style={{ paddingTop: 8, borderTop: '1px dashed #ccc', fontWeight: 600 }}>Subtotal</td>
                            <td style={{ textAlign: 'right', paddingTop: 8, borderTop: '1px dashed #ccc', fontWeight: 600 }}>
                              {formatCurrency(subtotal)}
                            </td>
                          </tr>
                        )}

                        {diskonNominal > 0 && (
                          <tr>
                            <td style={{ paddingTop: 4, paddingBottom: 4, fontStyle: 'italic', fontSize: '0.78rem', color: '#16a34a' }}>
                              {cetakStruk.diskon_info?.split('@')[0]?.trim() || 'Diskon'}
                            </td>
                            <td style={{ textAlign: 'right', paddingTop: 4, paddingBottom: 4, fontSize: '0.78rem', color: '#16a34a' }}>
                              -{formatCurrency(diskonNominal)}
                            </td>
                          </tr>
                        )}

                        {cetakStruk.catatan && (
                          <tr>
                            <td colSpan={2} style={{ fontSize: '0.78rem', paddingTop: 8, borderTop: '1px dashed #ccc', fontStyle: 'italic' }}>
                              Ket: {cetakStruk.catatan}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>

              <div style={{ borderBottom: '2px dashed #000', margin: '14px 0' }} />

              {/* Total */}
              <h3 style={{ textAlign: 'right', margin: '10px 0 2px 0', fontSize: '1.1rem' }}>
                Total: {formatCurrency(cetakStruk.harga ?? 0)}
              </h3>
              <p style={{ textAlign: 'right', fontSize: '0.72rem', margin: '0 0 14px 0', fontStyle: 'italic' }}>
                (Status: {cetakStruk.tipe_pembayaran || '-'})
              </p>

              {/* Anda Hemat — include per-item + global diskon (seperti AppScript) */}
              {(() => {
                const items = parseLayananItems(cetakStruk.layanan || '');
                const subtotal = items.reduce((s, i) => s + i.hargaSatuan * i.qty, 0);
                const diskonNominal = extractDiskonNominal(cetakStruk.diskon_info || '');
                // Hitung total hemat: per-item (selisih normal - bayar) + global
                let perItemHemat = 0;
                items.forEach((item) => {
                  const svc = layananList.find((s) => s.nama_layanan === item.namaMurni);
                  const normal = svc ? svc.harga * item.qty : item.hargaSatuan * item.qty;
                  const bayar = item.hargaSatuan * item.qty;
                  if (normal > bayar) perItemHemat += (normal - bayar);
                });
                const hematTotal = perItemHemat + diskonNominal;
                if (hematTotal > 0) {
                  const totalAsli = (cetakStruk.harga ?? 0) + hematTotal;
                  const persen = totalAsli > 0 ? Math.round((hematTotal / totalAsli) * 100) : 0;
                  return (
                    <div style={{
                      textAlign: 'right', fontSize: '0.82rem', fontWeight: 'bold',
                      padding: '10px 0', borderTop: '2px solid #000', borderBottom: '2px solid #000',
                      marginBottom: 14
                    }}>
                      ANDA HEMAT: {formatCurrency(hematTotal)} ({persen}%)
                    </div>
                  );
                }
                return null;
              })()}

              {/* Terima Kasih */}
              <div style={{ textAlign: 'center', marginTop: 16, borderTop: '2px dashed #000', paddingTop: 14 }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px 0', fontSize: '0.9rem' }}>
                  Terima Kasih atas Kepercayaan Anda
                </p>
                <p style={{ fontSize: '0.75rem', margin: 0, fontStyle: 'italic', color: '#666' }}>
                  bersihnya pasti, pedenya kembali !!!
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-white" onClick={() => setCetakStruk(null)}>Tutup</button>
              <button className="btn btn-primary" onClick={handlePrintStruk}>🖨️ Print</button>
            </div>
          </div>
        </div>
      )}

      {/* QRIS Modal */}
      {showQRISModal && (
        <div className="modal-overlay" onClick={() => setShowQRISModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>💳 QRIS Danee Shoes</h3>
              <button className="modal-close" onClick={() => setShowQRISModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              {qrisImage ? (
                <>
                  <img src={qrisImage} alt="QRIS Danee Shoes" style={{ width: '100%', maxWidth: 280, borderRadius: 12, marginBottom: 'var(--space-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-gray)', marginBottom: 'var(--space-md)' }}>
                    Scan QRIS untuk pembayaran
                  </p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={handleShareQRIS}>📤 Bagikan</button>
                    <button className="btn btn-success" onClick={() => { const a = document.createElement('a'); a.href = qrisImage; a.download = 'QRIS_Danee_Shoes.png'; a.click(); }}>⬇️ Unduh</button>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-gray)', marginTop: 'var(--space-sm)' }}>
                    Ganti gambar QRIS di menu <strong>Pengaturan</strong>
                  </p>
                </>
              ) : (
                <>
                  <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', margin: '0 auto var(--space-md)', color: 'var(--text-gray)' }}>
                    📷
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-gray)', marginBottom: 'var(--space-md)' }}>
                    QRIS belum diatur. Upload gambar QRIS di menu <strong>Pengaturan</strong>.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editOrder && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Order — {editOrder.kode || editOrder.id?.slice(0, 8)}</h3>
              <button className="modal-close" onClick={closeEdit}>&times;</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group"><label>Nama Pelanggan</label><input type="text" className="form-control" value={editNama} onChange={(e) => setEditNama(e.target.value)} required /></div>
                <div className="form-group"><label>Kontak WA</label><input type="text" className="form-control" value={editWa} onChange={(e) => setEditWa(e.target.value)} required /></div>
                <div className="form-group"><label>Layanan</label><input type="text" className="form-control" value={editLayanan} onChange={(e) => setEditLayanan(e.target.value)} required /></div>
                <div className="form-group"><label>Harga</label><input type="number" className="form-control" value={editHarga} onChange={(e) => setEditHarga(e.target.value)} min={0} required /></div>
                <div className="form-group"><label>Catatan</label><textarea className="form-control" value={editCatatan} onChange={(e) => setEditCatatan(e.target.value)} rows={3} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-white" onClick={closeEdit} disabled={editSubmitting}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={editSubmitting}>{editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', width: '35%' }}>{label}</td>
      <td style={{ padding: '10px 12px', color: '#1e293b' }}>{value}</td>
    </tr>
  );
}

export default Orders;
