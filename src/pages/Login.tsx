import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../lib/api';

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await login(password);
      navigate('/admin');
    } catch {
      setError('Password salah. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        margin: 0,
        padding: 0,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          padding: '48px 40px',
          width: 360,
          maxWidth: '90%',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <div style={{ fontSize: 64, marginBottom: 8 }}>👟</div>

        {/* Title */}
        <h1
          style={{
            margin: '0 0 4px 0',
            fontSize: 22,
            fontWeight: 700,
            color: '#1a1a1a',
          }}
        >
          Danee Shoes
        </h1>
        <p
          style={{
            margin: '0 0 32px 0',
            fontSize: 14,
            color: '#888',
            fontWeight: 500,
          }}
        >
          Dashboard Pengelola
        </p>

        {/* Password input */}
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
          autoFocus
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: 15,
            border: '1px solid #ddd',
            borderRadius: 8,
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: 16,
            transition: 'border-color 0.2s',
            backgroundColor: loading ? '#f5f5f5' : '#fff',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#d4a017')}
          onBlur={(e) => (e.target.style.borderColor = '#ddd')}
        />

        {/* Error message */}
        {error && (
          <p
            style={{
              color: '#e53935',
              fontSize: 13,
              margin: '0 0 16px 0',
              fontWeight: 500,
            }}
          >
            {error}
          </p>
        )}

        {/* Submit button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            backgroundColor: loading ? '#c8962e' : '#d4a017',
            border: 'none',
            borderRadius: 8,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'background-color 0.2s, opacity 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = '#b8890e';
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = '#d4a017';
          }}
        >
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </div>
    </div>
  );
};

export default Login;
