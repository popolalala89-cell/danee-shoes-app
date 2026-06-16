import React, { useState, useEffect } from 'react';
import { getKontenWeb, saveKontenWeb, deleteKontenWeb, getThemeSettings, saveThemeSettings } from '../lib/api';
import type { KontenWeb, ThemeSettings } from '../lib/types';

const KONTEN_FILTERS = ['Semua', 'Edukasi', 'Testimoni', 'Instagram', 'YouTube'] as const;
const KATEGORI_OPTIONS = ['Edukasi', 'Testimoni', 'Instagram', 'YouTube'];
const STATUS_OPTIONS = ['Aktif', 'Nonaktif'];

const initialForm: Partial<KontenWeb> = {
  ID: '',
  Kategori: 'Edukasi',
  Keterangan: '',
  IsiKonten: '',
  Status: 'Aktif',
};

const KontenWeb: React.FC = () => {
  // ---- Sub-tab state ----
  const [activeTab, setActiveTab] = useState<'konten' | 'theme'>('konten');

  // ---- Konten state ----
  const [kontenData, setKontenData] = useState<KontenWeb[]>([]);
  const [kontenLoading, setKontenLoading] = useState<boolean>(true);
  const [filterKategori, setFilterKategori] = useState<string>('Semua');

  // ---- Modal state ----
  const [showModal, setShowModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<KontenWeb>>({ ...initialForm });

  // ---- Theme state ----
  const [primaryColor, setPrimaryColor] = useState<string>('#3b82f6');
  const [hoverColor, setHoverColor] = useState<string>('#2563eb');
  const [themeLoading, setThemeLoading] = useState<boolean>(true);
  const [themeSaving, setThemeSaving] = useState<boolean>(false);

  // ============================
  //         FETCH KONTEN
  // ============================
  const fetchKonten = async () => {
    setKontenLoading(true);
    try {
      const res = await getKontenWeb();
      if (res.success && Array.isArray(res.data)) {
        setKontenData(res.data as KontenWeb[]);
      } else {
        setKontenData([]);
      }
    } catch (err) {
      console.error('Gagal memuat konten web:', err);
      setKontenData([]);
    } finally {
      setKontenLoading(false);
    }
  };

  useEffect(() => {
    fetchKonten();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================
  //         FETCH THEME
  // ============================
  const fetchTheme = async () => {
    setThemeLoading(true);
    try {
      const res = await getThemeSettings();
      if (res.success && res.data) {
        const theme = res.data as ThemeSettings;
        setPrimaryColor(theme.primary || '#3b82f6');
        setHoverColor(theme.hover || '#2563eb');
      }
    } catch (err) {
      console.error('Gagal memuat theme settings:', err);
    } finally {
      setThemeLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'theme') {
      fetchTheme();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ============================
  //          FILTER
  // ============================
  const filteredKonten =
    filterKategori === 'Semua'
      ? kontenData
      : kontenData.filter((item) => item.Kategori === filterKategori);

  // ============================
  //        MODAL HANDLERS
  // ============================
  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...initialForm });
    setShowModal(true);
  };

  const openEditModal = (item: KontenWeb) => {
    setEditingId(item.ID);
    setForm({
      ID: item.ID,
      Kategori: item.Kategori,
      Keterangan: item.Keterangan,
      IsiKonten: item.IsiKonten,
      Status: item.Status,
    });
    setShowModal(true);
  };

  const handleModalChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.Kategori || !form.Keterangan || !form.Status) return;
    setSubmitting(true);
    try {
      await saveKontenWeb({
        ID: editingId || undefined,
        Kategori: form.Kategori,
        Keterangan: form.Keterangan,
        IsiKonten: form.IsiKonten,
        Status: form.Status,
      });
      setShowModal(false);
      await fetchKonten();
    } catch (err) {
      console.error('Gagal menyimpan konten:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus konten ini?')) return;
    try {
      await deleteKontenWeb(id);
      await fetchKonten();
    } catch (err) {
      console.error('Gagal menghapus konten:', err);
    }
  };

  // ============================
  //        THEME HANDLERS
  // ============================
  const handleThemeSave = async () => {
    setThemeSaving(true);
    try {
      await saveThemeSettings(primaryColor, hoverColor);
      alert('Theme berhasil disimpan!');
    } catch (err) {
      console.error('Gagal menyimpan theme:', err);
      alert('Gagal menyimpan theme.');
    } finally {
      setThemeSaving(false);
    }
  };

  // ============================
  //           RENDER
  // ============================
  return (
    <div className="admin-main">
      {/* Header */}
      <div className="admin-topbar">
        <h1>Konten Web</h1>
      </div>

      {/* Sub-tabs */}
      <div className="tab-btns">
        <button
          className={`tab-btn ${activeTab === 'konten' ? 'active' : ''}`}
          onClick={() => setActiveTab('konten')}
        >
          Konten
        </button>
        <button
          className={`tab-btn ${activeTab === 'theme' ? 'active' : ''}`}
          onClick={() => setActiveTab('theme')}
        >
          Theme
        </button>
      </div>

      {/* ===== KONTEN TAB ===== */}
      {activeTab === 'konten' && (
        <>
          {/* Filter & Add bar */}
          <div className="page-header">
            <div className="page-header-actions">
              <div className="form-group" style={{ marginBottom: 0, minWidth: '160px' }}>
                <label htmlFor="kw-filter">Filter Kategori</label>
                <select
                  id="kw-filter"
                  className="form-control"
                  value={filterKategori}
                  onChange={(e) => setFilterKategori(e.target.value)}
                >
                  {KONTEN_FILTERS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-outline"
                onClick={openAddModal}
              >
                + Tambah Konten
              </button>
            </div>
          </div>

          {/* Loading */}
          {kontenLoading && (
            <div className="loading-overlay">
              <div className="loading-spinner" />
              <p>Memuat konten web...</p>
            </div>
          )}

          {/* Table */}
          {!kontenLoading && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Kategori</th>
                    <th>Keterangan</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKonten.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted">
                        Belum ada konten web.
                      </td>
                    </tr>
                  ) : (
                    filteredKonten.map((item) => {
                      const isAktif = item.Status === 'Aktif';
                      return (
                        <tr key={item.ID}>
                          <td>{item.ID}</td>
                          <td>
                            <span className="badge badge-proses"
                            >
                              {item.Kategori}
                            </span>
                          </td>
                          <td style={{ maxWidth: '300px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                            {item.Keterangan || '-'}
                          </td>
                          <td>
                            <span className={`badge ${isAktif ? 'badge-selesai' : 'badge-waiting'}`}
                            >
                              {item.Status}
                            </span>
                          </td>
                          <td>
                            <div className="aksi-group">
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => openEditModal(item)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(item.ID)}
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ===== THEME TAB ===== */}
      {activeTab === 'theme' && (
        <>
          {themeLoading ? (
            <div className="loading-overlay">
              <div className="loading-spinner" />
              <p>Memuat theme...</p>
            </div>
          ) : (
            <div style={{ maxWidth: '500px' }}>
              <div className="form-group">
                <label htmlFor="theme-primary">Primary Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    id="theme-primary"
                    type="color"
                    className="form-control"
                    style={{ width: '60px', height: '40px', padding: '2px', cursor: 'pointer' }}
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-control"
                    style={{ flex: 1, fontFamily: 'monospace' }}
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="theme-hover">Hover Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    id="theme-hover"
                    type="color"
                    className="form-control"
                    style={{ width: '60px', height: '40px', padding: '2px', cursor: 'pointer' }}
                    value={hoverColor}
                    onChange={(e) => setHoverColor(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-control"
                    style={{ flex: 1, fontFamily: 'monospace' }}
                    value={hoverColor}
                    onChange={(e) => setHoverColor(e.target.value)}
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="card">
                <h4 style={{ margin: '0 0 var(--space-md)', fontWeight: 600 }}>Preview</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button
                    style={{
                      padding: '0.5rem 1rem',
                      border: 'none',
                      borderRadius: '6px',
                      background: primaryColor,
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.background = hoverColor;
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.background = primaryColor;
                    }}
                  >
                    Tombol Primary
                  </button>
                  <p style={{ margin: 0 }}>
                    Teks dengan warna{' '}
                    <span style={{ color: primaryColor, fontWeight: 600 }}>primary</span> dan warna{' '}
                    <span style={{ color: hoverColor, fontWeight: 600 }}>hover</span>.
                  </p>
                  <div
                    style={{
                      padding: '0.75rem',
                      background: primaryColor + '15',
                      borderRadius: '6px',
                      borderLeft: `4px solid ${primaryColor}`,
                    }}
                  >
                    <p style={{ margin: 0, color: '#334155', fontSize: '0.9rem' }}>
                      Panel dengan aksen warna primary.
                    </p>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleThemeSave}
                disabled={themeSaving}
                style={{ marginTop: '1.5rem' }}
              >
                {themeSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ===== MODAL FORM ===== */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>{editingId ? 'Edit Konten' : 'Tambah Konten'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleModalSubmit}>
              <div className="modal-body">
                {/* Hidden ID field */}
                {editingId && (
                  <input type="hidden" name="ID" value={form.ID || ''} />
                )}

                <div className="form-group">
                  <label htmlFor="kw-kategori">Kategori</label>
                  <select
                    id="kw-kategori"
                    name="Kategori"
                    className="form-control"
                    value={form.Kategori || ''}
                    onChange={handleModalChange}
                    required
                  >
                    {KATEGORI_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="kw-keterangan">Keterangan</label>
                  <input
                    id="kw-keterangan"
                    type="text"
                    name="Keterangan"
                    className="form-control"
                    value={form.Keterangan || ''}
                    onChange={handleModalChange}
                    placeholder="Judul / deskripsi konten"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="kw-isikonten">Isi Konten</label>
                  <textarea
                    id="kw-isikonten"
                    name="IsiKonten"
                    className="form-control"
                    rows={5}
                    value={form.IsiKonten || ''}
                    onChange={handleModalChange}
                    placeholder="HTML / URL gambar / teks konten"
                    style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="kw-status">Status</label>
                  <select
                    id="kw-status"
                    name="Status"
                    className="form-control"
                    value={form.Status || ''}
                    onChange={handleModalChange}
                    required
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-white"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    submitting ||
                    !form.Kategori ||
                    !form.Keterangan ||
                    !form.Status
                  }
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KontenWeb;
