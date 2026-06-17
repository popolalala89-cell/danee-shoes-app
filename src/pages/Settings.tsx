import { useState, useEffect } from 'react';
import { getThemeSettings, saveThemeSettings, getWaNumber, saveSetting } from '../lib/services/settings-service';
import { getAllSettingsProfit, saveSettingsProfitRole } from '../lib/services/profit-service';
import { formatCurrency, parseFormNumber } from '../lib/utils';

const PRESET_COLORS = [
  { primary: '#034BB9', hover: '#023C94', label: 'Biru (Default)' },
  { primary: '#7c3aed', hover: '#6d28d9', label: 'Ungu' },
  { primary: '#059669', hover: '#047857', label: 'Hijau' },
  { primary: '#dc2626', hover: '#b91c1c', label: 'Merah' },
  { primary: '#d97706', hover: '#b45309', label: 'Oranye' },
  { primary: '#0891b2', hover: '#0e7490', label: 'Cyan' },
  { primary: '#4f46e5', hover: '#4338ca', label: 'Indigo' },
  { primary: '#be123c', hover: '#9f1239', label: 'Merah Muda' },
];

const PERAN_LIST = [
  { peran: 'owner',       label: 'Owner',               icon: '👔' },
  { peran: 'kas',         label: 'Kas (Operasional)',   icon: '🏢' },
  { peran: 'cuci',        label: 'Spesialis Cuci',      icon: '🧼' },
  { peran: 'repair',      label: 'Spesialis Repair',    icon: '🔧' },
  { peran: 'admin',       label: 'Admin (Marketing)',   icon: '🎧' },
  { peran: 'web',         label: 'Engineer Web',        icon: '💻' },
  { peran: 'zakat',       label: 'Zakat (2.5%)',        icon: '🤲' },
  { peran: 'investor',    label: 'Investor',            icon: '📈' },
];

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Theme colors
  const [primaryColor, setPrimaryColor] = useState('#034BB9');
  const [hoverColor, setHoverColor] = useState('#023C94');

  // WhatsApp number
  const [waNumber, setWaNumber] = useState('6285111619226');

  // Profit sharing percentages
  const [profitRoles, setProfitRoles] = useState<Record<string, { cleanPct: number; repairPct: number }>>({});
  const [targetOmset, setTargetOmset] = useState(0);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [themeRes, waRes, profitRes] = await Promise.all([
        getThemeSettings(),
        getWaNumber(),
        getAllSettingsProfit(),
      ]);
      if (themeRes.success && themeRes.data) {
        setPrimaryColor(themeRes.data.primary);
        setHoverColor(themeRes.data.hover);
      }
      if (waRes.success && waRes.data) {
        setWaNumber(waRes.data);
      }
      if (profitRes.success && profitRes.data) {
        setProfitRoles(profitRes.data.roles);
        setTargetOmset(profitRes.data.targetOmset);
      }
    } catch (e: any) {
      setError(e.message || 'Gagal memuat pengaturan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const applyTheme = (p: string, h: string) => {
    setPrimaryColor(p);
    setHoverColor(h);
    document.documentElement.style.setProperty('--primary', p);
    document.documentElement.style.setProperty('--primary-hover', h);
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await saveThemeSettings(primaryColor, hoverColor);
      if (res.success) {
        applyTheme(primaryColor, hoverColor);
        setSuccess('Tema berhasil disimpan!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.error || 'Gagal menyimpan tema.');
      }
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan tema.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWa = async () => {
    if (!waNumber.trim()) { setError('Nomor WA tidak boleh kosong.'); return; }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await saveSetting('wa_number', waNumber.trim());
      if (res.success) {
        setSuccess('Nomor WA berhasil disimpan!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.error || 'Gagal menyimpan nomor WA.');
      }
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan nomor WA.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfit = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Save each role's percentages
      for (const p of PERAN_LIST) {
        const roleData = profitRoles[p.peran] || { cleanPct: 0, repairPct: 0 };
        const res = await saveSettingsProfitRole(p.peran, p.label, roleData.cleanPct, roleData.repairPct, targetOmset);
        if (!res.success) {
          setError(res.error || `Gagal menyimpan ${p.label}`);
          setSaving(false);
          return;
        }
      }
      setSuccess('Persentase profit sharing berhasil disimpan!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan persentase profit.');
    } finally {
      setSaving(false);
    }
  };

  const updatePct = (peran: string, field: 'cleanPct' | 'repairPct', val: string) => {
    const num = parseFormNumber(val) || 0;
    setProfitRoles((prev) => ({
      ...prev,
      [peran]: { ...(prev[peran] || { cleanPct: 0, repairPct: 0 }), [field]: num },
    }));
  };

  if (loading) {
    return (
      <div className="admin-main">
        <div className="admin-topbar"><h1>Pengaturan</h1></div>
        <div className="loading-overlay"><div className="loading-spinner" /><p>Memuat pengaturan...</p></div>
      </div>
    );
  }

  return (
    <div className="admin-main">
      <div className="admin-topbar"><h1>Pengaturan</h1></div>

      {error && <div className="alert alert-danger" style={{ padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)', color: 'var(--danger)', fontWeight: 500, cursor: 'pointer' }} onClick={() => setError(null)}>{error}</div>}
      {success && <div className="alert alert-success" style={{ padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)', color: '#059669', fontWeight: 500, background: '#ecfdf5', borderRadius: 'var(--radius-sm)' }}>{success}</div>}

      {/* Theme Settings */}
      <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 'var(--space-md)' }}>Tema Warna</h3>

        <div style={{ marginBottom: 'var(--space-md)' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 4, fontSize: '0.875rem' }}>Warna Preset</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c.primary}
                type="button"
                onClick={() => applyTheme(c.primary, c.hover)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: primaryColor === c.primary ? '3px solid var(--text-dark)' : '2px solid transparent',
                  background: c.primary, cursor: 'pointer', transition: 'var(--transition-fast)',
                }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
          <div className="form-group">
            <label>Warna Utama (Primary)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" className="form-control" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ width: 48, height: 48, padding: 2 }} />
              <input type="text" className="form-control" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ flex: 1, fontFamily: 'monospace' }} />
            </div>
          </div>
          <div className="form-group">
            <label>Warna Hover</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" className="form-control" value={hoverColor} onChange={(e) => setHoverColor(e.target.value)} style={{ width: 48, height: 48, padding: 2 }} />
              <input type="text" className="form-control" value={hoverColor} onChange={(e) => setHoverColor(e.target.value)} style={{ flex: 1, fontFamily: 'monospace' }} />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div style={{ padding: 'var(--space-md)', background: '#f8fafc', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-gray)', marginBottom: 8 }}>Pratinjau:</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={{ background: primaryColor, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 500 }}>Tombol Primary</button>
            <span style={{ background: `${primaryColor}15`, color: primaryColor, padding: '4px 12px', borderRadius: 20, fontSize: '0.8125rem', fontWeight: 600 }}>Badge</span>
            <span style={{ color: primaryColor, fontWeight: 600, fontSize: '0.9375rem' }}>Teks Warna</span>
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleSaveTheme} disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Tema'}
        </button>
      </div>

      {/* WhatsApp Number */}
      <div className="card" style={{ padding: 'var(--space-md)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 'var(--space-md)' }}>Nomor WhatsApp</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-gray)', marginBottom: 'var(--space-sm)' }}>
          Nomor ini digunakan untuk tombol "Hubungi WA" di website pelanggan.
        </p>
        <div className="form-group">
          <label>Nomor WA (dengan kode negara, tanpa +)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" className="form-control" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} placeholder="6285111619226" style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={handleSaveWa} disabled={saving || !waNumber.trim()}>
              {saving ? '...' : 'Simpan'}
            </button>
          </div>
          <small style={{ color: 'var(--gray)', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
            Contoh: 6285111619226 (jangan gunakan + atau spasi)
          </small>
        </div>
      </div>

      {/* Profit Sharing Settings */}
      <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 'var(--space-sm)' }}>🤝 Pembagian Profit</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-gray)', marginBottom: 'var(--space-md)' }}>
          Atur target omset dan persentase pembagian profit per peran. Clean = jasa cuci, Repair = jasa perbaikan.
        </p>

        {/* Target Omset */}
        <div className="form-group" style={{ maxWidth: 300, marginBottom: 'var(--space-md)' }}>
          <label>Target Omset Bulanan</label>
          <input type="number" className="form-control" value={targetOmset} onChange={(e) => setTargetOmset(parseInt(e.target.value) || 0)} min={0} step={10000} />
        </div>

        {/* Per-role percentages */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
          {PERAN_LIST.map((p) => {
            const roleData = profitRoles[p.peran] || { cleanPct: 0, repairPct: 0 };
            return (
              <div key={p.peran} style={{ background: '#f8fafc', borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 6 }}>{p.icon} {p.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-gray)', fontWeight: 600 }}>Clean (%)</label>
                    <input type="number" className="form-control" value={roleData.cleanPct} onChange={(e) => updatePct(p.peran, 'cleanPct', e.target.value)} min={0} max={100} step={0.5} style={{ padding: '6px 8px', fontSize: '0.875rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-gray)', fontWeight: 600 }}>Repair (%)</label>
                    <input type="number" className="form-control" value={roleData.repairPct} onChange={(e) => updatePct(p.peran, 'repairPct', e.target.value)} min={0} max={100} step={0.5} style={{ padding: '6px 8px', fontSize: '0.875rem' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button className="btn btn-primary" onClick={handleSaveProfit} disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Persentase Profit'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
