import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) {
      setError('Masukkan email admin.');
      return;
    }
    if (!password.trim()) {
      setError('Masukkan password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        navigate('/admin');
      } else {
        setError(result.error || 'Email atau password salah.');
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin();
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {/* Logo & Title */}
        <div style={styles.logoArea}>
          <div style={styles.logoCircle}>
            <span style={styles.logoEmoji}>👟</span>
          </div>
          <h1 style={styles.title}>Danee Shoes</h1>
          <p style={styles.subtitle}>Dashboard Pengelola</p>
        </div>

        {/* Form */}
        <div style={styles.form}>
          {/* Email Input */}
          <label style={styles.label}>Email</label>
          <input
            type="email"
            placeholder="admin@danee.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
            autoFocus
            autoComplete="email"
            style={{
              ...styles.input,
              opacity: loading ? 0.6 : 1,
            }}
          />

          {/* Password Input */}
          <label style={{ ...styles.label, marginTop: 16 }}>Password</label>
          <input
            type="password"
            placeholder="Masukkan password..."
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
            autoComplete="current-password"
            style={{
              ...styles.input,
              opacity: loading ? 0.6 : 1,
            }}
          />

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              <span style={styles.errorIcon}>!</span>
              <span>{error}</span>
            </div>
          )}

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <span style={styles.buttonLoading}>
                <span style={styles.buttonSpinner} />
                Memproses...
              </span>
            ) : (
              'Masuk'
            )}
          </button>
        </div>

        {/* Footer */}
        <p style={styles.footer}>
          Danee Shoes &amp; Clean — v2.0
        </p>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100vw',
    margin: 0,
    padding: 0,
    background: 'linear-gradient(145deg, #f0f4ff 0%, #e8f0fe 100%)',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    boxShadow: '0 8px 40px rgba(3, 75, 185, 0.12)',
    padding: '40px 32px',
    width: 360,
    maxWidth: '88%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  logoArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 32,
  },

  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #034BB9 0%, #2563eb 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    boxShadow: '0 4px 16px rgba(3, 75, 185, 0.25)',
  },

  logoEmoji: {
    fontSize: 32,
    lineHeight: 1,
  },

  title: {
    margin: '0 0 4px 0',
    fontSize: 24,
    fontWeight: 700,
    color: '#1e293b',
    letterSpacing: '-0.3px',
  },

  subtitle: {
    margin: 0,
    fontSize: 14,
    color: '#64748b',
    fontWeight: 500,
  },

  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },

  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 4,
    display: 'block',
  },

  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 15,
    border: '1.5px solid #e2e8f0',
    borderRadius: 12,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    backgroundColor: '#fff',
    color: '#1e293b',
  },

  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 10,
    color: '#dc2626',
    fontSize: 13,
    fontWeight: 500,
  },

  errorIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: '#dc2626',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },

  button: {
    width: '100%',
    padding: '14px 16px',
    marginTop: 20,
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
    background: 'linear-gradient(135deg, #034BB9 0%, #2563eb 100%)',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.1s',
    boxShadow: '0 4px 12px rgba(3, 75, 185, 0.3)',
  },

  buttonLoading: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  buttonSpinner: {
    display: 'inline-block',
    width: 18,
    height: 18,
    border: '2.5px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },

  footer: {
    margin: '24px 0 0 0',
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
};

export default Login;
