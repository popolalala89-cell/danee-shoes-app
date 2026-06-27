import { useState, useEffect } from 'react';
import { getStoreInventory, getBahanInventory, stockOpname, stockOpnameBahan, purchaseStock, purchaseBahan, addBahan } from '../lib/services/inventory-service';
import type { InventoryStoreRow, InventoryBahanRow } from '../lib/types-supabase';

const Inventory: React.FC = () => {
  const [tab, setTab] = useState<'store' | 'bahan'>('store');

  // Store inventory
  const [storeData, setStoreData] = useState<InventoryStoreRow[]>([]);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeError, setStoreError] = useState<string | null>(null);

  // Bahan inventory
  const [bahanData, setBahanData] = useState<InventoryBahanRow[]>([]);
  const [bahanLoading, setBahanLoading] = useState(false);
  const [bahanError, setBahanError] = useState<string | null>(null);

  // Opname modal
  const [showOpname, setShowOpname] = useState(false);
  const [opnameItem, setOpnameItem] = useState<InventoryStoreRow | null>(null);
  const [opnameFisik, setOpnameFisik] = useState(0);
  const [opnameType, setOpnameType] = useState<'store' | 'bahan'>('store');
  const [opnameBahan, setOpnameBahan] = useState<InventoryBahanRow | null>(null);

  // Purchase modal
  const [showPurchase, setShowPurchase] = useState(false);
  const [purchaseItem, setPurchaseItem] = useState<InventoryStoreRow | null>(null);
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [purchaseType, setPurchaseType] = useState<'store' | 'bahan'>('store');
  const [purchaseBahanItem, setPurchaseBahanItem] = useState<InventoryBahanRow | null>(null);
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false);

  // Add bahan modal
  const [showAddBahan, setShowAddBahan] = useState(false);
  const [addBahanNama, setAddBahanNama] = useState('');
  const [addBahanSatuan, setAddBahanSatuan] = useState('');
  const [addBahanStok, setAddBahanStok] = useState(0);

  const [error, setError] = useState<string | null>(null);

  const fetchStore = async () => {
    setStoreLoading(true);
    setStoreError(null);
    try {
      const res = await getStoreInventory();
      if (res.success) {
        setStoreData(res.data || []);
      } else {
        setStoreError(res.error || 'Gagal memuat inventory.');
      }
    } catch (e: any) {
      setStoreError(e.message || 'Gagal memuat data.');
    } finally {
      setStoreLoading(false);
    }
  };

  const fetchBahan = async () => {
    setBahanLoading(true);
    setBahanError(null);
    try {
      const res = await getBahanInventory();
      if (res.success) {
        setBahanData(res.data || []);
      } else {
        setBahanError(res.error || 'Gagal memuat bahan.');
      }
    } catch (e: any) {
      setBahanError(e.message || 'Gagal memuat data.');
    } finally {
      setBahanLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'store') {
      if (storeData.length === 0) fetchStore();
    } else {
      if (bahanData.length === 0) fetchBahan();
    }
  }, [tab]);

  useEffect(() => { fetchStore(); }, []);

  // Opname
  const openOpnameStore = (item: InventoryStoreRow) => {
    setOpnameType('store');
    setOpnameItem(item);
    setOpnameBahan(null);
    setOpnameFisik(item.stok_fisik ?? item.stok_sistem);
    setShowOpname(true);
  };

  const openOpnameBahan = (item: InventoryBahanRow) => {
    setOpnameType('bahan');
    setOpnameBahan(item);
    setOpnameItem(null);
    setOpnameFisik(item.stok_fisik ?? item.stok_sistem);
    setShowOpname(true);
  };

  const handleOpname = async () => {
    try {
      if (opnameType === 'store' && opnameItem) {
        const res = await stockOpname(opnameItem.produk_id, opnameFisik);
        if (!res.success) { setError(res.error ?? null); return; }
        setShowOpname(false);
        await fetchStore();
      } else if (opnameType === 'bahan' && opnameBahan) {
        const res = await stockOpnameBahan(opnameBahan.id, opnameFisik);
        if (!res.success) { setError(res.error ?? null); return; }
        setShowOpname(false);
        await fetchBahan();
      }
    } catch (e: any) {
      setError(e.message || 'Gagal opname.');
    }
  };

  // Purchase
  const openPurchaseStore = (item: InventoryStoreRow) => {
    setPurchaseType('store');
    setPurchaseItem(item);
    setPurchaseBahanItem(null);
    setPurchaseQty(1);
    setShowPurchase(true);
  };

  const openPurchaseBahan = (item: InventoryBahanRow) => {
    setPurchaseType('bahan');
    setPurchaseBahanItem(item);
    setPurchaseItem(null);
    setPurchaseQty(1);
    setShowPurchase(true);
  };

  const handlePurchase = async () => {
    if (purchaseQty <= 0) return;
    setPurchaseSubmitting(true);
    try {
      if (purchaseType === 'store' && purchaseItem) {
        const res = await purchaseStock(purchaseItem.produk_id, purchaseQty);
        if (!res.success) { setError(res.error ?? null); setPurchaseSubmitting(false); return; }
        setShowPurchase(false);
        await fetchStore();
      } else if (purchaseType === 'bahan' && purchaseBahanItem) {
        const res = await purchaseBahan(purchaseBahanItem.id, purchaseQty);
        if (!res.success) { setError(res.error ?? null); setPurchaseSubmitting(false); return; }
        setShowPurchase(false);
        await fetchBahan();
      }
    } catch (e: any) {
      setError(e.message || 'Gagal pembelian.');
    } finally {
      setPurchaseSubmitting(false);
    }
  };

  const handleAddBahan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addBahanNama.trim() || !addBahanSatuan.trim()) return;
    try {
      const res = await addBahan({
        nama_bahan: addBahanNama.trim(),
        satuan: addBahanSatuan.trim(),
        stok_sistem: addBahanStok || 0,
      });
      if (res.success) {
        setShowAddBahan(false);
        setAddBahanNama(''); setAddBahanSatuan(''); setAddBahanStok(0);
        await fetchBahan();
        setTab('bahan');
      } else {
        setError(res.error || 'Gagal tambah bahan.');
      }
    } catch (e: any) {
      setError(e.message || 'Gagal tambah bahan.');
    }
  };

  return (
    <div className="admin-main">
      <div className="admin-topbar">
        <h1>Inventory</h1>
        {tab === 'bahan' && <button className="btn btn-primary" onClick={() => setShowAddBahan(true)}>+ Tambah Bahan</button>}
      </div>

      {/* Tabs */}
      <div className="tab-btns" style={{ marginBottom: 'var(--space-md)' }}>
        <button className={`tab-btn ${tab === 'store' ? 'active' : ''}`} onClick={() => setTab('store')}>Barang Dagangan</button>
        <button className={`tab-btn ${tab === 'bahan' ? 'active' : ''}`} onClick={() => setTab('bahan')}>Bahan Baku</button>
      </div>

      {error && <div className="alert alert-danger" style={{ padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)', color: 'var(--danger)', fontWeight: 500, cursor: 'pointer' }} onClick={() => setError(null)}>{error}</div>}

      {/* STORE TAB */}
      {tab === 'store' && (
        <>
          {storeLoading ? (
            <div className="loading-overlay"><div className="loading-spinner" /><p>Memuat inventory...</p></div>
          ) : storeError ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--danger)' }}>{storeError}<br /><button className="btn btn-primary" onClick={fetchStore} style={{ marginTop: 'var(--space-sm)' }}>Coba Lagi</button></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Produk</th><th>Stok Sistem</th><th>Stok Fisik</th><th>Selisih</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {storeData.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-muted">Belum ada data inventory.</td></tr>
                  ) : (
                    storeData.map((item) => {
                      const selisih = (item.stok_fisik ?? item.stok_sistem) - item.stok_sistem;
                      return (
                        <tr key={item.produk_id}>
                          <td style={{ fontWeight: 600 }}>{item.nama_produk}</td>
                          <td><span className={`badge ${item.stok_sistem <= 3 ? 'badge-batal' : 'badge-selesai'}`}>{item.stok_sistem}</span></td>
                          <td>{item.stok_fisik ?? '-'}</td>
                          <td style={{ color: selisih !== 0 ? 'var(--danger)' : 'inherit', fontWeight: selisih !== 0 ? 700 : 400 }}>{selisih !== 0 ? (selisih > 0 ? `+${selisih}` : selisih) : '-'}</td>
                          <td>
                            <div className="aksi-group">
                              <button className="btn btn-sm btn-primary" onClick={() => openOpnameStore(item)}>Opname</button>
                              <button className="btn btn-sm btn-success" onClick={() => openPurchaseStore(item)}>Beli</button>
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

      {/* BAHAN TAB */}
      {tab === 'bahan' && (
        <>
          {bahanLoading ? (
            <div className="loading-overlay"><div className="loading-spinner" /><p>Memuat bahan...</p></div>
          ) : bahanError ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--danger)' }}>{bahanError}<br /><button className="btn btn-primary" onClick={fetchBahan} style={{ marginTop: 'var(--space-sm)' }}>Coba Lagi</button></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Nama Bahan</th><th>Satuan</th><th>Stok Sistem</th><th>Stok Fisik</th><th>Selisih</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {bahanData.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-muted">Belum ada data bahan.</td></tr>
                  ) : (
                    bahanData.map((item) => {
                      const selisih = (item.stok_fisik ?? item.stok_sistem) - item.stok_sistem;
                      return (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600 }}>{item.nama_bahan}</td>
                          <td>{item.satuan}</td>
                          <td><span className={`badge ${item.stok_sistem <= 3 ? 'badge-batal' : 'badge-selesai'}`}>{item.stok_sistem}</span></td>
                          <td>{item.stok_fisik ?? '-'}</td>
                          <td style={{ color: selisih !== 0 ? 'var(--danger)' : 'inherit', fontWeight: selisih !== 0 ? 700 : 400 }}>{selisih !== 0 ? (selisih > 0 ? `+${selisih}` : selisih) : '-'}</td>
                          <td>
                            <div className="aksi-group">
                              <button className="btn btn-sm btn-primary" onClick={() => openOpnameBahan(item)}>Opname</button>
                              <button className="btn btn-sm btn-success" onClick={() => openPurchaseBahan(item)}>Beli</button>
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

      {/* Opname Modal */}
      {showOpname && (
        <div className="modal-overlay" onClick={() => setShowOpname(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Stock Opname</h3>
              <button className="modal-close" onClick={() => setShowOpname(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 'var(--space-md)' }}>
                <strong>{opnameItem?.nama_produk || opnameBahan?.nama_bahan}</strong><br />
                Stok Sistem saat ini: <strong>{opnameItem?.stok_sistem ?? opnameBahan?.stok_sistem ?? 0}</strong>
              </p>
              <div className="form-group">
                <label>Stok Fisik</label>
                <input type="number" className="form-control" min={0} value={opnameFisik} onChange={(e) => setOpnameFisik(Math.max(0, parseInt(e.target.value) || 0))} />
              </div>
              <div style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', background: (opnameFisik - (opnameItem?.stok_sistem ?? opnameBahan?.stok_sistem ?? 0)) !== 0 ? '#fef3c7' : '#f0fdf4', marginTop: 'var(--space-sm)', textAlign: 'center', fontWeight: 600 }}>
                Selisih: {(opnameFisik - (opnameItem?.stok_sistem ?? opnameBahan?.stok_sistem ?? 0)) > 0 ? '+' : ''}{(opnameFisik - (opnameItem?.stok_sistem ?? opnameBahan?.stok_sistem ?? 0))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-white" onClick={() => setShowOpname(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleOpname}>Simpan Opname</button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchase && (
        <div className="modal-overlay" onClick={() => setShowPurchase(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Pembelian Stok</h3>
              <button className="modal-close" onClick={() => setShowPurchase(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 'var(--space-md)' }}>
                <strong>{purchaseItem?.nama_produk || purchaseBahanItem?.nama_bahan}</strong><br />
                Stok saat ini: <strong>{purchaseItem?.stok_sistem ?? purchaseBahanItem?.stok_sistem ?? 0}</strong>
              </p>
              <div className="form-group">
                <label>Jumlah Tambahan</label>
                <input type="number" className="form-control" min={1} value={purchaseQty} onChange={(e) => setPurchaseQty(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
              <div style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', background: '#f0fdf4', marginTop: 'var(--space-sm)', textAlign: 'center', fontWeight: 600 }}>
                Stok setelah pembelian: <strong>{(purchaseItem?.stok_sistem ?? purchaseBahanItem?.stok_sistem ?? 0) + purchaseQty}</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-white" onClick={() => setShowPurchase(false)} disabled={purchaseSubmitting}>Batal</button>
              <button className="btn btn-success" onClick={handlePurchase} disabled={purchaseSubmitting || purchaseQty <= 0}>
                {purchaseSubmitting ? 'Menyimpan...' : 'Tambah Stok'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Bahan Modal */}
      {showAddBahan && (
        <div className="modal-overlay" onClick={() => setShowAddBahan(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Bahan</h3>
              <button className="modal-close" onClick={() => setShowAddBahan(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddBahan}>
              <div className="modal-body">
                <div className="form-group"><label>Nama Bahan</label><input type="text" className="form-control" value={addBahanNama} onChange={(e) => setAddBahanNama(e.target.value)} placeholder="Nama bahan" required /></div>
                <div className="form-group"><label>Satuan</label><input type="text" className="form-control" value={addBahanSatuan} onChange={(e) => setAddBahanSatuan(e.target.value)} placeholder="pcs, liter, kg..." required /></div>
                <div className="form-group"><label>Stok Awal</label><input type="number" className="form-control" min={0} value={addBahanStok} onChange={(e) => setAddBahanStok(Math.max(0, parseInt(e.target.value) || 0))} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-white" onClick={() => setShowAddBahan(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={!addBahanNama.trim() || !addBahanSatuan.trim()}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
