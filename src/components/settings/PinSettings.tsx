import { useState } from 'react';
import { getSetting, saveSetting } from '../../lib/services/settings-service';

/* ================================================================== */
/*  PIN GATE — proteksi akses halaman Pengaturan                      */
/* ================================================================== */
export function SettingsPinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!pin.trim()) { setError('Masukkan PIN.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await getSetting('settings_pin');
      const correctPin = res.success ? res.data : null;

      // Kalau belum ada PIN, default 123456
      if (!correctPin || pin.trim() === correctPin) {
        onUnlock();
      } else {
        setError('PIN salah. Coba lagi.');
      }
    } catch {
      // Fallback: jika gagal fetch, pakai default
      if (pin.trim() === '123456') {
        onUnlock();
      } else {
        setError('PIN salah. Coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleSubmit();
  };

  return (
    <div className="admin-main">
      <div className="admin-topbar"><h1>Pengaturan</h1></div>
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: '40px 16px',
      }}>
        <div style={{
          background: '#fff', borderRadius: 16, padding: '32px 24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: '100%', maxWidth: 360,
          textAlign: 'center',
        }}>
          <span className="mat-icon" style={{ fontSize: 32, marginBottom: 12 }}>lock</span>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
            Pengaturan Terkunci
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#64748b' }}>
            Masukkan PIN untuk mengakses halaman pengaturan.
          </p>
          <input
            type="password"
            placeholder="Masukkan PIN..."
            value={pin}
            onChange={(e) => { setPin(e.target.value); if (error) setError(''); }}
            onKeyDown={handleKeyDown}
            disabled={loading}
            autoFocus
            style={{
              width: '100%', padding: '14px 16px', fontSize: 16, textAlign: 'center',
              letterSpacing: 8, borderRadius: 12, border: '1.5px solid #e2e8f0',
              outline: 'none', boxSizing: 'border-box', marginBottom: 12,
            }}
          />
          {error && (
            <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: 12, fontWeight: 500 }}>
              {error}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '14px', fontSize: 15, fontWeight: 700,
              background: 'linear-gradient(135deg, #034BB9, #2563eb)',
              color: '#fff', border: 'none', borderRadius: 12,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Memeriksa...' : 'Buka Pengaturan'}
          </button>
          <p style={{ marginTop: 16, fontSize: '0.75rem', color: '#94a3b8' }}>
            PIN default: 123456
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  PIN SETTINGS — ubah PIN                                            */
/* ================================================================== */
export function SettingsPinSection() {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleChangePin = async () => {
    if (!currentPin.trim()) { setError('Masukkan PIN saat ini.'); return; }
    if (!newPin.trim() || newPin.length < 4) { setError('PIN baru minimal 4 karakter.'); return; }
    if (newPin !== confirmPin) { setError('PIN baru dan konfirmasi tidak cocok.'); return; }

    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await getSetting('settings_pin');
      const correctPin = res.success ? res.data : '123456';
      if (currentPin.trim() !== correctPin) {
        setError('PIN saat ini salah.');
        setSaving(false);
        return;
      }

      const saveRes = await saveSetting('settings_pin', newPin.trim());
      if (saveRes.success) {
        setSuccess('PIN berhasil diubah!');
        setShowForm(false);
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(saveRes.error || 'Gagal menyimpan PIN.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 'var(--space-sm)' }}><span className="mat-icon" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>lock</span> PIN Pengaturan</h3>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-gray)', marginBottom: 'var(--space-md)' }}>
        Lindungi halaman pengaturan dengan PIN. User harus memasukkan PIN untuk bisa mengakses & mengubah pengaturan.
      </p>

      {error && <div className="alert alert-danger" style={{ padding: '8px 12px', marginBottom: 'var(--space-sm)', color: '#dc2626', fontWeight: 500 }} onClick={() => setError(null)}>{error}</div>}
      {success && <div className="alert alert-success" style={{ padding: '8px 12px', marginBottom: 'var(--space-sm)', color: '#059669', fontWeight: 500, background: '#ecfdf5', borderRadius: 6 }}>{success}</div>}

      {!showForm ? (
        <button className="btn btn-secondary" onClick={() => setShowForm(true)} style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
          Ubah PIN
        </button>
      ) : (
        <div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label style={{ fontSize: '0.8rem' }}>PIN Saat Ini</label>
            <input type="password" className="form-control" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} placeholder="PIN saat ini" style={{ maxWidth: 200 }} />
          </div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label style={{ fontSize: '0.8rem' }}>PIN Baru</label>
            <input type="password" className="form-control" value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="PIN baru" style={{ maxWidth: 200 }} />
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.8rem' }}>Konfirmasi PIN Baru</label>
            <input type="password" className="form-control" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} placeholder="Konfirmasi PIN baru" style={{ maxWidth: 200 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleChangePin} disabled={saving} style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
              {saving ? 'Menyimpan...' : 'Simpan PIN'}
            </button>
            <button onClick={() => { setShowForm(false); setError(null); setSuccess(null); }} style={{ padding: '8px 20px', fontSize: '0.85rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', color: '#475569' }}>
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
