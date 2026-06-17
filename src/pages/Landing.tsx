import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getAll } from '../lib/services/menu-jasa-service';
import { getAllActive } from '../lib/services/menu-store-service';
import { getAll as getAllKonten, getAllDiskon } from '../lib/services/konten-service';
import { getWaNumber } from '../lib/services/settings-service';
import { trackOrder } from '../lib/services/order-service';
import { formatCurrency } from '../lib/utils';
import type { MenuJasaRow, MenuStoreRow, KontenWebRow, OrderRow, DiskonEventRow } from '../lib/types-supabase';

/* ── Helpers ─────────────────────────────────────────────────── */
function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Selesai': return 'badge-selesai';
    case 'Ready': return 'badge-ready';
    case 'Batal': return 'badge-batal';
    case 'Waiting': return 'badge-waiting';
    default: return 'badge-proses';
  }
}

const CATEGORY_ICONS: Record<string, string> = {
  Cleaning: '👟',
  Repair: '🔧',
};

/* ── Carousel hook ──────────────────────────────────────────── */
function useCarousel(length: number, interval = 4000) {
  const [idx, setIdx] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (length <= 1) return;
    timer.current = window.setInterval(() => setIdx((p) => (p + 1) % length), interval);
    return () => { if (timer.current !== null) window.clearInterval(timer.current); };
  }, [length, interval]);

  const goTo = useCallback((i: number) => {
    setIdx(i);
    if (timer.current !== null) { window.clearInterval(timer.current); timer.current = null; }
  }, []);

  return { idx, goTo };
}

/* ── Main Component ─────────────────────────────────────────── */
export default function Landing() {
  /* ── State ─────────────────────────────────────────────── */
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [loading, setLoading] = useState(true);
  const [jasaList, setJasaList] = useState<MenuJasaRow[]>([]);
  const [storeList, setStoreList] = useState<MenuStoreRow[]>([]);
  const [kontenList, setKontenList] = useState<KontenWebRow[]>([]);
  const [diskonList, setDiskonList] = useState<DiskonEventRow[]>([]);
  const [waNumber, setWaNumber] = useState('6285111619226');

  // Error states per section
  const [jasaError, setJasaError] = useState('');
  const [storeError, setStoreError] = useState('');
  const [kontenError, setKontenError] = useState('');

  // Tracking
  const [trackKeyword, setTrackKeyword] = useState('');
  const [trackResult, setTrackResult] = useState<OrderRow[] | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  // Delivery modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalService, setModalService] = useState<MenuJasaRow | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<'antar' | 'jemput'>('antar');
  const [pickupAddress, setPickupAddress] = useState('');

  // Bottom nav tab
  const [activeTab, setActiveTab] = useState<'beranda' | 'layanan' | 'produk' | 'lainnya'>('beranda');

  const WA_BASE = `https://wa.me/${waNumber}`;

  /* ── Fetch ─────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const waRes = await getWaNumber();
        if (!cancelled && waRes.success && waRes.data) {
          setWaNumber(waRes.data);
        }

        const [jasaRes, storeRes, kontenRes, diskonRes] = await Promise.all([
          getAll().catch(() => ({ success: false as const, error: 'Gagal memuat layanan' })),
          getAllActive().catch(() => ({ success: false as const, error: 'Gagal memuat produk' })),
          getAllKonten().catch(() => ({ success: false as const, error: 'Gagal memuat konten' })),
          getAllDiskon().catch(() => ({ success: false as const, error: '' })),
        ]);

        if (cancelled) return;

        if (jasaRes.success && jasaRes.data) {
          setJasaList(jasaRes.data);
          setJasaError('');
        } else {
          setJasaError(jasaRes.error || 'Gagal memuat layanan');
        }

        if (storeRes.success && storeRes.data) {
          setStoreList(storeRes.data);
          setStoreError('');
        } else {
          setStoreError(storeRes.error || 'Gagal memuat produk');
        }

        if (kontenRes.success && kontenRes.data) {
          setKontenList(kontenRes.data);
          setKontenError('');
        } else {
          setKontenError(kontenRes.error || 'Gagal memuat konten');
        }

        if (diskonRes.success && diskonRes.data) {
          setDiskonList(diskonRes.data.filter((d: DiskonEventRow) => d.status === 'Aktif'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  /* ── Derived data ─────────────────────────────────────── */
  const activeServices = jasaList.filter(
    (j) => j.status === 'Aktif' || j.status === 'Coming Soon',
  );
  const edukasiList = kontenList.filter(
    (k) => k.kategori === 'Edukasi' && k.status === 'Aktif',
  );
  const testimoniList = kontenList.filter(
    (k) => k.kategori === 'Testimoni' && k.status === 'Aktif',
  );
  const instagram = kontenList.find(
    (k) => k.kategori === 'Instagram' && k.status === 'Aktif',
  );
  const youtube = kontenList.find(
    (k) => k.kategori === 'YouTube' && k.status === 'Aktif',
  );

  // Banner items from edukasi konten (for carousel)
  const bannerItems = edukasiList.length > 0
    ? edukasiList.slice(0, 5)
    : [];

  // Flash sale items — services with harga_promo
  const flashSaleItems = activeServices.filter((j) => j.harga_promo && j.harga_promo > 0);

  // Filtered services/search
  const filteredJasa = searchQuery.trim()
    ? activeServices.filter((j) =>
        j.nama_layanan.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : activeServices;

  const filteredStore = searchQuery.trim()
    ? storeList.filter((p) =>
        p.nama_produk.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : storeList;

  /* ── Handlers ──────────────────────────────────────────── */
  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTrack = async () => {
    const keyword = trackKeyword.trim();
    if (!keyword) return;
    setTrackLoading(true);
    setTrackError('');
    setTrackResult(null);
    try {
      const res = await trackOrder(keyword);
      if (res.success && res.data && res.data.length > 0) {
        setTrackResult(res.data);
      } else {
        setTrackError('Order tidak ditemukan.');
      }
    } catch {
      setTrackError('Gagal melakukan tracking. Coba lagi.');
    } finally {
      setTrackLoading(false);
    }
  };

  const openDeliveryModal = (service: MenuJasaRow) => {
    setModalService(service);
    setDeliveryMethod('antar');
    setPickupAddress('');
    setModalOpen(true);
  };

  const confirmOrder = () => {
    if (!modalService) return;
    const methodLabel =
      deliveryMethod === 'antar'
        ? 'Antar Sendiri (Drop-off)'
        : 'Jemput (Pickup)';
    let msg = `Halo Danee Shoes Care! Saya ingin order jasa berikut:\n\n`;
    msg += `*Layanan:* ${modalService.nama_layanan}\n`;
    msg += `*Harga:* ${formatCurrency(modalService.harga)}\n`;
    msg += `*Metode Penyerahan:* ${methodLabel}\n`;
    if (deliveryMethod === 'jemput' && pickupAddress.trim()) {
      msg += `*Alamat Jemput:* ${pickupAddress.trim()}\n`;
    }
    msg += `\nTerima kasih.`;
    window.open(`${WA_BASE}?text=${encodeURIComponent(msg)}`, '_blank');
    setModalOpen(false);
    setModalService(null);
  };

  // Carousel
  const { idx: bannerIdx, goTo: goToBanner } = useCarousel(bannerItems.length, 4000);

  /* ── Full-page loading ────────────────────────────────── */
  if (loading) {
    return (
      <div className="loading-overlay" style={{ minHeight: '100vh' }}>
        <div className="loading-spinner" />
        <p style={{ color: 'var(--text-gray)' }}>Memuat halaman...</p>
      </div>
    );
  }

  /* ── Render ───────────────────────────────────────────── */
  return (
    <>
      <style>{`
        /* ===== Shopee-Style Landing ===== */

        .shopee-topbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .shopee-topbar-logo {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--primary);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .shopee-topbar-logo span { font-size: 1.3rem; }
        .shopee-search {
          flex: 1;
          position: relative;
          max-width: 400px;
        }
        .shopee-search input {
          width: 100%;
          padding: 9px 36px 9px 14px;
          border: none;
          border-radius: 20px;
          background: #f1f3f5;
          font-size: 0.85rem;
          outline: none;
          color: var(--text-dark);
        }
        .shopee-search input::placeholder { color: #9aa0a6; }
        .shopee-search input:focus { background: #e8eaed; }
        .shopee-search-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9aa0a6;
          font-size: 1.1rem;
          pointer-events: none;
        }
        .shopee-topbar-icons {
          display: flex;
          align-items: center;
          gap: 14px;
          color: #555;
          font-size: 1.2rem;
        }
        .shopee-topbar-icons button {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: inherit;
          font-size: inherit;
          position: relative;
        }
        .shopee-badge-dot {
          position: absolute;
          top: 0;
          right: 0;
          width: 8px;
          height: 8px;
          background: #ee4d2d;
          border-radius: 50%;
          border: 1.5px solid #fff;
        }

        /* Banner Carousel */
        .banner-carousel-wrap {
          position: relative;
          margin: 10px 12px;
          border-radius: 10px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .banner-carousel-track {
          display: flex;
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .banner-slide {
          min-width: 100%;
          aspect-ratio: 16 / 7;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8f9ff 0%, #eef1ff 100%);
          padding: 16px 24px;
          text-align: center;
        }
        .banner-slide img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 6px;
        }
        .banner-slide.no-img {
          flex-direction: column;
          gap: 6px;
        }
        .banner-slide.no-img h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--primary);
          margin: 0;
        }
        .banner-slide.no-img p {
          font-size: 0.8rem;
          color: var(--text-gray);
          margin: 0;
          max-width: 280px;
        }
        .banner-dots {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          z-index: 2;
        }
        .banner-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(0,0,0,0.2);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.2s;
        }
        .banner-dot.active {
          width: 18px;
          border-radius: 3px;
          background: var(--primary);
        }

        /* Category grid */
        .category-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px 8px;
          padding: 14px 12px;
          background: #fff;
          margin: 0 12px 12px;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .category-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          text-decoration: none;
          color: var(--text-dark);
          border: none;
          background: none;
          padding: 0;
          font-family: inherit;
        }
        .category-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #f0f4ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          transition: transform 0.15s;
        }
        .category-item:active .category-circle { transform: scale(0.92); }
        .category-label {
          font-size: 0.7rem;
          font-weight: 500;
          color: var(--text-dark);
          text-align: center;
          line-height: 1.2;
        }

        /* Flash Sale */
        .flashsale-row {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          padding: 0 12px 14px;
          scrollbar-width: none;
        }
        .flashsale-row::-webkit-scrollbar { display: none; }
        .flashsale-card {
          min-width: 130px;
          scroll-snap-align: start;
          background: #fff;
          border-radius: 8px;
          padding: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          text-align: center;
          flex-shrink: 0;
          border: 1px solid #fee2e2;
        }
        .flashsale-card .fs-icon { font-size: 1.8rem; margin-bottom: 4px; }
        .flashsale-card .fs-name {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-dark);
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .flashsale-card .fs-price-old {
          font-size: 0.68rem;
          color: #9aa0a6;
          text-decoration: line-through;
        }
        .flashsale-card .fs-price-new {
          font-size: 0.85rem;
          font-weight: 700;
          color: #ee4d2d;
        }
        .flashsale-card .fs-discount {
          display: inline-block;
          background: #ee4d2d;
          color: #fff;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 3px;
          margin-top: 3px;
        }

        /* Section header (Shopee style) */
        .shopee-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 12px 8px;
        }
        .shopee-section-header h2 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-dark);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .shopee-section-header a {
          font-size: 0.78rem;
          color: var(--primary);
          text-decoration: none;
        }

        /* Product/Service Grid — 2 columns like Shopee */
        .shopee-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 0 12px 16px;
        }
        .shopee-card {
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          transition: box-shadow 0.15s;
          display: flex;
          flex-direction: column;
        }
        .shopee-card:active { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

        /* Service card specific */
        .shopee-service-top {
          padding: 14px 12px 0;
          text-align: center;
        }
        .shopee-service-icon {
          font-size: 2.2rem;
          margin-bottom: 4px;
        }
        .shopee-service-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-dark);
          margin-bottom: 2px;
          line-height: 1.3;
        }
        .shopee-service-desc {
          font-size: 0.72rem;
          color: var(--text-gray);
          line-height: 1.3;
          margin-bottom: 6px;
        }
        .shopee-service-price {
          font-size: 0.95rem;
          font-weight: 700;
          color: #ee4d2d;
          margin-bottom: 10px;
        }
        .shopee-service-promo {
          font-size: 0.68rem;
          color: #9aa0a6;
          text-decoration: line-through;
        }
        .shopee-card-footer {
          display: flex;
          gap: 6px;
          padding: 0 10px 10px;
          margin-top: auto;
        }
        .shopee-card-footer button {
          flex: 1;
          padding: 8px 0;
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .shopee-card-footer button:active { opacity: 0.8; }
        .btn-shopee-primary {
          background: var(--primary);
          color: #fff;
        }
        .btn-shopee-secondary {
          background: #f0f4ff;
          color: var(--primary);
        }
        .btn-shopee-disabled {
          background: #eee;
          color: #999;
          cursor: not-allowed;
        }

        /* Store card specific */
        .shopee-store-img {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
          background: #f8f9fa;
          display: block;
        }
        .shopee-store-img-placeholder {
          width: 100%;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
          font-size: 2.2rem;
        }
        .shopee-store-info {
          padding: 8px 10px 10px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .shopee-store-name {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-dark);
          line-height: 1.3;
          margin-bottom: 3px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .shopee-store-price {
          font-size: 0.95rem;
          font-weight: 700;
          color: #ee4d2d;
          margin-top: auto;
        }

        /* Tracking */
        .tracking-modern {
          background: #fff;
          margin: 0 12px 16px;
          border-radius: 10px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .tracking-modern .track-input-row {
          display: flex;
          gap: 8px;
        }
        .tracking-modern input {
          flex: 1;
          padding: 10px 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.85rem;
          outline: none;
        }
        .tracking-modern input:focus { border-color: var(--primary); }
        .tracking-modern .track-btn {
          padding: 10px 18px;
          background: var(--primary);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.82rem;
          cursor: pointer;
          white-space: nowrap;
        }
        .tracking-modern .track-btn:disabled { opacity: 0.6; }

        /* Content section */
        .konten-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 0 12px 16px;
        }
        .konten-card {
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          text-align: center;
        }
        .konten-card img {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
          display: block;
        }
        .konten-card .konten-label {
          padding: 8px 10px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-dark);
        }

        /* Footer minimal */
        .footer-minimal {
          background: #fff;
          border-top: 1px solid #f0f0f0;
          padding: 20px 16px 28px;
          text-align: center;
        }
        .footer-minimal .fm-brand {
          font-size: 1rem;
          font-weight: 700;
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 8px;
        }
        .footer-minimal .fm-tagline {
          font-size: 0.78rem;
          color: var(--text-gray);
          margin-bottom: 12px;
        }
        .footer-minimal .fm-links {
          display: flex;
          justify-content: center;
          gap: 16px;
          font-size: 0.82rem;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .footer-minimal .fm-links a {
          color: var(--text-gray);
          text-decoration: none;
        }
        .footer-minimal .fm-links a:active { color: var(--primary); }
        .footer-minimal .fm-wa {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #25D366;
          color: #fff;
          padding: 10px 22px;
          border-radius: 20px;
          font-size: 0.82rem;
          font-weight: 600;
          text-decoration: none;
          margin-bottom: 10px;
        }
        .footer-minimal .fm-copy {
          font-size: 0.72rem;
          color: #bbb;
        }

        /* Section backgrounds */
        .shopee-section-bg { background: #f5f5f5; }
        .shopee-section-white { background: #fff; }

        /* Hamburger overlay */
        .hamburger-landing {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: var(--text-dark);
        }
        .nav-links {
          display: none;
          list-style: none;
          gap: var(--space-lg);
          position: fixed;
          top: 0;
          right: -100%;
          width: 280px;
          height: 100vh;
          background: var(--white);
          flex-direction: column;
          padding: 80px var(--space-lg) var(--space-lg);
          box-shadow: var(--elevation-4);
          transition: right 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 200;
        }
        .nav-links.open {
          display: flex;
          right: 0;
        }
        .nav-links a {
          color: var(--text-gray);
          font-weight: 500;
          font-size: 0.9375rem;
          padding: var(--space-md) 0;
          border-bottom: 1px solid #f1f5f9;
          display: block;
        }

        /* Misc */
        .coming-soon-badge-shopee {
          display: inline-block;
          background: #f59e0b;
          color: #fff;
          font-size: 0.55rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 3px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 4px;
        }
        .dim-card-shopee {
          opacity: 0.55;
          filter: grayscale(0.4);
          pointer-events: none;
        }

        /* Responsive */
        @media (min-width: 600px) {
          .shopee-grid { grid-template-columns: 1fr 1fr 1fr; }
          .konten-grid { grid-template-columns: 1fr 1fr 1fr; }
          .category-grid { grid-template-columns: repeat(4, 1fr); padding: 16px 24px; margin: 0 24px 16px; }
          .banner-carousel-wrap { margin: 12px 24px; }
          .tracking-modern { margin: 0 24px 20px; max-width: 600px; }
          .shopee-topbar { padding: 10px 24px; }
          .shopee-section-header { padding: 18px 24px 10px; }
          .shopee-grid { padding: 0 24px 20px; }
          .konten-grid { padding: 0 24px 20px; }
          .flashsale-row { padding: 0 24px 16px; }
        }
        @media (min-width: 900px) {
          .shopee-grid { grid-template-columns: repeat(4, 1fr); }
          .konten-grid { grid-template-columns: repeat(3, 1fr); }
          .shopee-topbar { padding: 12px 48px; }
          .banner-carousel-wrap { margin: 16px 48px; max-width: 900px; margin-left: auto; margin-right: auto; }
          .category-grid { max-width: 900px; margin: 0 auto 16px; }
          .shopee-section-header { max-width: 900px; margin: 0 auto; padding-left: 0; padding-right: 0; }
          .shopee-grid { max-width: 900px; margin: 0 auto; padding-left: 0; padding-right: 0; }
          .konten-grid { max-width: 900px; margin: 0 auto; padding-left: 0; padding-right: 0; }
          .flashsale-row { max-width: 900px; margin: 0 auto; padding-left: 0; padding-right: 0; }
          .tracking-modern { margin: 0 auto 20px; }
        }
        }

        /* ===== Bottom Navigation (Android App style) ===== */
        .tab-content {
          padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
          min-height: 100vh;
        }
        .bottom-nav-shopee {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: calc(56px + env(safe-area-inset-bottom, 0px));
          padding-bottom: env(safe-area-inset-bottom, 0px);
          background: #fff;
          display: flex;
          align-items: stretch;
          justify-content: space-around;
          z-index: 100;
          box-shadow: 0 -1px 4px rgba(0,0,0,0.06);
          border: none;
        }
        .bn-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
          flex: 1;
          max-width: 80px;
          padding: 4px 8px 2px;
          background: none;
          border: none;
          cursor: pointer;
          color: #8e8e93;
          transition: color 0.15s;
          font-family: inherit;
          -webkit-tap-highlight-color: transparent;
        }
        .bn-item .bn-icon {
          font-size: 1.25rem;
          line-height: 1;
        }
        .bn-item .bn-label {
          font-size: 0.6rem;
          font-weight: 500;
          line-height: 1.2;
          letter-spacing: 0;
        }
        .bn-item.active {
          color: var(--primary);
        }
        .bn-item.active .bn-label {
          font-weight: 700;
        }
        .bn-item:active {
          opacity: 0.7;
        }

        /* Tab page animation */
        .tab-page {
          animation: tabFadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes tabFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (min-width: 600px) {
          .bottom-nav-shopee { max-width: 480px; left: 50%; transform: translateX(-50%); border-radius: 12px 12px 0 0; box-shadow: 0 -2px 8px rgba(0,0,0,0.08); }
          .shopee-topbar { padding: calc(4px + env(safe-area-inset-top, 0px)) 24px 4px; }
        }
        @media (min-width: 900px) {
          .shopee-topbar { padding: calc(6px + env(safe-area-inset-top, 0px)) 48px 6px; }
        }
      `}</style>

      {/* ===== 1. TOP BAR ===== */}
      <header className="shopee-topbar">
        <button
          className="hamburger-landing"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <div className="shopee-topbar-logo">
          <span>👟</span> Danee
        </div>
        <div className="shopee-search">
          <input
            type="text"
            placeholder="Cari layanan atau produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="shopee-search-icon">🔍</span>
        </div>
        <div className="shopee-topbar-icons">
          <button onClick={() => scrollTo('tracking')} title="Cek order">
            📋
          </button>
          <button onClick={() => window.open(WA_BASE, '_blank')} title="Hubungi kami">
            <span>💬</span>
            <span className="shopee-badge-dot" />
          </button>
        </div>

        {/* Mobile drawer overlay */}
        {menuOpen && (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
              zIndex: 199,
            }}
            onClick={() => setMenuOpen(false)}
          />
        )}
        <ul className={`nav-links${menuOpen ? ' open' : ''}`}>
          <li><a href="#jasa" onClick={(e) => { e.preventDefault(); scrollTo('jasa'); }}>Layanan</a></li>
          <li><a href="#store" onClick={(e) => { e.preventDefault(); scrollTo('store'); }}>Produk</a></li>
          <li><a href="#tracking" onClick={(e) => { e.preventDefault(); scrollTo('tracking'); }}>Tracking</a></li>
          <li><a href="#konten" onClick={(e) => { e.preventDefault(); scrollTo('konten'); }}>Konten</a></li>
          <li><a href={WA_BASE} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>💬 WhatsApp</a></li>
        </ul>
      </header>

      <div className="tab-content">
        {activeTab === 'beranda' && (
          <div className="tab-page">
      {/* ===== 2. BANNER CAROUSEL ===== */}
      <section className="banner-carousel-wrap">
        <div
          className="banner-carousel-track"
          style={{ transform: `translateX(-${bannerIdx * 100}%)` }}
        >
          {bannerItems.length > 0 ? (
            bannerItems.map((item) => (
              <div className="banner-slide" key={item.id}>
                {item.isi_konten && (item.isi_konten.startsWith('http') || item.isi_konten.startsWith('data:')) ? (
                  <img src={item.isi_konten} alt={item.keterangan} />
                ) : (
                  <div className="banner-slide no-img">
                    <h3>👟 {item.keterangan}</h3>
                    <p>{item.isi_konten || 'Tips & edukasi perawatan sepatu dari Danee Shoes Care'}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="banner-slide no-img">
              <h3>👟 Danee Shoes Care</h3>
              <p>Cuci Sepatu & Reparasi Profesional — Purwakarta</p>
              <a
                href={`${WA_BASE}?text=Halo%20Danee%20Shoes%20Care`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-shopee-primary"
                style={{
                  display: 'inline-block',
                  padding: '10px 24px',
                  borderRadius: 20,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  marginTop: 8,
                }}
              >
                💬 Order Sekarang
              </a>
            </div>
          )}
        </div>
        {bannerItems.length > 1 && (
          <div className="banner-dots">
            {bannerItems.map((_, i) => (
              <button
                key={i}
                className={`banner-dot${i === bannerIdx ? ' active' : ''}`}
                onClick={() => goToBanner(i)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ===== 3. KATEGORI LAYANAN ===== */}
      <section className="category-grid">
        <button className="category-item" onClick={() => scrollTo('jasa')}>
          <div className="category-circle">👟</div>
          <span className="category-label">Cleaning</span>
        </button>
        <button className="category-item" onClick={() => scrollTo('jasa')}>
          <div className="category-circle">🔧</div>
          <span className="category-label">Repair</span>
        </button>
        <button className="category-item" onClick={() => scrollTo('store')}>
          <div className="category-circle">🛍️</div>
          <span className="category-label">Produk</span>
        </button>
        <button className="category-item" onClick={() => scrollTo('konten')}>
          <div className="category-circle">📖</div>
          <span className="category-label">Tips</span>
        </button>
        <button className="category-item" onClick={() => scrollTo('tracking')}>
          <div className="category-circle">📦</div>
          <span className="category-label">Tracking</span>
        </button>
        {instagram && (
          <a className="category-item" href={instagram.isi_konten} target="_blank" rel="noopener noreferrer">
            <div className="category-circle">📷</div>
            <span className="category-label">Instagram</span>
          </a>
        )}
        {youtube && (
          <a className="category-item" href={youtube.isi_konten} target="_blank" rel="noopener noreferrer">
            <div className="category-circle">▶️</div>
            <span className="category-label">YouTube</span>
          </a>
        )}
        <a className="category-item" href={WA_BASE} target="_blank" rel="noopener noreferrer">
          <div className="category-circle" style={{ background: '#e8f5e9' }}>💬</div>
          <span className="category-label">WhatsApp</span>
        </a>
      </section>

      {/* ===== 4. FLASH SALE / PROMO ===== */}
      {flashSaleItems.length > 0 && (
        <section className="shopee-section-white" style={{ paddingTop: 4, paddingBottom: 4 }}>
          <div className="shopee-section-header">
            <h2>⚡ Flash Sale</h2>
            <a href="#jasa" onClick={(e) => { e.preventDefault(); scrollTo('jasa'); }}>Lihat Semua</a>
          </div>
          <div className="flashsale-row">
            {flashSaleItems.map((item) => {
              const diskonPct = item.harga > 0
                ? Math.round(((item.harga - (item.harga_promo || 0)) / item.harga) * 100)
                : 0;
              return (
                <div className="flashsale-card" key={item.id} onClick={() => openDeliveryModal(item)}>
                  <div className="fs-icon">{CATEGORY_ICONS[item.kategori] || '🛠️'}</div>
                  <div className="fs-name">{item.nama_layanan}</div>
                  <div className="fs-price-old">{formatCurrency(item.harga)}</div>
                  <div className="fs-price-new">{formatCurrency(item.harga_promo || 0)}</div>
                  <div className="fs-discount">-{diskonPct}%</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

          </div>
        )}

        {activeTab === 'layanan' && (
          <div className="tab-page">
      {/* ===== 5. DAFTAR LAYANAN ===== */}
      <section id="jasa" className="shopee-section-bg" style={{ paddingTop: 8, paddingBottom: 4 }}>
        <div className="shopee-section-header">
          <h2>🛒 Layanan</h2>
          <a href={`${WA_BASE}?text=Halo%20Danee%20Shoes%20Care%20Saya%20mau%20order...`} target="_blank" rel="noopener noreferrer">Hubungi Kami</a>
        </div>

        {jasaError && (
          <div className="alert alert-danger" style={{ margin: '0 12px 12px' }}>
            {jasaError}
          </div>
        )}

        {!jasaError && filteredJasa.length === 0 && (
          <p className="text-center text-muted" style={{ padding: '20px 12px' }}>
            {searchQuery ? `Tidak ada layanan untuk "${searchQuery}"` : 'Belum ada layanan tersedia.'}
          </p>
        )}

        {!jasaError && filteredJasa.length > 0 && (
          <div className="shopee-grid">
            {filteredJasa.map((service) => {
              const isComing = service.status === 'Coming Soon';
              const hasPromo = service.harga_promo && service.harga_promo > 0;
              return (
                <div
                  className={`shopee-card${isComing ? ' dim-card-shopee' : ''}`}
                  key={service.id}
                >
                  <div className="shopee-service-top">
                    {isComing && <div className="coming-soon-badge-shopee">Coming Soon</div>}
                    <div className="shopee-service-icon">
                      {CATEGORY_ICONS[service.kategori] || '🛠️'}
                    </div>
                    <div className="shopee-service-name">{service.nama_layanan}</div>
                    {service.deskripsi && (
                      <div className="shopee-service-desc">{service.deskripsi}</div>
                    )}
                    <div className="shopee-service-price">
                      {hasPromo ? (
                        <>
                          {formatCurrency(service.harga_promo || 0)}{' '}
                          <span className="shopee-service-promo">{formatCurrency(service.harga)}</span>
                        </>
                      ) : (
                        service.harga > 0 ? formatCurrency(service.harga) : 'Gratis'
                      )}
                    </div>
                  </div>
                  <div className="shopee-card-footer">
                    {!isComing ? (
                      <button
                        className="btn-shopee-primary"
                        onClick={() => openDeliveryModal(service)}
                      >
                        💬 Order
                      </button>
                    ) : (
                      <button className="btn-shopee-disabled">
                        ⏳ Segera
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

          </div>
        )}

        {activeTab === 'produk' && (
          <div className="tab-page">
      {/* ===== 6. PRODUK STORE ===== */}
      <section id="store" className="shopee-section-white" style={{ paddingTop: 8, paddingBottom: 4 }}>
        <div className="shopee-section-header">
          <h2>🏪 Produk</h2>
          <a href={`${WA_BASE}?text=Halo%20Danee%20Shoes%20Care%20Saya%20tertarik%20dengan%20produk...`} target="_blank" rel="noopener noreferrer">Tanya Stok</a>
        </div>

        {storeError && (
          <div className="alert alert-danger" style={{ margin: '0 12px 12px' }}>
            {storeError}
          </div>
        )}

        {!storeError && filteredStore.length === 0 && (
          <p className="text-center text-muted" style={{ padding: '20px 12px' }}>
            {searchQuery ? `Tidak ada produk untuk "${searchQuery}"` : 'Belum ada produk tersedia.'}
          </p>
        )}

        {!storeError && filteredStore.length > 0 && (
          <div className="shopee-grid">
            {filteredStore.map((product) => {
              const outOfStock = product.stok <= 0;
              return (
                <div
                  className={`shopee-card${outOfStock ? ' dim-card-shopee' : ''}`}
                  key={product.id}
                >
                  {product.link_foto ? (
                    <img
                      className="shopee-store-img"
                      src={product.link_foto}
                      alt={product.nama_produk}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="shopee-store-img-placeholder">🛍️</div>
                  )}
                  <div className="shopee-store-info">
                    <div className="shopee-store-name">{product.nama_produk}</div>
                    <div className="shopee-store-price">
                      {product.harga_promo && product.harga_promo > 0 ? (
                        <>
                          {formatCurrency(product.harga_promo)}{' '}
                          <span className="shopee-service-promo">{formatCurrency(product.harga)}</span>
                        </>
                      ) : (
                        formatCurrency(product.harga)
                      )}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: outOfStock ? '#ef4444' : '#10b981', fontWeight: 600, marginTop: 2 }}>
                      {outOfStock ? 'Stok Habis' : `Stok: ${product.stok}`}
                    </div>
                  </div>
                  <div className="shopee-card-footer">
                    {!outOfStock ? (
                      <button
                        className="btn-shopee-primary"
                        onClick={() => {
                          let msg = `Halo Danee Shoes Care! Saya tertarik dengan produk berikut:\n\n`;
                          msg += `*Produk:* ${product.nama_produk}\n`;
                          msg += `*Harga:* ${formatCurrency(product.harga)}\n`;
                          msg += `*Stok:* ${product.stok}\n`;
                          if (product.link_marketplace) msg += `\nAtau lihat di marketplace: ${product.link_marketplace}`;
                          msg += `\n\nTerima kasih.`;
                          window.open(`${WA_BASE}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                      >
                        🛒 Beli
                      </button>
                    ) : (
                      <button className="btn-shopee-disabled">
                        Habis
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

          </div>
        )}

        {activeTab === 'lainnya' && (
          <div className="tab-page">
      {/* ===== 7. TRACKING ORDER ===== */}
      <section id="tracking" className="shopee-section-bg" style={{ paddingTop: 12, paddingBottom: 8 }}>
        <div className="shopee-section-header">
          <h2>📦 Cek Order</h2>
        </div>

        <div className="tracking-modern">
          <div className="track-input-row">
            <input
              type="text"
              placeholder="Cari order (kode / nama)..."
              value={trackKeyword}
              onChange={(e) => setTrackKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTrack(); }}
            />
            <button
              className="track-btn"
              onClick={handleTrack}
              disabled={trackLoading}
            >
              {trackLoading ? '⚙️' : '🔍 Cari'}
            </button>
          </div>

          {trackError && (
            <p style={{ textAlign: 'center', color: '#ef4444', marginTop: '12px', fontSize: '0.82rem', fontWeight: 600 }}>
              {trackError}
            </p>
          )}

          {trackResult && trackResult.length > 0 && (
            <div style={{ marginTop: '14px' }}>
              <p style={{ textAlign: 'center', color: 'var(--text-gray)', fontSize: '0.78rem', marginBottom: '10px' }}>
                {trackResult.length} order ditemukan
              </p>
              {trackResult.map((order) => (
                <div
                  key={order.id}
                  style={{
                    background: '#f8f9fa',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.8rem' }}>
                      #{order.kode}
                    </span>
                    <span className={`badge ${getStatusBadgeClass(order.status)}`} style={{ fontSize: '0.68rem' }}>
                      {order.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', lineHeight: 1.6 }}>
                    <strong>Nama:</strong> {order.nama_pelanggan}<br />
                    <strong>Layanan:</strong> {order.layanan}<br />
                    <strong>Harga:</strong> {formatCurrency(order.harga)}
                  </div>
                  {order.tanggal && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-gray)', marginTop: 4 }}>
                      📅 {new Date(order.tanggal).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  )}
                  {order.catatan && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-gray)', marginTop: 2, fontStyle: 'italic' }}>
                      CATATAN: {order.catatan}
                    </div>
                  )}
                  {order.diskon_info && (
                    <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: 2, fontWeight: 600 }}>
                      💰 Diskon: {order.diskon_info}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== 8. KONTEN + TESTIMONI ===== */}
      <section id="konten" className="shopee-section-white" style={{ paddingTop: 8, paddingBottom: 4 }}>
        {!kontenError && (edukasiList.length > 0 || testimoniList.length > 0) ? (
          <>
            {edukasiList.length > 0 && (
              <>
                <div className="shopee-section-header">
                  <h2>📖 Edukasi</h2>
                </div>
                <div className="konten-grid">
                  {edukasiList.map((item) => (
                    <div className="konten-card" key={item.id}>
                      {item.isi_konten && (
                        <img
                          src={item.isi_konten}
                          alt={item.keterangan}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="konten-label">{item.keterangan}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {testimoniList.length > 0 && (
              <>
                <div className="shopee-section-header" style={{ paddingTop: 4 }}>
                  <h2>⭐ Testimoni</h2>
                </div>
                <div className="konten-grid">
                  {testimoniList.map((item) => (
                    <div className="konten-card" key={item.id}>
                      {item.isi_konten && (
                        <img
                          src={item.isi_konten}
                          alt={item.keterangan}
                          style={{ borderRadius: '50%', width: 64, height: 64, objectFit: 'cover', margin: '16px auto 0' }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="konten-label" style={{ padding: '10px' }}>⭐ {item.keterangan}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : kontenError ? (
          <div className="alert alert-danger" style={{ margin: '0 12px 12px' }}>
            {kontenError}
          </div>
        ) : (
          <p className="text-center text-muted" style={{ padding: '20px 12px' }}>
            Belum ada konten edukasi atau testimoni.
          </p>
        )}
      </section>

      {/* ===== 9. FOOTER MINIMAL ===== */}
      <footer className="footer-minimal">
        <div className="fm-brand">
          <span>👟</span> Danee Shoes Care
        </div>
        <div className="fm-tagline">
          Cuci Sepatu & Reparasi Profesional — Purwakarta
        </div>
        <a
          href={`${WA_BASE}?text=Halo%20Danee%20Shoes%20Care`}
          target="_blank"
          rel="noopener noreferrer"
          className="fm-wa"
        >
          💬 Hubungi via WhatsApp
        </a>
        <div className="fm-links">
          {instagram && (
            <a href={instagram.isi_konten} target="_blank" rel="noopener noreferrer">
              📷 Instagram
            </a>
          )}
          {youtube && (
            <a href={youtube.isi_konten} target="_blank" rel="noopener noreferrer">
              ▶️ YouTube
            </a>
          )}
          <a href={WA_BASE} target="_blank" rel="noopener noreferrer">
            💬 WhatsApp
          </a>
          <a href="https://maps.google.com/?q=Danee+Shoes+Care+Purwakarta" target="_blank" rel="noopener noreferrer">
            📍 Maps
          </a>
          <a href="/login">
            🔐 Admin
          </a>
        </div>
        <div className="fm-copy">
          &copy; {new Date().getFullYear()} Danee Shoes Care
        </div>
      </footer>

          </div>
        )}
      </div>

      {/* ===== BOTTOM NAV ===== */}
      <nav className="bottom-nav-shopee">
        <button
          className={`bn-item${activeTab === 'beranda' ? ' active' : ''}`}
          onClick={() => setActiveTab('beranda')}
        >
          <span className="bn-icon">🏠</span>
          <span className="bn-label">Beranda</span>
        </button>
        <button
          className={`bn-item${activeTab === 'layanan' ? ' active' : ''}`}
          onClick={() => setActiveTab('layanan')}
        >
          <span className="bn-icon">👟</span>
          <span className="bn-label">Layanan</span>
        </button>
        <button
          className={`bn-item${activeTab === 'produk' ? ' active' : ''}`}
          onClick={() => setActiveTab('produk')}
        >
          <span className="bn-icon">🛍️</span>
          <span className="bn-label">Produk</span>
        </button>
        <button
          className={`bn-item${activeTab === 'lainnya' ? ' active' : ''}`}
          onClick={() => setActiveTab('lainnya')}
        >
          <span className="bn-icon">📋</span>
          <span className="bn-label">Lainnya</span>
        </button>
      </nav>

      {/* ===== DELIVERY MODAL ===== */}
      {modalOpen && modalService && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📦 Metode Penyerahan</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: 'var(--text-gray)', fontSize: '0.9rem' }}>
                Pilih metode penyerahan untuk layanan{' '}
                <strong style={{ color: 'var(--text-dark)' }}>{modalService.nama_layanan}</strong>
                {' '}— {formatCurrency(modalService.harga)}
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 16px',
                    border: `2px solid ${deliveryMethod === 'antar' ? 'var(--primary)' : '#e2e8f0'}`,
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    marginBottom: '0.75rem',
                    background: deliveryMethod === 'antar' ? 'var(--navy-light)' : 'var(--white)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    type="radio" name="delivery" value="antar"
                    checked={deliveryMethod === 'antar'}
                    onChange={() => setDeliveryMethod('antar')}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <div>
                    <strong>Antar Sendiri (Drop-off)</strong>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-gray)', margin: 0 }}>
                      Kamu antar sepatu ke tempat kami
                    </p>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '12px 16px',
                    border: `2px solid ${deliveryMethod === 'jemput' ? 'var(--primary)' : '#e2e8f0'}`,
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    background: deliveryMethod === 'jemput' ? 'var(--navy-light)' : 'var(--white)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    type="radio" name="delivery" value="jemput"
                    checked={deliveryMethod === 'jemput'}
                    onChange={() => setDeliveryMethod('jemput')}
                    style={{ accentColor: 'var(--primary)', marginTop: '3px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <strong>Jemput (Pickup)</strong>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-gray)', margin: '0 0 0.5rem 0' }}>
                      Kami jemput sepatu ke lokasi kamu
                    </p>
                    {deliveryMethod === 'jemput' && (
                      <textarea
                        className="form-control"
                        placeholder="Tulis alamat lengkap untuk penjemputan..."
                        rows={3}
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        style={{ fontSize: '0.85rem' }}
                      />
                    )}
                  </div>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-white" onClick={() => setModalOpen(false)}>Batal</button>
              <button className="btn btn-primary" onClick={confirmOrder}>✅ Konfirmasi & Order via WA</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
