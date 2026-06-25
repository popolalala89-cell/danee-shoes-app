import { useState, useEffect, useCallback } from 'react';
import { getThemeSettings, saveThemeSettings, getWaNumber, saveSetting, getSetting } from '../lib/services/settings-service';
import { getAllSettingsProfit, saveSettingsProfitRole } from '../lib/services/profit-service';
import { uploadImage } from '../lib/services/upload-service';
import * as adminUserService from '../lib/services/admin-user-service';
import { useAuth } from '../lib/auth';
import type { AdminUserRow } from '../lib/types-supabase';
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
  { peran: 'owner',       label: 'Owner',               icon: 'badge' },
  { peran: 'kas',         label: 'Kas (Operasional)',   icon: 'account_balance' },
  { peran: 'spesialis',   label: 'Spesialis',          icon: 'handyman' },
  { peran: 'admin',       label: 'Admin (Marketing)',   icon: 'support_agent' },
  { peran: 'web',         label: 'Engineer Web',        icon: 'code' },
  { peran: 'zakat',       label: 'Zakat (2.5%)',        icon: 'volunteer_activism' },
  { peran: 'investor',    label: 'Investor',            icon: 'trending_up' },
];

/* ================================================================== */
/*  PIN MODAL — proteksi akses halaman Pengaturan                     */
/* ================================================================== */
function SettingsPinGate({ onUnlock }: { onUnlock: () => void }) {
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
/*  MANAJEMEN USER COMPONENT                                           */
/* ================================================================== */
function UserManagementSection() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add user form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPermissions, setNewPermissions] = useState<string[]>([]);

  // Edit permissions
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminUserService.getAdminUsers();
      if (res.success && res.data) {
        setUsers(res.data);
      } else {
        setError(res.error || 'Gagal memuat data user.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const togglePermission = (perm: string) => {
    setNewPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const toggleEditPermission = (perm: string) => {
    setEditPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleAddUser = async () => {
    if (!newEmail.trim() || !newName.trim()) {
      setError('Email dan nama harus diisi.');
      return;
    }
    if (newPermissions.length === 0) {
      setError('Pilih minimal 1 menu untuk user.');
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const res = await adminUserService.createAdminUser(newEmail.trim(), newName.trim(), newPermissions);
      if (res.success) {
        setSuccess(`User ${newName.trim()} berhasil ditambahkan!`);
        setShowAddForm(false);
        setNewEmail('');
        setNewName('');
        setNewPermissions([]);
        fetchUsers();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.error || 'Gagal menambah user.');
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSavePermissions = async (userId: string) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await adminUserService.updateUserPermissions(userId, editPermissions);
      if (res.success) {
        setSuccess('Hak akses berhasil diperbarui!');
        setEditingUserId(null);
        fetchUsers();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.error || 'Gagal menyimpan hak akses.');
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      await adminUserService.toggleUserActive(userId, !currentActive);
      fetchUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (userId: string, displayName: string) => {
    if (!window.confirm(`Hapus user "${displayName}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      const res = await adminUserService.deleteAdminUser(userId);
      if (res.success) {
        setSuccess(`User ${displayName} berhasil dihapus.`);
        fetchUsers();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.error || 'Gagal menghapus user.');
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const allPermissions = adminUserService.MENU_PERMISSIONS;
  const currentUserEmail = user?.email || '';

  return (
    <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 'var(--space-md)' }}><span className="mat-icon" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>group</span> Manajemen User</h3>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-gray)', marginBottom: 'var(--space-md)' }}>
        Atur siapa saja yang bisa mengakses menu admin. Setiap user bisa memiliki hak akses ke menu tertentu.
      </p>

      {error && <div className="alert alert-danger" style={{ padding: '8px 12px', marginBottom: 'var(--space-sm)', color: '#dc2626', fontWeight: 500 }} onClick={() => setError(null)}>{error}</div>}
      {success && <div className="alert alert-success" style={{ padding: '8px 12px', marginBottom: 'var(--space-sm)', color: '#059669', fontWeight: 500, background: '#ecfdf5', borderRadius: 6 }}>{success}</div>}

      {loading ? (
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Memuat data user...</p>
      ) : (
        <>
          {/* Daftar User */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 'var(--space-md)' }}>
            {users.length === 0 && (
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', textAlign: 'center', padding: 16 }}>
                Belum ada user. Tambahkan user baru.
              </p>
            )}
            {users.map((u) => (
              <div key={u.id} style={{
                background: '#f8fafc', borderRadius: 12, padding: '12px 16px',
                border: '1px solid #e2e8f0', opacity: u.is_active ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                      {u.display_name}
                      {u.email === currentUserEmail && (
                        <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#2563eb', padding: '2px 8px', borderRadius: 10, marginLeft: 8, fontWeight: 500 }}>Anda</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      style={{
                        background: 'none', border: '1px solid #e2e8f0', borderRadius: 8,
                        padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500,
                        color: u.is_active ? '#059669' : '#94a3b8',
                      }}
                    >
                      {u.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                    {u.email !== currentUserEmail && (
                      <button
                        onClick={() => handleDelete(u.id, u.display_name)}
                        style={{
                          background: 'none', border: '1px solid #fecaca', borderRadius: 8,
                          padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer',
                          color: '#dc2626', fontWeight: 500,
                        }}
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                {/* Edit permissions */}
                {editingUserId === u.id ? (
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {allPermissions.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => toggleEditPermission(p.id)}
                          style={{
                            padding: '4px 10px', fontSize: '0.75rem', borderRadius: 8,
                            border: editPermissions.includes(p.id) ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                            background: editPermissions.includes(p.id) ? '#dbeafe' : '#fff',
                            color: editPermissions.includes(p.id) ? '#1d4ed8' : '#64748b',
                            fontWeight: 500, cursor: 'pointer',
                          }}
                        >
                          <span className="mat-icon" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 2 }}>{p.icon}</span> {p.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                        onClick={() => handleSavePermissions(u.id)}
                      >
                        Simpan
                      </button>
                      <button
                        style={{ padding: '6px 16px', fontSize: '0.8rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', color: '#475569' }}
                        onClick={() => setEditingUserId(null)}
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {Array.isArray(u.permissions) && u.permissions.map((permId) => {
                      const m = allPermissions.find((p) => p.id === permId);
                      return m ? (
                        <span key={permId} style={{
                          fontSize: '0.7rem', background: '#e2e8f0', color: '#475569',
                          padding: '2px 8px', borderRadius: 10, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                          <span className="mat-icon" style={{ fontSize: 14 }}>{m.icon}</span> {m.label}
                        </span>
                      ) : null;
                    })}
                    <button
                      onClick={() => {
                        setEditingUserId(u.id);
                        setEditPermissions(Array.isArray(u.permissions) ? [...u.permissions] : []);
                      }}
                      style={{
                        background: 'none', border: 'none', color: '#2563eb',
                        fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500, marginLeft: 4,
                      }}
                    >
                      Ubah
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tombol Tambah User */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '10px', fontSize: '0.875rem' }}
            >
              + Tambah User Baru
            </button>
          ) : (
            <div style={{ background: '#f1f5f9', borderRadius: 12, padding: 'var(--space-md)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Tambah User Baru</h4>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.8rem' }}>Email</label>
                <input type="email" className="form-control" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@contoh.com" />
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.8rem' }}>Nama Tampilan</label>
                <input type="text" className="form-control" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama User" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: 6 }}>Hak Akses Menu</label>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8 }}>
                  Pilih menu mana saja yang bisa diakses user ini.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allPermissions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => togglePermission(p.id)}
                      style={{
                        padding: '6px 12px', fontSize: '0.8rem', borderRadius: 8,
                        border: newPermissions.includes(p.id) ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                        background: newPermissions.includes(p.id) ? '#dbeafe' : '#fff',
                        color: newPermissions.includes(p.id) ? '#1d4ed8' : '#64748b',
                        fontWeight: 500, cursor: 'pointer',
                      }}
                    >
                      <span className="mat-icon" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 2 }}>{p.icon}</span> {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={handleAddUser} style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                  Simpan User
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setNewEmail(''); setNewName(''); setNewPermissions([]); }}
                  style={{ padding: '8px 20px', fontSize: '0.85rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', color: '#475569' }}
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/*  SETTINGS PIN SETTINGS                                              */
/* ================================================================== */
function SettingsPinSection() {
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

    // Verify current PIN
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

/* ================================================================== */
/*  MAIN SETTINGS PAGE                                                 */
/* ================================================================== */
const Settings: React.FC = () => {
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { hasPermission } = useAuth();

  // Theme colors
  const [primaryColor, setPrimaryColor] = useState('#034BB9');
  const [hoverColor, setHoverColor] = useState('#023C94');

  // WhatsApp number
  const [waNumber, setWaNumber] = useState('6285111619226');

  // Branding images
  const [qrisImage, setQrisImage] = useState('');
  const [logoImage, setLogoImage] = useState('');

  // Profit sharing percentages
  const [profitRoles, setProfitRoles] = useState<Record<string, { persen: number; baseGaji: number }>>({});
  const [targetOmset, setTargetOmset] = useState(0);

  const isSuperAdmin = hasPermission('settings');

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [themeRes, waRes, profitRes, qrisRes, logoRes] = await Promise.all([
        getThemeSettings(),
        getWaNumber(),
        getAllSettingsProfit(),
        getSetting('qris_image'),
        getSetting('logo_image'),
      ]);
      if (themeRes.success && themeRes.data) {
        setPrimaryColor(themeRes.data.primary);
        setHoverColor(themeRes.data.hover);
      }
      if (waRes.success && waRes.data) {
        setWaNumber(waRes.data);
      }
      if (qrisRes.success && qrisRes.data) {
        setQrisImage(qrisRes.data);
      }
      if (logoRes.success && logoRes.data) {
        setLogoImage(logoRes.data);
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

  useEffect(() => {
    if (unlocked) fetchSettings();
  }, [unlocked]);

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
      for (const p of PERAN_LIST) {
        const roleData = profitRoles[p.peran] || { persen: 0, baseGaji: 0 };
        const res = await saveSettingsProfitRole(p.peran, p.label, roleData.persen, targetOmset, roleData.baseGaji);
        if (!res.success) {
          setError(res.error || `Gagal menyimpan ${p.label}`);
          setSaving(false);
          return;
        }
      }
      setSuccess('Profit sharing berhasil disimpan!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan persentase profit.');
    } finally {
      setSaving(false);
    }
  };

  const updatePct = (peran: string, val: string) => {
    const num = parseFormNumber(val) || 0;
    setProfitRoles((prev) => ({
      ...prev,
      [peran]: { ...(prev[peran] || { persen: 0, baseGaji: 0 }), persen: num },
    }));
  };

  const updateBaseGaji = (peran: string, val: string) => {
    const num = parseInt(val.replace(/\D/g, '')) || 0;
    setProfitRoles((prev) => ({
      ...prev,
      [peran]: { ...(prev[peran] || { persen: 0, baseGaji: 0 }), baseGaji: num },
    }));
  };

  // If not unlocked yet, show PIN gate
  if (!unlocked) {
    return <SettingsPinGate onUnlock={() => setUnlocked(true)} />;
  }

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

      {/* PIN Settings — first, before other settings */}
      <SettingsPinSection />

      {/* User Management — hanya untuk super admin (yang punya akses settings) */}
      {isSuperAdmin && <UserManagementSection />}

      {/* Theme Settings */}
      <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 'var(--space-md)' }}><span className="mat-icon" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>palette</span> Tema Warna</h3>

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
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 'var(--space-md)' }}><span className="mat-icon" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>phone_in_talk</span> Nomor WhatsApp</h3>
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

      {/* Branding Images - QRIS & Logo */}
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
            <button
              className="btn btn-primary"
              onClick={async () => {
                if (!qrisImage) {
                  const res = await saveSetting('qris_image', '');
                  if (res.success) { setSuccess('Gambar QRIS dihapus!'); setTimeout(() => setSuccess(null), 3000); }
                  else { setError(res.error || 'Gagal menghapus QRIS.'); }
                  return;
                }
                const uploadRes = await uploadImage(qrisImage, 'qris.png');
                if (!uploadRes.success) { setError(uploadRes.error || 'Gagal upload'); return; }
                const res = await saveSetting('qris_image', uploadRes.data!.url);
                if (res.success) {
                  setSuccess('Gambar QRIS berhasil disimpan!');
                  setTimeout(() => setSuccess(null), 3000);
                } else {
                  setError(res.error || 'Gagal menyimpan QRIS.');
                }
              }}
              disabled={saving}
            >
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
            <button
              className="btn btn-primary"
              onClick={async () => {
                if (!logoImage) {
                  const res = await saveSetting('logo_image', '');
                  if (res.success) { setSuccess('Logo dihapus!'); setTimeout(() => setSuccess(null), 3000); }
                  else { setError(res.error || 'Gagal menghapus logo.'); }
                  return;
                }
                const uploadRes = await uploadImage(logoImage, 'logo.png');
                if (!uploadRes.success) { setError(uploadRes.error || 'Gagal upload'); return; }
                const res = await saveSetting('logo_image', uploadRes.data!.url);
                if (res.success) {
                  setSuccess('Logo berhasil disimpan!');
                  setTimeout(() => setSuccess(null), 3000);
                } else {
                  setError(res.error || 'Gagal menyimpan logo.');
                }
              }}
              disabled={saving}
            >
              {saving ? 'Menyimpan...' : 'Simpan Logo'}
            </button>
          </div>
        </div>
      </div>

      {/* Profit Sharing Settings */}
      <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 'var(--space-sm)' }}><span className="mat-icon" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>handshake</span> Pembagian Profit</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-gray)', marginBottom: 'var(--space-md)' }}>
          Atur target omset dan persentase pembagian profit per peran (nilai dalam desimal, misal 0.15 = 15%).
        </p>

        {/* Target Omset */}
        <div className="form-group" style={{ maxWidth: 300, marginBottom: 'var(--space-md)' }}>
          <label>Target Omset Bulanan</label>
          <input type="number" className="form-control" value={targetOmset} onChange={(e) => setTargetOmset(parseInt(e.target.value) || 0)} min={0} step={10000} />
        </div>

        {/* Per-role percentages */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
          {PERAN_LIST.map((p) => {
            const roleData = profitRoles[p.peran] || { persen: 0, baseGaji: 0 };
            return (
              <div key={p.peran} style={{ background: '#f8fafc', borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><span className="mat-icon" style={{ fontSize: 18 }}>{p.icon}</span> {p.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-gray)', fontWeight: 600 }}>Persen (%)</label>
                    <input type="number" className="form-control" value={roleData.persen} onChange={(e) => updatePct(p.peran, e.target.value)} min={0} max={100} step={0.5} style={{ padding: '6px 8px', fontSize: '0.875rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-gray)', fontWeight: 600 }}>Gaji Pokok (Rp)</label>
                    <input type="number" className="form-control" value={roleData.baseGaji} onChange={(e) => updateBaseGaji(p.peran, e.target.value)} min={0} step={1000} style={{ padding: '6px 8px', fontSize: '0.875rem' }} />
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
