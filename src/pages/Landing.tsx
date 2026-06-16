import React, { useState, useEffect } from 'react';
import { getMenuJasa, getMenuStore, getKontenWeb, trackOrder } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import type { MenuJasa, MenuStore, KontenWeb, Order } from '../lib/types';

const WA_NUMBER = '6285111619226';
const WA_BASE = `https://wa.me/${WA_NUMBER}`;

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [jasaList, setJasaList] = useState<MenuJasa[]>([]);
  const [storeList, setStoreList] = useState<MenuStore[]>([]);
  const [kontenList, setKontenList] = useState<KontenWeb[]>([]);

  // Tracking state
  const [trackingKeyword, setTrackingKeyword] = useState('');
  const [trackingResult, setTrackingResult] = useState<Order[] | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  // Delivery modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalService, setModalService] = useState<MenuJasa | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState('antar');
  const [pickupAddress, setPickupAddress] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [jasaRes, storeRes, kontenRes] = await Promise.all([
          getMenuJasa(),
          getMenuStore(),
          getKontenWeb(),
        ]);
        if (jasaRes.success && jasaRes.data) setJasaList(jasaRes.data);
        if (storeRes.success && storeRes.data) setStoreList(storeRes.data);
        if (kontenRes.success && kontenRes.data) setKontenList(kontenRes.data);
      } catch (e) {
        console.error('Gagal memuat data landing:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Derived / filtered data
  const cleaningServices = jasaList.filter(
    (j) => j.Kategori === 'Cleaning' && j.Status === 'Aktif'
  );
  const repairServices = jasaList.filter(
    (j) => j.Kategori === 'Repair' && j.Status === 'Aktif'
  );
  const activeStore = storeList.filter((s) => s.Status === 'Aktif');
  const edukasiList = kontenList.filter(
    (k) => k.Kategori === 'Edukasi' && k.Status === 'Aktif'
  );
  const testimoniList = kontenList.filter(
    (k) => k.Kategori === 'Testimoni' && k.Status === 'Aktif'
  );
  const instagram = kontenList.find(
    (k) => k.Kategori === 'Instagram' && k.Status === 'Aktif'
  );
  const youtube = kontenList.find(
    (k) => k.Kategori === 'YouTube' && k.Status === 'Aktif'
  );

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTrack = async () => {
    const keyword = trackingKeyword.trim();
    if (!keyword) return;
    setTrackingLoading(true);
    setTrackingError('');
    setTrackingResult(null);
    try {
      const res = await trackOrder(keyword);
      if (res.success && res.data && res.data.length > 0) {
        setTrackingResult(res.data);
      } else {
        setTrackingError(res.message || 'Order tidak ditemukan.');
      }
    } catch {
      setTrackingError('Gagal melakukan tracking. Coba lagi.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleTrackKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTrack();
  };

  const openDeliveryModal = (service: MenuJasa) => {
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
    msg += `*Layanan:* ${modalService.NamaLayanan}\n`;
    msg += `*Harga:* ${formatCurrency(modalService.Harga)}\n`;
    msg += `*Metode Penyerahan:* ${methodLabel}\n`;
    if (deliveryMethod === 'jemput' && pickupAddress.trim()) {
      msg += `*Alamat Jemput:* ${pickupAddress.trim()}\n`;
    }
    msg += `\nTerima kasih.`;
    window.open(`${WA_BASE}?text=${encodeURIComponent(msg)}`, '_blank');
    setModalOpen(false);
    setModalService(null);
  };

  // ===== Loading state =====
  if (loading) {
    return (
      <div className="loading-overlay" style={{ minHeight: '100vh' }}>
        <div className="loading-spinner" />
        <p style={{ color: 'var(--text-gray)' }}>Memuat halaman...</p>
      </div>
    );
  }

  return (
    <>
      {/* Inline styles for mobile hamburger and responsive overrides */}
      <style>{`
        .hamburger-landing {
          display: none;
          background: none;
          border: none;
          font-size: 1.8rem;
          cursor: pointer;
          color: var(--text-dark);
          padding: 4px;
          line-height: 1;
          z-index: 51;
        }
        @media (max-width: 768px) {
          .hamburger-landing {
            display: block !important;
          }
          .nav-links {
            display: none !important;
            flex-direction: column;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--white);
            padding: 1rem 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.12);
            gap: 0.5rem;
          }
          .nav-links.open {
            display: flex !important;
          }
          .navbar {
            position: relative;
          }
          .nav-links a {
            display: block;
            padding: 10px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .service-card .price {
            font-size: 1.2rem;
          }
          .section {
            padding: 2.5rem 1rem;
          }
          .hero {
            padding: 3rem 1rem;
          }
          .hero h1 {
            font-size: 1.8rem;
          }
          .hero p {
            font-size: 0.95rem;
          }
        }
      `}</style>

      {/* ===== NAVBAR ===== */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span style={{ fontSize: '1.4rem' }}>👟</span> Danee Shoes &amp; Clean
        </div>
        <button
          className="hamburger-landing"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <ul className={`nav-links${menuOpen ? ' open' : ''}`}>
          <li>
            <a
              href="#layanan"
              onClick={(e) => {
                e.preventDefault();
                scrollTo('layanan');
              }}
            >
              Clean Treatment
            </a>
          </li>
          <li>
            <a
              href="#restorasi"
              onClick={(e) => {
                e.preventDefault();
                scrollTo('restorasi');
              }}
            >
              Repair Treatment
            </a>
          </li>
          <li>
            <a
              href="#store"
              onClick={(e) => {
                e.preventDefault();
                scrollTo('store');
              }}
            >
              Store Produk
            </a>
          </li>
          <li>
            <a
              href="#tracking"
              onClick={(e) => {
                e.preventDefault();
                scrollTo('tracking');
              }}
            >
              Order Tracking
            </a>
          </li>
        </ul>
      </nav>

      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="hero-content">
          <div
            style={{
              display: 'inline-block',
              background: 'var(--gold)',
              color: 'var(--white)',
              padding: '6px 18px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: '1.25rem',
              letterSpacing: '0.3px',
            }}
          >
            🏆 Tempat Nyuci Sepatu Kotormu
          </div>
          <h1>
            SOLUSI <span className="highlight">MAGER</span> NYUCI SEPATU
          </h1>
          <p>
            Percayakan perawatan sepatu kesayanganmu kepada ahlinya. Kami
            menyediakan layanan cleaning, repair, dan produk perawatan sepatu
            terbaik di Purwakarta. Tinggal diam, sepatu bersih dan wangi!
          </p>
          <div className="hero-btns">
            <a
              href={`${WA_BASE}?text=Halo%20Danee%20Shoes%20%26%20Clean%21%20Saya%20mau%20order%20jasa...`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-gold"
              style={{ fontSize: '1rem', padding: '12px 28px' }}
            >
              📱 Order via WhatsApp
            </a>
            <button
              className="btn btn-outline"
              style={{ fontSize: '1rem', padding: '12px 28px' }}
              onClick={() => scrollTo('tracking')}
            >
              📦 Cek Status Order
            </button>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <a
              href="https://maps.google.com/?q=Danee+Shoes+%26+Clean+Purwakarta"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--white)',
                padding: '8px 18px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-gray)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 4px 12px rgba(0,0,0,0.12)';
                e.currentTarget.style.color = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 2px 8px rgba(0,0,0,0.06)';
                e.currentTarget.style.color = 'var(--text-gray)';
              }}
            >
              📍 Purwakarta, Jawa Barat
            </a>
          </div>
        </div>
      </section>

      {/* ===== EDUKASI & TESTIMONI ===== */}
      <section id="edukasi" className="section-alt" style={{ padding: '4rem 2rem' }}>
        <div className="section" style={{ padding: '0', maxWidth: '1100px', margin: '0 auto' }}>
          <div className="section-title">
            <h2>
              Kenali <span className="highlight">Sepatumu</span>
            </h2>
            <p>
              Pelajari cara merawat sepatu kesayanganmu agar tetap awet dan
              nyaman dipakai. Simak tips dan testimoni dari pelanggan kami!
            </p>
          </div>

          {/* Edukasi grid */}
          {edukasiList.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              <h3
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  color: 'var(--dark)',
                  marginBottom: '1rem',
                  textAlign: 'center',
                }}
              >
                📖 Tips &amp; Edukasi
              </h3>
              <div className="cards-grid">
                {edukasiList.map((item) => (
                  <div className="card" key={item.ID} style={{ textAlign: 'center' }}>
                    {item.IsiKonten && (
                      <img
                        src={item.IsiKonten}
                        alt={item.Keterangan}
                        style={{
                          width: '100%',
                          height: '180px',
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-sm)',
                          marginBottom: '0.75rem',
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            'none';
                        }}
                      />
                    )}
                    <h4
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--text-dark)',
                      }}
                    >
                      {item.Keterangan}
                    </h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Testimoni grid */}
          {testimoniList.length > 0 && (
            <div>
              <h3
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  color: 'var(--dark)',
                  marginBottom: '1rem',
                  textAlign: 'center',
                }}
              >
                💬 Testimoni Pelanggan
              </h3>
              <div className="cards-grid">
                {testimoniList.map((item) => (
                  <div className="card" key={item.ID} style={{ textAlign: 'center' }}>
                    {item.IsiKonten && (
                      <img
                        src={item.IsiKonten}
                        alt={item.Keterangan}
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          marginBottom: '0.75rem',
                          border: '3px solid var(--gold)',
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            'none';
                        }}
                      />
                    )}
                    <h4
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--text-dark)',
                      }}
                    >
                      {item.Keterangan}
                    </h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {edukasiList.length === 0 && testimoniList.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-gray)' }}>
              Belum ada konten edukasi atau testimoni tersedia.
            </p>
          )}
        </div>
      </section>

      {/* ===== MENU CLEANING ===== */}
      <section id="layanan" className="section">
        <div className="section-title">
          <h2>
            Menu <span className="highlight">Cleaning</span>
          </h2>
          <p>Layanan cuci sepatu profesional dengan hasil maksimal.</p>
        </div>

        {cleaningServices.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-gray)' }}>
            Belum ada layanan cleaning tersedia.
          </p>
        ) : (
          <div className="cards-grid">
            {cleaningServices.map((service) => (
              <div className="service-card" key={service.ID}>
                <div className="icon">👟</div>
                <h3>{service.NamaLayanan}</h3>
                <div className="price">{formatCurrency(service.Harga)}</div>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-gray)',
                    lineHeight: 1.5,
                    marginBottom: '0.75rem',
                  }}
                >
                  {service.Deskripsi}
                </p>
                <button
                  className="btn btn-gold"
                  onClick={() => openDeliveryModal(service)}
                >
                  📱 Order via WhatsApp
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== MENU REPAIR ===== */}
      <section
        id="restorasi"
        className="section-alt"
        style={{ padding: '4rem 2rem' }}
      >
        <div
          className="section"
          style={{ padding: '0', maxWidth: '1100px', margin: '0 auto' }}
        >
          <div className="section-title">
            <h2>
              Menu <span className="highlight">Repair</span>
            </h2>
            <p>Kembalikan bentuk dan kenyamanan sepatu kesayanganmu.</p>
          </div>

          {repairServices.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-gray)' }}>
              Belum ada layanan repair tersedia.
            </p>
          ) : (
            <div className="cards-grid">
              {repairServices.map((service) => (
                <div className="service-card" key={service.ID}>
                  <div className="icon">🔧</div>
                  <h3>{service.NamaLayanan}</h3>
                  <div className="price">{formatCurrency(service.Harga)}</div>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-gray)',
                      lineHeight: 1.5,
                      marginBottom: '0.75rem',
                    }}
                  >
                    {service.Deskripsi}
                  </p>
                  <button
                    className="btn btn-gold"
                    onClick={() => openDeliveryModal(service)}
                  >
                    📱 Order via WhatsApp
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== STORE PRODUK ===== */}
      <section id="store" className="section">
        <div className="section-title">
          <h2>
            Store <span className="highlight">Produk</span>
          </h2>
          <p>Produk perawatan sepatu original dan berkualitas.</p>
        </div>

        {activeStore.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-gray)' }}>
            Belum ada produk tersedia.
          </p>
        ) : (
          <div className="cards-grid">
            {activeStore.map((product) => (
              <div className="card" key={product.ID} style={{ textAlign: 'center' }}>
                {product.LinkFoto ? (
                  <img
                    src={product.LinkFoto}
                    alt={product.NamaProduk}
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '0.75rem',
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        'none';
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '160px',
                      background: '#f1f5f9',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-gray)',
                      fontSize: '2rem',
                    }}
                  >
                    🛍️
                  </div>
                )}
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: 'var(--text-dark)',
                  }}
                >
                  {product.NamaProduk}
                </h3>
                <div
                  className="price"
                  style={{ fontSize: '1.3rem', margin: '0.5rem 0' }}
                >
                  {formatCurrency(product.Harga)}
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  {product.Stok > 0 ? (
                    <span
                      className="badge badge-selesai"
                      style={{ fontSize: '0.75rem' }}
                    >
                      Stok: {product.Stok}
                    </span>
                  ) : (
                    <span
                      className="badge badge-batal"
                      style={{ fontSize: '0.75rem' }}
                    >
                      Stok Habis
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-gray)',
                    lineHeight: 1.5,
                    marginBottom: '0.75rem',
                  }}
                >
                  {product.Deskripsi}
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    let msg = `Halo Danee Shoes & Clean! Saya tertarik dengan produk berikut:\n\n`;
                    msg += `*Produk:* ${product.NamaProduk}\n`;
                    msg += `*Harga:* ${formatCurrency(product.Harga)}\n`;
                    msg += `*Stok:* ${product.Stok}\n`;
                    if (product.LinkMarketplace) {
                      msg += `\nAtau lihat di marketplace: ${product.LinkMarketplace}`;
                    }
                    msg += `\n\nTerima kasih.`;
                    window.open(
                      `${WA_BASE}?text=${encodeURIComponent(msg)}`,
                      '_blank'
                    );
                  }}
                >
                  🛒 Beli
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== ORDER TRACKING ===== */}
      <section
        id="tracking"
        className="section-alt"
        style={{ padding: '4rem 2rem' }}
      >
        <div
          className="section"
          style={{ padding: '0', maxWidth: '1100px', margin: '0 auto' }}
        >
          <div className="section-title">
            <h2>
              Cek <span className="highlight">Status Order</span>
            </h2>
            <p>
              Masukkan nomor order atau nama kamu untuk melacak status pesanan.
            </p>
          </div>

          <div className="tracking-form">
            <input
              type="text"
              className="form-control"
              placeholder="Cari order (nama / ID)..."
              value={trackingKeyword}
              onChange={(e) => setTrackingKeyword(e.target.value)}
              onKeyDown={handleTrackKeyDown}
            />
            <button
              className="btn btn-primary"
              onClick={handleTrack}
              disabled={trackingLoading}
            >
              {trackingLoading ? '⚙️ Mencari...' : '🔍 Cek'}
            </button>
          </div>

          {/* Tracking results */}
          {trackingError && (
            <p
              style={{
                textAlign: 'center',
                color: 'var(--danger)',
                marginTop: '1rem',
                fontWeight: 600,
              }}
            >
              {trackingError}
            </p>
          )}

          {trackingResult && trackingResult.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3
                style={{
                  textAlign: 'center',
                  marginBottom: '1rem',
                  color: 'var(--text-dark)',
                }}
              >
                Hasil Pencarian ({trackingResult.length} order ditemukan)
              </h3>
              <div className="cards-grid">
                {trackingResult.map((order) => (
                  <div className="card" key={order.OrderID}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: 'var(--primary)',
                          fontSize: '0.85rem',
                        }}
                      >
                        #{order.OrderID}
                      </span>
                      <span
                        className={`badge ${
                          order.Status === 'Selesai'
                            ? 'badge-selesai'
                            : order.Status === 'Ready'
                            ? 'badge-ready'
                            : order.Status === 'Batal'
                            ? 'badge-batal'
                            : order.Status === 'Waiting'
                            ? 'badge-waiting'
                            : 'badge-proses'
                        }`}
                      >
                        {order.Status}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                      <strong>Nama:</strong> {order.NamaPelanggan}
                    </p>
                    <p style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                      <strong>Layanan:</strong> {order.Layanan}
                    </p>
                    <p style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                      <strong>Harga:</strong> {formatCurrency(order.Harga)}
                    </p>
                    {order.Tanggal && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-gray)' }}>
                        📅 {order.Tanggal}
                      </p>
                    )}
                    {order.Catatan && (
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-gray)',
                          marginTop: '0.4rem',
                          fontStyle: 'italic',
                        }}
                      >
                        CATATAN: {order.Catatan}
                      </p>
                    )}
                    {order.DiskonInfo && (
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--success)',
                          marginTop: '0.4rem',
                          fontWeight: 600,
                        }}
                      >
                        💰 Diskon: {order.DiskonInfo}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="footer">
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontSize: '1.3rem',
              fontWeight: 800,
              marginBottom: '0.5rem',
            }}
          >
            <span style={{ fontSize: '1.6rem' }}>👟</span> Danee Shoes &amp;
            Clean
          </div>
          <p
            style={{
              color: '#94a3b8',
              marginBottom: '0.75rem',
              fontSize: '0.95rem',
            }}
          >
            Tempat Nyuci Sepatu Kotormu – Purwakarta
          </p>

          <div className="footer-links">
            <a
              href="#layanan"
              onClick={(e) => {
                e.preventDefault();
                scrollTo('layanan');
              }}
            >
              Clean Treatment
            </a>
            <a
              href="#restorasi"
              onClick={(e) => {
                e.preventDefault();
                scrollTo('restorasi');
              }}
            >
              Repair Treatment
            </a>
            <a
              href="#store"
              onClick={(e) => {
                e.preventDefault();
                scrollTo('store');
              }}
            >
              Store Produk
            </a>
            <a
              href="#tracking"
              onClick={(e) => {
                e.preventDefault();
                scrollTo('tracking');
              }}
            >
              Order Tracking
            </a>
          </div>

          {/* Social media */}
          <div className="footer-links">
            {instagram && (
              <a
                href={instagram.IsiKonten}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#94a3b8',
                }}
              >
                📷 Instagram
              </a>
            )}
            {youtube && (
              <a
                href={youtube.IsiKonten}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#94a3b8',
                }}
              >
                ▶️ YouTube
              </a>
            )}
            <a
              href={WA_BASE}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#94a3b8',
              }}
            >
              💬 WhatsApp
            </a>
            <a
              href="https://maps.google.com/?q=Danee+Shoes+%26+Clean+Purwakarta"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#94a3b8',
              }}
            >
              📍 Google Maps
            </a>
          </div>

          <hr
            style={{
              border: 'none',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              margin: '1.25rem 0',
            }}
          />
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            &copy; {new Date().getFullYear()} Danee Shoes &amp; Clean. All
            rights reserved.
          </p>
        </div>
      </footer>

      {/* ===== DELIVERY MODAL ===== */}
      {modalOpen && modalService && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>📦 Metode Penyerahan</h3>
              <button
                className="modal-close"
                onClick={() => setModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p
                style={{
                  marginBottom: '1rem',
                  color: 'var(--text-gray)',
                  fontSize: '0.9rem',
                }}
              >
                Pilih metode penyerahan untuk layanan{' '}
                <strong style={{ color: 'var(--text-dark)' }}>
                  {modalService.NamaLayanan}
                </strong>{' '}
                — {formatCurrency(modalService.Harga)}
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    border: `2px solid ${
                      deliveryMethod === 'antar'
                        ? 'var(--primary)'
                        : '#e2e8f0'
                    }`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    marginBottom: '0.75rem',
                    background:
                      deliveryMethod === 'antar'
                        ? 'var(--navy-light)'
                        : 'var(--white)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="antar"
                    checked={deliveryMethod === 'antar'}
                    onChange={() => setDeliveryMethod('antar')}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <div>
                    <strong>Antar Sendiri (Drop-off)</strong>
                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-gray)',
                        margin: 0,
                      }}
                    >
                      Kamu antar sepatu ke tempat kami
                    </p>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px 16px',
                    border: `2px solid ${
                      deliveryMethod === 'jemput'
                        ? 'var(--primary)'
                        : '#e2e8f0'
                    }`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    background:
                      deliveryMethod === 'jemput'
                        ? 'var(--navy-light)'
                        : 'var(--white)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="deliveryMethod"
                    value="jemput"
                    checked={deliveryMethod === 'jemput'}
                    onChange={() => setDeliveryMethod('jemput')}
                    style={{ accentColor: 'var(--primary)', marginTop: '3px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <strong>Jemput (Pickup)</strong>
                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-gray)',
                        margin: '0 0 0.5rem 0',
                      }}
                    >
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
              <button
                className="btn btn-white"
                onClick={() => setModalOpen(false)}
              >
                Batal
              </button>
              <button className="btn btn-gold" onClick={confirmOrder}>
                ✅ Konfirmasi &amp; Order via WA
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
