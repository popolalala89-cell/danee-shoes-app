import { useState } from 'react';
import { saveSetting } from '../../lib/services/settings-service';
import { uploadImage } from '../../lib/services/upload-service';

interface BrandingSettingsProps {
  initialQris: string;
  initialLogo: string;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
}

function BrandingSettings({ initialQris, initialLogo, onSuccess, onError, saving, setSaving }: BrandingSettingsProps) {
  const [qrisImage, setQrisImage] = useState(initialQris);
  const [logoImage, setLogoImage] = useState(initialLogo);

  const handleUploadQris = async () => {
    if (!qrisImage) {
      const res = await saveSetting('qris_image', '');
      if (res.success) { onSuccess('Gambar QRIS dihapus!'); }
      else { onError(res.error || 'Gagal menghapus QRIS.'); }
      return;
    }
    setSaving(true);
    const uploadRes = await uploadImage(qrisImage, 'qris.png');
    if (!uploadRes.success) { onError(uploadRes.error || 'Gagal upload'); setSaving(false); return; }
    const res = await saveSetting('qris_image', uploadRes.data!.url);
    if (res.success) {
      onSuccess('Gambar QRIS berhasil disimpan!');
    } else {
      onError(res.error || 'Gagal menyimpan QRIS.');
    }
    setSaving(false);
  };

  const handleUploadLogo = async () => {
    if (!logoImage) {
      const res = await saveSetting('logo_image', '');
      if (res.success) { onSuccess('Logo dihapus!'); }
      else { onError(res.error || 'Gagal menghapus logo.'); }
      return;
    }
    setSaving(true);
    const uploadRes = await uploadImage(logoImage, 'logo.png');
    if (!uploadRes.success) { onError(uploadRes.error || 'Gagal upload'); setSaving(false); return; }
    const res = await saveSetting('logo_image', uploadRes.data!.url);
    if (res.success) {
      onSuccess('Logo berhasil disimpan!');
    } else {
      onError(res.error || 'Gagal menyimpan logo.');
    }
    setSaving(false);
  };

  return (
    <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 'var(--space-md)' }}>
        <span className="mat-icon" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>image</span> Gambar Branding
      </h3>

      {/* QRIS Image */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>Gambar QRIS</label>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-gray)', marginBottom: 8 }}>
          Upload gambar QRIS untuk pembayaran di website pelanggan.
        </p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              const dataUrl = ev.target?.result as string;
              setQrisImage(dataUrl);
            };
            reader.readAsDataURL(file);
          }}
          style={{ fontSize: '0.85rem', marginBottom: 8 }}
        />
        {qrisImage && (
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
            <img src={qrisImage} alt="QRIS" style={{ maxWidth: 160, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <button
              onClick={() => setQrisImage('')}
              style={{
                position: 'absolute', top: -8, right: -8, width: 24, height: 24,
                borderRadius: '50%', background: '#ef4444', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="Hapus QRIS"
            >✕</button>
          </div>
        )}
        <div>
          <button className="btn btn-primary" onClick={handleUploadQris} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan QRIS'}
          </button>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />

      {/* Logo */}
      <div>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>Logo Toko</label>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-gray)', marginBottom: 8 }}>
          Upload logo brand untuk tampil di website pelanggan (akan datang).
        </p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              const dataUrl = ev.target?.result as string;
              setLogoImage(dataUrl);
            };
            reader.readAsDataURL(file);
          }}
          style={{ fontSize: '0.85rem', marginBottom: 8 }}
        />
        {logoImage && (
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
            <img src={logoImage} alt="Logo" style={{ maxWidth: 120, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <button
              onClick={() => setLogoImage('')}
              style={{
                position: 'absolute', top: -8, right: -8, width: 24, height: 24,
                borderRadius: '50%', background: '#ef4444', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              title="Hapus Logo"
            >✕</button>
          </div>
        )}
        <div>
          <button className="btn btn-primary" onClick={handleUploadLogo} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Logo'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BrandingSettings;
