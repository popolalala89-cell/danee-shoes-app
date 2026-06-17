import { useState, useEffect } from 'react';
import { getAll as getAllSales, create as createSale } from '../lib/services/sales-service';
import { getAll as getAllMenuStore } from '../lib/services/menu-store-service';
import { formatCurrency, formatDate } from '../lib/utils';
import type { StoreSaleRow, MenuStoreRow } from '../lib/types-supabase';

const Penjualan: React.FC = () => {
  const [data, setData] = useState<StoreSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add modal
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<MenuStoreRow[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState(1);
  const [namaPembeli, setNamaPembeli] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllSales();
      if (res.success) {
        setData(res.data || []);
      } else {
        setError(res.error || 'Gagal memuat penjualan.');
      }
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = async () => {
    setSelectedProduct('');
    setQty(1);
    setNamaPembeli('');
    try {
      const res = await getAllMenuStore();
      if (res.success) setProducts(res.data || []);
    } catch {}
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || qty <= 0) return;
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    setSubmitting(true);
    try {
      const res = await createSale({
        produk_id: selectedProduct,
        nama_produk: product.nama_produk,
        qty,
        harga_satuan: product.harga_promo || product.harga,
        total: (product.harga_promo || product.harga) * qty,
        nama_pembeli: namaPembeli.trim() || null,
      });
      if (res.success) {
        setShowModal(false);
        await fetchData();
      } else {
        setError(res.error || 'Gagal menyimpan penjualan.');
      }
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan penjualan.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalOmset = data.reduce((sum, s) => sum + (s.total || 0), 0);

  return (
    <div className="admin-main">
      <div className="admin-topbar">
        <h1>Penjualan</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Catat Penjualan</button>
      </div>

      <div className="summary-grid" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="summary-card" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)', borderLeft: '4px solid var(--success)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: 'var(--space-sm)' }}>💰</div>
          <div className="label">Total Penjualan</div>
          <div className="value" style={{ color: '#059669' }}>{formatCurrency(totalOmset)}</div>
        </div>
        <div className="summary-card" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0f4ff 100%)', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', marginBottom: 'var(--space-sm)' }}>📦</div>
          <div className="label">Total Transaksi</div>
          <div className="value" style={{ color: '#2563eb' }}>{data.length}</div>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)', color: 'var(--danger)', fontWeight: 500 }}>{error}</div>}

      {loading && (
        <div className="loading-overlay"><div className="loading-spinner" /><p>Memuat data penjualan...</p></div>
      )}

      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th><th>Pembeli</th><th>Produk</th><th>Qty</th><th>Harga Satuan</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted">Belum ada penjualan.</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.tanggal || '')}</td>
                    <td>{item.nama_pembeli || '-'}</td>
                    <td style={{ fontWeight: 600 }}>{item.nama_produk}</td>
                    <td>{item.qty}</td>
                    <td>{formatCurrency(item.harga_satuan ?? 0)}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(item.total ?? 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Sale Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Catat Penjualan</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Produk</label>
                  <select className="form-control" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} required>
                    <option value="">— Pilih Produk —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.nama_produk} — {formatCurrency(p.harga)} (Stok: {p.stok ?? 0})</option>
                    ))}
                  </select>
                </div>
                {selectedProduct && products.find((p) => p.id === selectedProduct) && (
                  <div style={{ padding: 'var(--space-sm)', background: 'var(--bg-gray)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)' }}>
                    <strong>{products.find((p) => p.id === selectedProduct)?.nama_produk}</strong><br />
                    Harga: {formatCurrency(products.find((p) => p.id === selectedProduct)?.harga_promo || products.find((p) => p.id === selectedProduct)?.harga || 0)}
                    {products.find((p) => p.id === selectedProduct)?.harga_promo ? <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}> (Promo)</span> : ''}
                  </div>
                )}
                <div className="form-group">
                  <label>Qty</label>
                  <input type="number" className="form-control" min={1} value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} required />
                </div>
                <div className="form-group">
                  <label>Nama Pembeli (opsional)</label>
                  <input type="text" className="form-control" value={namaPembeli} onChange={(e) => setNamaPembeli(e.target.value)} placeholder="Nama pembeli" />
                </div>
                {selectedProduct && (
                  <div style={{ padding: 'var(--space-sm)', background: '#f0fdf4', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontWeight: 700, fontSize: '1.125rem' }}>
                    Total: {formatCurrency(((products.find((p) => p.id === selectedProduct)?.harga_promo || products.find((p) => p.id === selectedProduct)?.harga || 0)) * qty)}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-white" onClick={() => setShowModal(false)} disabled={submitting}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !selectedProduct || qty <= 0}>
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

export default Penjualan;
