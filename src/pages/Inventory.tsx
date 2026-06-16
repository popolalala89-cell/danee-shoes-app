import React, { useState, useEffect } from 'react';
import { getInventoryStore, stockOpnameStore, purchaseStock, getInventoryBahan, addBahan, stockOpnameBahan, purchaseBahan } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import type { InventoryItem, BahanItem } from '../lib/types';

const Inventory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dagangan' | 'bahan'>('dagangan');
  const [daganganData, setDaganganData] = useState<InventoryItem[]>([]);
  const [bahanData, setBahanData] = useState<BahanItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal visibility
  const [showBeliStok, setShowBeliStok] = useState<boolean>(false);
  const [showStockOpname, setShowStockOpname] = useState<boolean>(false);
  const [showTambahBahan, setShowTambahBahan] = useState<boolean>(false);
  const [showBeliBahan, setShowBeliBahan] = useState<boolean>(false);
  const [showStockOpnameBahan, setShowStockOpnameBahan] = useState<boolean>(false);

  // Beli Stok form
  const [beliStokForm, setBeliStokForm] = useState<{
    ProdukID: string;
    NamaProduk: string;
    Qty: number;
    HargaBeli: number;
  }>({ ProdukID: '', NamaProduk: '', Qty: 1, HargaBeli: 0 });

  // Stock Opname dagangan
  const [stockOpnameItems, setStockOpnameItems] = useState<
    { ProdukID: string; StokFisik: number }[]
  >([]);

  // Tambah Bahan form
  const [tambahBahanForm, setTambahBahanForm] = useState<{
    NamaBahan: string;
    Satuan: string;
    Stok: number;
  }>({ NamaBahan: '', Satuan: '', Stok: 0 });

  // Beli Bahan form
  const [beliBahanForm, setBeliBahanForm] = useState<{
    BahanID: string;
    NamaBahan: string;
    Qty: number;
    HargaBeli: number;
  }>({ BahanID: '', NamaBahan: '', Qty: 1, HargaBeli: 0 });

  // Stock Opname bahan
  const [stockOpnameBahanItems, setStockOpnameBahanItems] = useState<
    { BahanID: string; StokFisik: number }[]
  >([]);

  // Submitting states
  const [submittingSO, setSubmittingSO] = useState<boolean>(false);
  const [submittingBS, setSubmittingBS] = useState<boolean>(false);
  const [submittingTB, setSubmittingTB] = useState<boolean>(false);
  const [submittingBB, setSubmittingBB] = useState<boolean>(false);
  const [submittingSOB, setSubmittingSOB] = useState<boolean>(false);

  // ---- Data Fetching ----
  const fetchDagangan = async () => {
    try {
      const res = await getInventoryStore();
      setDaganganData(res.data || []);
    } catch (err) {
      console.error('Gagal memuat data dagangan:', err);
    }
  };

  const fetchBahan = async () => {
    try {
      const res = await getInventoryBahan();
      setBahanData(res.data || []);
    } catch (err) {
      console.error('Gagal memuat data bahan baku:', err);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchDagangan(), fetchBahan()]);
    } catch (err) {
      console.error('Gagal memuat data inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoading(true);
      (activeTab === 'dagangan' ? fetchDagangan() : fetchBahan()).finally(() =>
        setLoading(false)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ---- Beli Stok ----
  const openBeliStok = () => {
    setBeliStokForm({ ProdukID: '', NamaProduk: '', Qty: 1, HargaBeli: 0 });
    setShowBeliStok(true);
  };

  const handleBeliStokChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'ProdukID') {
      const product = daganganData.find((p) => p.ProdukID === value);
      setBeliStokForm((prev) => ({
        ...prev,
        ProdukID: value,
        NamaProduk: product?.NamaProduk || '',
      }));
    } else {
      setBeliStokForm((prev) => ({
        ...prev,
        [name]: name === 'Qty' || name === 'HargaBeli' ? Number(value) : value,
      }));
    }
  };

  const handleBeliStokSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beliStokForm.ProdukID || beliStokForm.Qty < 1) return;
    setSubmittingBS(true);
    try {
      await purchaseStock(beliStokForm);
      setShowBeliStok(false);
      await fetchDagangan();
    } catch (err) {
      console.error('Gagal membeli stok:', err);
    } finally {
      setSubmittingBS(false);
    }
  };

  // ---- Stock Opname Dagangan ----
  const openStockOpname = () => {
    const items = daganganData.map((item) => ({
      ProdukID: item.ProdukID,
      StokFisik: item.StokFisik ?? item.StokSistem,
    }));
    setStockOpnameItems(items);
    setShowStockOpname(true);
  };

  const handleSOInputChange = (index: number, value: number) => {
    setStockOpnameItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], StokFisik: value };
      return updated;
    });
  };

  const handleSOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSO(true);
    try {
      await stockOpnameStore(stockOpnameItems);
      setShowStockOpname(false);
      await fetchDagangan();
    } catch (err) {
      console.error('Gagal menyimpan stock opname:', err);
    } finally {
      setSubmittingSO(false);
    }
  };

  // ---- Tambah Bahan ----
  const openTambahBahan = () => {
    setTambahBahanForm({ NamaBahan: '', Satuan: '', Stok: 0 });
    setShowTambahBahan(true);
  };

  const handleTambahBahanChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTambahBahanForm((prev) => ({
      ...prev,
      [name]: name === 'Stok' ? Number(value) : value,
    }));
  };

  const handleTambahBahanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tambahBahanForm.NamaBahan || !tambahBahanForm.Satuan) return;
    setSubmittingTB(true);
    try {
      await addBahan(tambahBahanForm);
      setShowTambahBahan(false);
      await fetchBahan();
    } catch (err) {
      console.error('Gagal menambah bahan:', err);
    } finally {
      setSubmittingTB(false);
    }
  };

  // ---- Beli Bahan ----
  const openBeliBahan = () => {
    setBeliBahanForm({ BahanID: '', NamaBahan: '', Qty: 1, HargaBeli: 0 });
    setShowBeliBahan(true);
  };

  const handleBeliBahanChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'BahanID') {
      const bahan = bahanData.find((b) => b.BahanID === value);
      setBeliBahanForm((prev) => ({
        ...prev,
        BahanID: value,
        NamaBahan: bahan?.NamaBahan || '',
      }));
    } else {
      setBeliBahanForm((prev) => ({
        ...prev,
        [name]: name === 'Qty' || name === 'HargaBeli' ? Number(value) : value,
      }));
    }
  };

  const handleBeliBahanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beliBahanForm.BahanID || beliBahanForm.Qty < 1) return;
    setSubmittingBB(true);
    try {
      await purchaseBahan(beliBahanForm);
      setShowBeliBahan(false);
      await fetchBahan();
    } catch (err) {
      console.error('Gagal membeli bahan:', err);
    } finally {
      setSubmittingBB(false);
    }
  };

  // ---- Stock Opname Bahan ----
  const openStockOpnameBahan = () => {
    const items = bahanData.map((item) => ({
      BahanID: item.BahanID,
      StokFisik: item.StokFisik ?? item.StokSistem,
    }));
    setStockOpnameBahanItems(items);
    setShowStockOpnameBahan(true);
  };

  const handleSOBInputChange = (index: number, value: number) => {
    setStockOpnameBahanItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], StokFisik: value };
      return updated;
    });
  };

  const handleSOBSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSOB(true);
    try {
      await stockOpnameBahan(stockOpnameBahanItems);
      setShowStockOpnameBahan(false);
      await fetchBahan();
    } catch (err) {
      console.error('Gagal menyimpan stock opname bahan:', err);
    } finally {
      setSubmittingSOB(false);
    }
  };

  // ---- Render helpers ----
  const renderSelisih = (stokSistem: number, stokFisik?: number) => {
    if (stokFisik === undefined || stokFisik === null) return '-';
    const selisih = stokFisik - stokSistem;
    const color = selisih === 0 ? '#10b981' : selisih > 0 ? '#3b82f6' : '#ef4444';
    const sign = selisih > 0 ? '+' : '';
    return <span style={{ color, fontWeight: 600 }}>{sign}{selisih}</span>;
  };

  // ---- Render ----
  return (
    <div className="admin-main">
      {/* Header */}
      <div className="admin-topbar">
        <h1>Inventory</h1>
      </div>

      {/* Sub-tabs */}
      <div className="tab-btns">
        <button
          className={`tab-btn ${activeTab === 'dagangan' ? 'active' : ''}`}
          onClick={() => setActiveTab('dagangan')}
        >
          Dagangan
        </button>
        <button
          className={`tab-btn ${activeTab === 'bahan' ? 'active' : ''}`}
          onClick={() => setActiveTab('bahan')}
        >
          Bahan Baku
        </button>
      </div>

      {/* ---- DAGANGAN TAB ---- */}
      {activeTab === 'dagangan' && (
        <div>
          {/* Action buttons */}
          <div className="page-header-actions" style={{ marginBottom: 'var(--space-md)' }}>
            <button className="btn btn-primary" onClick={openBeliStok}>
              Beli Stok
            </button>
            <button className="btn btn-outline" onClick={openStockOpname}>
              Stock Opname
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner" />
              <p>Memuat data dagangan...</p>
            </div>
          )}

          {/* Table */}
          {!loading && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nama Produk</th>
                    <th>Stok Sistem</th>
                    <th>Stok Fisik</th>
                    <th>Selisih</th>
                    <th>Update</th>
                  </tr>
                </thead>
                <tbody>
                  {daganganData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted">
                        Belum ada data dagangan.
                      </td>
                    </tr>
                  ) : (
                    daganganData.map((item) => (
                      <tr key={item.ProdukID}>
                        <td>{item.ProdukID}</td>
                        <td style={{ fontWeight: 600 }}>{item.NamaProduk}</td>
                        <td>{item.StokSistem}</td>
                        <td>{item.StokFisik ?? '-'}</td>
                        <td>{renderSelisih(item.StokSistem, item.StokFisik)}</td>
                        <td style={{ color: 'var(--text-gray)' }}>
                          {item.Update ? formatDate(item.Update) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ---- Beli Stok Modal ---- */}
          {showBeliStok && (
            <div className="modal-overlay">
              <div className="modal-box">
                <div className="modal-header">
                  <h3>Beli Stok</h3>
                  <button className="modal-close" onClick={() => setShowBeliStok(false)}>
                    &times;
                  </button>
                </div>
                <form onSubmit={handleBeliStokSubmit}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label htmlFor="bs-produk">Produk</label>
                      <select
                        id="bs-produk"
                        name="ProdukID"
                        className="form-control"
                        value={beliStokForm.ProdukID}
                        onChange={handleBeliStokChange}
                        required
                      >
                        <option value="">-- Pilih Produk --</option>
                        {daganganData.map((item) => (
                          <option key={item.ProdukID} value={item.ProdukID}>
                            {item.NamaProduk}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="bs-qty">Qty</label>
                      <input
                        id="bs-qty"
                        type="number"
                        name="Qty"
                        className="form-control"
                        min={1}
                        value={beliStokForm.Qty}
                        onChange={handleBeliStokChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="bs-harga">Harga Beli</label>
                      <input
                        id="bs-harga"
                        type="number"
                        name="HargaBeli"
                        className="form-control"
                        min={0}
                        value={beliStokForm.HargaBeli}
                        onChange={handleBeliStokChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-white"
                      onClick={() => setShowBeliStok(false)}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submittingBS || !beliStokForm.ProdukID}
                    >
                      {submittingBS ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ---- Stock Opname Modal ---- */}
          {showStockOpname && (
            <div className="modal-overlay">
              <div className="modal-box" style={{ maxWidth: '650px' }}>
                <div className="modal-header">
                  <h3>Stock Opname</h3>
                  <button className="modal-close" onClick={() => setShowStockOpname(false)}>
                    &times;
                  </button>
                </div>
                <form onSubmit={handleSOSubmit}>
                  <div className="modal-body">
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Produk</th>
                            <th>Stok Sistem</th>
                            <th>Stok Fisik</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockOpnameItems.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="text-center text-muted">
                                Tidak ada item.
                              </td>
                            </tr>
                          ) : (
                            stockOpnameItems.map((item, idx) => {
                              const dagangan = daganganData.find(
                                (d) => d.ProdukID === item.ProdukID
                              );
                              return (
                                <tr key={item.ProdukID}>
                                  <td style={{ fontWeight: 600 }}>
                                    {dagangan?.NamaProduk || item.ProdukID}
                                  </td>
                                  <td>{dagangan?.StokSistem ?? 0}</td>
                                  <td>
                                    <input
                                      type="number"
                                      className="form-control"
                                      style={{ width: '100px' }}
                                      min={0}
                                      value={item.StokFisik}
                                      onChange={(e) =>
                                        handleSOInputChange(idx, Number(e.target.value))
                                      }
                                      required
                                    />
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-white"
                      onClick={() => setShowStockOpname(false)}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submittingSO}
                    >
                      {submittingSO ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- BAHAN BAKU TAB ---- */}
      {activeTab === 'bahan' && (
        <div>
          {/* Action buttons */}
          <div className="page-header-actions" style={{ marginBottom: 'var(--space-md)' }}>
            <button className="btn btn-primary" onClick={openTambahBahan}>
              Tambah Bahan
            </button>
            <button className="btn btn-outline" onClick={openBeliBahan}>
              Beli Bahan
            </button>
            <button className="btn btn-outline" onClick={openStockOpnameBahan}>
              Stock Opname Bahan
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner" />
              <p>Memuat data bahan baku...</p>
            </div>
          )}

          {/* Table */}
          {!loading && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nama Bahan</th>
                    <th>Satuan</th>
                    <th>Stok Sistem</th>
                    <th>Stok Fisik</th>
                    <th>Selisih</th>
                    <th>Update</th>
                  </tr>
                </thead>
                <tbody>
                  {bahanData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted">
                        Belum ada data bahan baku.
                      </td>
                    </tr>
                  ) : (
                    bahanData.map((item) => (
                      <tr key={item.BahanID}>
                        <td>{item.BahanID}</td>
                        <td style={{ fontWeight: 600 }}>{item.NamaBahan}</td>
                        <td>{item.Satuan}</td>
                        <td>{item.StokSistem}</td>
                        <td>{item.StokFisik ?? '-'}</td>
                        <td>{renderSelisih(item.StokSistem, item.StokFisik)}</td>
                        <td style={{ color: 'var(--text-gray)' }}>
                          {item.Update ? formatDate(item.Update) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ---- Tambah Bahan Modal ---- */}
          {showTambahBahan && (
            <div className="modal-overlay">
              <div className="modal-box">
                <div className="modal-header">
                  <h3>Tambah Bahan</h3>
                  <button className="modal-close" onClick={() => setShowTambahBahan(false)}>
                    &times;
                  </button>
                </div>
                <form onSubmit={handleTambahBahanSubmit}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label htmlFor="tb-nama">Nama Bahan</label>
                      <input
                        id="tb-nama"
                        type="text"
                        name="NamaBahan"
                        className="form-control"
                        value={tambahBahanForm.NamaBahan}
                        onChange={handleTambahBahanChange}
                        placeholder="Masukkan nama bahan"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="tb-satuan">Satuan</label>
                      <select
                        id="tb-satuan"
                        name="Satuan"
                        className="form-control"
                        value={tambahBahanForm.Satuan}
                        onChange={handleTambahBahanChange}
                        required
                      >
                        <option value="">-- Pilih Satuan --</option>
                        <option value="Pcs">Pcs</option>
                        <option value="Kg">Kg</option>
                        <option value="Gram">Gram</option>
                        <option value="Liter">Liter</option>
                        <option value="Meter">Meter</option>
                        <option value="Lembar">Lembar</option>
                        <option value="Botol">Botol</option>
                        <option value="Pasang">Pasang</option>
                        <option value="Roll">Roll</option>
                        <option value="Pack">Pack</option>
                        <option value="Dus">Dus</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="tb-stok">Stok Awal</label>
                      <input
                        id="tb-stok"
                        type="number"
                        name="Stok"
                        className="form-control"
                        min={0}
                        value={tambahBahanForm.Stok}
                        onChange={handleTambahBahanChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-white"
                      onClick={() => setShowTambahBahan(false)}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submittingTB || !tambahBahanForm.NamaBahan || !tambahBahanForm.Satuan}
                    >
                      {submittingTB ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ---- Beli Bahan Modal ---- */}
          {showBeliBahan && (
            <div className="modal-overlay">
              <div className="modal-box">
                <div className="modal-header">
                  <h3>Beli Bahan</h3>
                  <button className="modal-close" onClick={() => setShowBeliBahan(false)}>
                    &times;
                  </button>
                </div>
                <form onSubmit={handleBeliBahanSubmit}>
                  <div className="modal-body">
                    <div className="form-group">
                      <label htmlFor="bb-bahan">Bahan</label>
                      <select
                        id="bb-bahan"
                        name="BahanID"
                        className="form-control"
                        value={beliBahanForm.BahanID}
                        onChange={handleBeliBahanChange}
                        required
                      >
                        <option value="">-- Pilih Bahan --</option>
                        {bahanData.map((item) => (
                          <option key={item.BahanID} value={item.BahanID}>
                            {item.NamaBahan} ({item.Satuan})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="bb-qty">Qty</label>
                      <input
                        id="bb-qty"
                        type="number"
                        name="Qty"
                        className="form-control"
                        min={1}
                        value={beliBahanForm.Qty}
                        onChange={handleBeliBahanChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="bb-harga">Harga Beli</label>
                      <input
                        id="bb-harga"
                        type="number"
                        name="HargaBeli"
                        className="form-control"
                        min={0}
                        value={beliBahanForm.HargaBeli}
                        onChange={handleBeliBahanChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-white"
                      onClick={() => setShowBeliBahan(false)}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submittingBB || !beliBahanForm.BahanID}
                    >
                      {submittingBB ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ---- Stock Opname Bahan Modal ---- */}
          {showStockOpnameBahan && (
            <div className="modal-overlay">
              <div className="modal-box" style={{ maxWidth: '650px' }}>
                <div className="modal-header">
                  <h3>Stock Opname Bahan</h3>
                  <button className="modal-close" onClick={() => setShowStockOpnameBahan(false)}>
                    &times;
                  </button>
                </div>
                <form onSubmit={handleSOBSubmit}>
                  <div className="modal-body">
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Bahan</th>
                            <th>Satuan</th>
                            <th>Stok Sistem</th>
                            <th>Stok Fisik</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockOpnameBahanItems.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center text-muted">
                                Tidak ada item.
                              </td>
                            </tr>
                          ) : (
                            stockOpnameBahanItems.map((item, idx) => {
                              const bahan = bahanData.find(
                                (b) => b.BahanID === item.BahanID
                              );
                              return (
                                <tr key={item.BahanID}>
                                  <td style={{ fontWeight: 600 }}>
                                    {bahan?.NamaBahan || item.BahanID}
                                  </td>
                                  <td>{bahan?.Satuan || '-'}</td>
                                  <td>{bahan?.StokSistem ?? 0}</td>
                                  <td>
                                    <input
                                      type="number"
                                      className="form-control"
                                      style={{ width: '100px' }}
                                      min={0}
                                      value={item.StokFisik}
                                      onChange={(e) =>
                                        handleSOBInputChange(idx, Number(e.target.value))
                                      }
                                      required
                                    />
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-white"
                      onClick={() => setShowStockOpnameBahan(false)}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submittingSOB}
                    >
                      {submittingSOB ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Inventory;
