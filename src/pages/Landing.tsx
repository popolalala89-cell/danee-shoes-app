import React, { useState, useEffect } from 'react';
import { getAll } from '../lib/services/menu-jasa-service';
import { getAllActive } from '../lib/services/menu-store-service';
import { getAll as getAllKonten } from '../lib/services/konten-service';
import { getWaNumber } from '../lib/services/settings-service';
import { trackOrder } from '../lib/services/order-service';
import { formatCurrency } from '../lib/utils';
import type { MenuJasaRow, MenuStoreRow, KontenWebRow, OrderRow } from '../lib/types-supabase';

/* ── Helpers ─────────────────────────────────────────────────── */
function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Selesai':     return 'badge-selesai';
    case 'Ready':       return 'badge-ready';
    case 'Batal':       return 'badge-batal';
    case 'Waiting':     return 'badge-waiting';
    default:            return 'badge-proses';
  }
}

const CATEGORY_ICONS: Record<string, string> = {
  Cleaning: '👟',
  Repair:   '🔧',
};

/* ── Sections are implemented as separate named constants so
     TypeScript can validate them — the JSX below just uses them.  */

export default function Landing() {
  /* ── State ─────────────────────────────────────────────── */
  const [menuOpen, setMenuOpen] = useState(false);

  // Data states
  const [loading, setLoading] = useState(true);
  const [jasaList, setJasaList] = useState<MenuJasaRow[]>([]);
  const [storeList, setStoreList] = useState<MenuStoreRow[]>([]);
  const [kontenList, setKontenList] = useState<KontenWebRow[]>([]);
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

  const WA_BASE = `https://wa.me/${waNumber}`;

  /* ── Fetch ─────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // Load WA number first
        const waRes = await getWaNumber();
        if (!cancelled && waRes.success && waRes.data) {
          setWaNumber(waRes.data);
        }

        // Fetch all sections in parallel
        const [jasaRes, storeRes, kontenRes] = await Promise.all([
          getAll().catch(() => ({ success: false as const, error: 'Gagal memuat layanan' })),
          getAllActive().catch(() => ({ success: false as const, error: 'Gagal memuat produk' })),
          getAllKonten().catch(() => ({ success: false as const, error: 'Gagal memuat konten' })),
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
    let msg = `Halo Danee Shoes & Clean! Saya ingin order jasa berikut:\n\n`;
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
      {/* ── Inline responsive overrides ── */}
      <style>{`
        .hero-danee {
          position: relative;
          padding: 3rem 1rem;
          text-align: center;
          background: linear-gradient(135deg, #034BB9 0%, #023C94 50%, #011e4a 100%);
          overflow: hidden;
          color: #fff;
        }
        .hero-danee::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at 30% 40%, rgba(255,255,255,0.06) 0%, transparent 60%);
          pointer-events: none;
        }
        .hero-danee h1 {
          font-size: 1.85rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 0.5rem;
          position: relative;
        }
        .hero-danee .tagline {
          font-size: 1rem;
          color: rgba(255,255,255,0.85);
          font-weight: 400;
          margin-bottom: 1.5rem;
          position: relative;
        }
        .hero-danee .hero-sub {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.7);
          max-width: 400px;
          margin: 0 auto 1.75rem;
          line-height: 1.6;
          position: relative;
        }
        .hero-wa-float {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #25D366;
          color: #fff;
          padding: 14px 32px;
          border-radius: 50px;
          font-weight: 700;
          font-size: 1rem;
          box-shadow: 0 6px 20px rgba(37,211,102,0.4);
          transition: all 0.2s ease;
          text-decoration: none;
          position: relative;
        }
        .hero-wa-float:active {
          transform: scale(0.97);
          box-shadow: 0 3px 12px rgba(37,211,102,0.3);
        }
        .service-badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .badge-cleaning { background: #e0f2fe; color: #0369a1; }
        .badge-repair   { background: #fef3c7; color: #92400e; }
        .coming-soon-tag {
          position: absolute;
          top: 8px;
          right: 8px;
          background: #f59e0b;
          color: #fff;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .dim-card {
          opacity: 0.55;
          filter: grayscale(0.5);
          pointer-events: none;
        }
        .section-danee {
          padding: 2.5rem 1rem;
          max-width: 1100px;
          margin: 0 auto;
        }
        .section-danee-alt {
          background: var(--light);
        }
        .section-title-danee {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .section-title-danee h2 {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--dark);
        }
        .section-title-danee h2 span {
          color: #034BB9;
        }
        .section-title-danee p {
          color: var(--text-gray);
          font-size: 0.875rem;
          margin-top: 4px;
        }
        .grid-danee {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        @media (min-width: 600px) {
          .grid-danee { grid-template-columns: 1fr 1fr; }
          .hero-danee h1 { font-size: 2.25rem; }
        }
        @media (min-width: 900px) {
          .grid-danee { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
          .hero-danee { padding: 5rem 2rem; }
          .hero-danee h1 { font-size: 2.75rem; }
          .section-danee { padding: 4rem 2rem; }
        }
        .track-result-card {
          background: var(--white);
          border-radius: var(--radius);
          padding: 1rem;
          box-shadow: var(--elevation-1);
          margin-bottom: 0.75rem;
        }
        .track-result-card:last-child { margin-bottom: 0; }
        .store-img-placeholder {
          width: 100%;
          height: 160px;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          border-radius: var(--radius-sm);
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
        }
        .wa-footer-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #25D366;
          color: #fff;
          padding: 12px 24px;
          border-radius: 50px;
          font-weight: 600;
          font-size: 0.9rem;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .wa-footer-btn:active {
          opacity: 0.9;
          transform: scale(0.98);
        }
      `}</style>

      {/* ===== NAVBAR ===== */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span style={{ fontSize: '1.3rem' }}>👟</span> Danee Shoes &amp; Clean
        </div>
        <button
          className="hamburger-landing"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        {/* Overlay when menu open */}
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
          <li><a href={WA_BASE} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="mat-icon" style={{ fontSize: 18 }}>chat</span> WhatsApp</a></li>
        </ul>
      </nav>

      {/* ===== 1. HERO SECTION ===== */}
      <section className="hero-danee">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(4px)',
              color: '#fff',
              padding: '6px 18px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '1rem',
            }}
          >
            🏆 Premium Shoe Care Service
          </div>
          <h1>Danee Shoes &amp; Clean</h1>
          <p className="tagline">Cuci Sepatu &amp; Reparasi Profesional</p>
          <p className="hero-sub">
            Percayakan perawatan sepatu kesayanganmu kepada ahlinya.
            Kami siap cleaning, repair, dan jual produk perawatan sepatu terbaik.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
            <a
              href={`${WA_BASE}?text=Halo%20Danee%20Shoes%20%26%20Clean%21%20Saya%20mau%20order%20jasa...`}
              target="_blank"
              rel="noopener noreferrer"
              className="hero-wa-float"
            >
              <span className="mat-icon" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 6 }}>smartphone</span> Order via WhatsApp
            </a>
            <button
              className="btn btn-outline"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1.5px solid rgba(255,255,255,0.35)',
                color: '#fff',
                backdropFilter: 'blur(4px)',
                fontSize: '0.95rem',
                minHeight: '52px',
                padding: '0 24px',
              }}
              onClick={() => scrollTo('tracking')}
            >
              📦 Cek Status Order
            </button>
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            <a
              href="https://maps.google.com/?q=Danee+Shoes+%26+Clean+Purwakarta"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(4px)',
                padding: '7px 16px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              <span className="mat-icon" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>location_on</span> Purwakarta, Jawa Barat
            </a>
          </div>
        </div>
      </section>

      {/* ===== 2. MENU JASA SECTION ===== */}
      <section id="jasa" className="section-danee">
        <div className="section-title-danee">
          <h2>Menu <span>Jasa</span></h2>
          <p>Layanan cleaning &amp; repair profesional untuk sepatu kesayanganmu</p>
        </div>

        {jasaError && (
          <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
            {jasaError}
          </div>
        )}

        {!jasaError && activeServices.length === 0 && (
          <p className="text-center text-muted">Belum ada layanan tersedia.</p>
        )}

        <div className="grid-danee">
          {activeServices.map((service) => {
            const isComing = service.status === 'Coming Soon';
            return (
              <div
                className={`service-card${isComing ? ' dim-card' : ''}`}
                key={service.id}
                style={{ position: 'relative' }}
              >
                {isComing && <span className="coming-soon-tag">Coming Soon</span>}
                <div className="icon">
                  {CATEGORY_ICONS[service.kategori] || '🛠️'}
                </div>
                <h3>{service.nama_layanan}</h3>
                <div style={{ marginBottom: '0.5rem' }}>
                  <span className={`service-badge ${
                    service.kategori === 'Cleaning' ? 'badge-cleaning' : 'badge-repair'
                  }`}>
                    {service.kategori === 'Cleaning' ? '🧹 Cleaning' : '🔧 Repair'}
                  </span>
                </div>
                <div className="price">
                  {service.harga > 0 ? formatCurrency(service.harga) : 'Gratis'}
                </div>
                {service.deskripsi && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-gray)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                    {service.deskripsi}
                  </p>
                )}
                {!isComing && (
                  <button
                    className="btn btn-primary"
                    onClick={() => openDeliveryModal(service)}
                    style={{ width: '100%' }}
                  >
                    <span className="mat-icon" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 6 }}>smartphone</span> Order via WhatsApp
                  </button>
                )}
                {isComing && (
                  <button
                    className="btn btn-secondary"
                    disabled
                    style={{ width: '100%' }}
                  >
                    ⏳ Segera Hadir
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== 3. MENU STORE SECTION ===== */}
      <section id="store" className="section-danee section-danee-alt" style={{ padding: '2.5rem 1rem' }}>
        <div className="section-danee" style={{ padding: 0, maxWidth: '1100px', margin: '0 auto' }}>
          <div className="section-title-danee">
            <h2>Store <span>Produk</span></h2>
            <p>Produk perawatan sepatu original dan berkualitas</p>
          </div>

          {storeError && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
              {storeError}
            </div>
          )}

          {!storeError && storeList.length === 0 && (
            <p className="text-center text-muted">Belum ada produk tersedia.</p>
          )}

          <div className="grid-danee">
            {storeList.map((product) => {
              const outOfStock = product.stok <= 0;
              return (
                <div
                  className={`card${outOfStock ? ' dim-card' : ''}`}
                  key={product.id}
                  style={{ textAlign: 'center', position: 'relative' }}
                >
                  {outOfStock && <span className="coming-soon-tag" style={{ background: '#ef4444' }}>Stok Habis</span>}
                  {product.link_foto ? (
                    <img
                      src={product.link_foto}
                      alt={product.nama_produk}
                      style={{
                        width: '100%', height: '180px', objectFit: 'cover',
                        borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem',
                      }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="store-img-placeholder">🛍️</div>
                  )}
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.4rem' }}>
                    {product.nama_produk}
                  </h3>
                  <div className="price" style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                    {formatCurrency(product.harga)}
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    {!outOfStock ? (
                      <span className="badge badge-selesai" style={{ fontSize: '0.7rem' }}>
                        Stok: {product.stok}
                      </span>
                    ) : (
                      <span className="badge badge-batal" style={{ fontSize: '0.7rem' }}>
                        Stok Habis
                      </span>
                    )}
                  </div>
                  {product.deskripsi && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-gray)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                      {product.deskripsi}
                    </p>
                  )}
                  {!outOfStock && (
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={() => {
                        let msg = `Halo Danee Shoes & Clean! Saya tertarik dengan produk berikut:\n\n`;
                        msg += `*Produk:* ${product.nama_produk}\n`;
                        msg += `*Harga:* ${formatCurrency(product.harga)}\n`;
                        msg += `*Stok:* ${product.stok}\n`;
                        if (product.link_marketplace) msg += `\nAtau lihat di marketplace: ${product.link_marketplace}`;
                        msg += `\n\nTerima kasih.`;
                        window.open(`${WA_BASE}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                    >
                      <span className="mat-icon" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 6 }}>shopping_cart</span> Beli via WhatsApp
                    </button>
                  )}
                  {outOfStock && (
                    <button className="btn btn-secondary" disabled style={{ width: '100%' }}>
                      Stok Habis
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== 4. TRACK ORDER SECTION ===== */}
      <section id="tracking" className="section-danee">
        <div className="section-title-danee">
          <h2>Cek <span>Status Order</span></h2>
          <p>Masukkan kode order atau nama kamu untuk melacak status pesanan</p>
        </div>

        <div className="tracking-form">
          <input
            type="text"
            className="form-control"
            placeholder="Cari order (kode / nama)..."
            value={trackKeyword}
            onChange={(e) => setTrackKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleTrack(); }}
          />
          <button
            className="btn btn-primary"
            onClick={handleTrack}
            disabled={trackLoading}
            style={{ whiteSpace: 'nowrap' }}
          >
            {trackLoading ? '⚙️ Mencari...' : '🔍 Cek'}
          </button>
        </div>

        {trackError && (
          <p style={{ textAlign: 'center', color: 'var(--danger)', marginTop: '1rem', fontWeight: 600 }}>
            {trackError}
          </p>
        )}

        {trackResult && trackResult.length > 0 && (
          <div style={{ marginTop: '1.5rem', maxWidth: '500px', margin: '1.5rem auto 0' }}>
            <p style={{ textAlign: 'center', color: 'var(--text-gray)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              {trackResult.length} order ditemukan
            </p>
            {trackResult.map((order) => (
              <div className="track-result-card" key={order.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>
                    #{order.kode}
                  </span>
                  <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <p style={{ fontSize: '0.88rem', marginBottom: '0.3rem' }}>
                  <strong>Nama:</strong> {order.nama_pelanggan}
                </p>
                <p style={{ fontSize: '0.88rem', marginBottom: '0.3rem' }}>
                  <strong>Layanan:</strong> {order.layanan}
                </p>
                <p style={{ fontSize: '0.88rem', marginBottom: '0.3rem' }}>
                  <strong>Harga:</strong> {formatCurrency(order.harga)}
                </p>
                {order.tanggal && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-gray)' }}>
                    📅 {new Date(order.tanggal).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                )}
                {order.catatan && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-gray)', marginTop: '0.3rem', fontStyle: 'italic' }}>
                    CATATAN: {order.catatan}
                  </p>
                )}
                {order.diskon_info && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--success)', marginTop: '0.3rem', fontWeight: 600 }}>
                    💰 Diskon: {order.diskon_info}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== 5. OUR CONTENT SECTION ===== */}
      <section id="konten" className="section-danee section-danee-alt" style={{ padding: '2.5rem 1rem' }}>
        <div className="section-danee" style={{ padding: 0, maxWidth: '1100px', margin: '0 auto' }}>
          <div className="section-title-danee">
            <h2>Our <span>Content</span></h2>
            <p>Tips edukasi &amp; testimoni dari pelanggan kami</p>
          </div>

          {kontenError && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
              {kontenError}
            </div>
          )}

          {/* Edukasi */}
          {!kontenError && edukasiList.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '1rem', textAlign: 'center' }}>
                📖 Tips &amp; Edukasi
              </h3>
              <div className="grid-danee">
                {edukasiList.map((item) => (
                  <div className="card" key={item.id} style={{ textAlign: 'center' }}>
                    {item.isi_konten && (
                      <img
                        src={item.isi_konten}
                        alt={item.keterangan}
                        style={{
                          width: '100%', height: '180px', objectFit: 'cover',
                          borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem',
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-dark)' }}>
                      {item.keterangan}
                    </h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Testimoni */}
          {!kontenError && testimoniList.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '1rem', textAlign: 'center' }}>
                <span className="mat-icon" style={{ fontSize: 20, verticalAlign: 'middle', marginRight: 6, color: 'var(--warning)' }}>star</span> Testimoni Pelanggan
              </h3>
              <div className="grid-danee">
                {testimoniList.map((item) => (
                  <div className="card" key={item.id} style={{ textAlign: 'center' }}>
                    {item.isi_konten && (
                      <img
                        src={item.isi_konten}
                        alt={item.keterangan}
                        style={{
                          width: '64px', height: '64px', borderRadius: '50%',
                          objectFit: 'cover', marginBottom: '0.75rem',
                          border: '3px solid #034BB9',
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-dark)' }}>
                      {item.keterangan}
                    </h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!kontenError && edukasiList.length === 0 && testimoniList.length === 0 && (
            <p className="text-center text-muted">Belum ada konten edukasi atau testimoni.</p>
          )}
        </div>
      </section>

      {/* ===== 6. FOOTER ===== */}
      <footer className="footer">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>👟</span> Danee Shoes &amp; Clean
          </div>
          <p style={{ color: '#94a3b8', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
            Cuci Sepatu &amp; Reparasi Profesional – Purwakarta
          </p>

          <div style={{ marginBottom: '1.25rem' }}>
            <a
              href={`${WA_BASE}?text=Halo%20Danee%20Shoes%20%26%20Clean%21`}
              target="_blank"
              rel="noopener noreferrer"
              className="wa-footer-btn"
            >
              <span className="mat-icon" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 6 }}>chat</span> Hubungi via WhatsApp
            </a>
          </div>

          <div className="footer-links">
            <a href="#jasa" onClick={(e) => { e.preventDefault(); scrollTo('jasa'); }}>Layanan</a>
            <a href="#store" onClick={(e) => { e.preventDefault(); scrollTo('store'); }}>Produk</a>
            <a href="#tracking" onClick={(e) => { e.preventDefault(); scrollTo('tracking'); }}>Tracking</a>
            <a href="#konten" onClick={(e) => { e.preventDefault(); scrollTo('konten'); }}>Konten</a>
          </div>

          {/* Social */}
          <div className="footer-links" style={{ fontSize: '0.85rem' }}>
            {instagram && (
              <a href={instagram.isi_konten} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                📷 Instagram
              </a>
            )}
            {youtube && (
              <a href={youtube.isi_konten} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                ▶️ YouTube
              </a>
            )}
            <a href={WA_BASE} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
              <span className="mat-icon" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>chat</span> WhatsApp
            </a>
            <a href="https://maps.google.com/?q=Danee+Shoes+%26+Clean+Purwakarta" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
              <span className="mat-icon" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>location_on</span> Google Maps
            </a>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '1rem 0' }} />

          <div className="footer-links" style={{ fontSize: '0.8rem', gap: '16px' }}>
            <a href="/login" style={{ color: '#64748b' }}>
              <span className="mat-icon" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>lock</span> Admin
            </a>
          </div>

          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            &copy; {new Date().getFullYear()} Danee Shoes &amp; Clean. All rights reserved.
          </p>
        </div>
      </footer>

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
              <button className="btn btn-primary" onClick={confirmOrder}>✅ Konfirmasi &amp; Order via WA</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
