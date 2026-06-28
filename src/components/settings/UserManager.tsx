import { useState, useEffect, useCallback } from 'react';
import * as adminUserService from '../../lib/services/admin-user-service';
import { useAuth } from '../../lib/auth';
import type { AdminUserRow } from '../../lib/types-supabase';

function UserManager() {
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

export default UserManager;
