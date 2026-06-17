import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const EntryScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // If already logged in, go straight to home (admin features visible)
  useEffect(() => {
    if (!loading && user) {
      navigate('/home', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleGuest = () => {
    navigate('/home');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div className="loading-spinner" />
      </div>
    );
  }

  // If already logged in, don't render (redirect will happen)
  if (user) return null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* Logo & Brand */}
        <div style={styles.logoArea}>
          <div style={styles.logoCircle}>
            <span style={styles.logoEmoji}>👟</span>
          </div>
          <h1 style={styles.brand}>Danee Shoes Care</h1>
          <p style={styles.tagline}>
            Cuci Sepatu & Reparasi Profesional<br />
            — Purwakarta —
          </p>
        </div>

        {/* Two choices */}
        <div style={styles.choices}>
          <button style={styles.btnGuest} onClick={handleGuest}>
            <span style={styles.btnIcon}>👤</span>
            <span style={styles.btnLabel}>Langsung Masuk</span>
            <span style={styles.btnDesc}>Lihat layanan, produk & tracking</span>
          </button>

          <button style={styles.btnLogin} onClick={handleLogin}>
            <span style={styles.btnIcon}>🔐</span>
            <span style={styles.btnLabel}>Login Admin</span>
            <span style={styles.btnDesc}>Kelola pesanan, pengaturan & laporan</span>
          </button>
        </div>

        {/* Version */}
        <p style={styles.version}>Danee Shoes Care — v2.0</p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100dvh',
    width: '100vw',
    margin: 0,
    padding: 0,
    background: 'linear-gradient(145deg, #f0f4ff 0%, #e8f0fe 100%)',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 24px',
    maxWidth: 360,
    width: '88%',
  },
  logoArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #034BB9 0%, #2563eb 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    boxShadow: '0 6px 24px rgba(3, 75, 185, 0.25)',
  },
  logoEmoji: {
    fontSize: 36,
    lineHeight: 1,
  },
  brand: {
    margin: '0 0 6px 0',
    fontSize: 26,
    fontWeight: 800,
    color: '#1e293b',
    letterSpacing: '-0.5px',
    textAlign: 'center',
  },
  tagline: {
    margin: 0,
    fontSize: 13,
    color: '#64748b',
    fontWeight: 500,
    textAlign: 'center',
    lineHeight: 1.5,
  },
  choices: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    width: '100%',
  },
  btnGuest: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    width: '100%',
    padding: '20px 16px',
    background: '#fff',
    border: '2px solid #e2e8f0',
    borderRadius: 16,
    cursor: 'pointer',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  btnLogin: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    width: '100%',
    padding: '20px 16px',
    background: 'linear-gradient(135deg, #034BB9 0%, #2563eb 100%)',
    border: 'none',
    borderRadius: 16,
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.1s',
    fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(3, 75, 185, 0.25)',
  },
  btnIcon: {
    fontSize: 28,
    lineHeight: 1,
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1e293b',
  },
  btnDesc: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 500,
  },
  version: {
    marginTop: 32,
    fontSize: 11,
    color: '#cbd5e1',
    textAlign: 'center',
  },
};

export default EntryScreen;
