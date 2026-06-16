import React, { useState, useEffect } from 'react';
import { getSales, recordSale, getMenuStore } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import type { StoreSale, MenuStore } from '../lib/types';

const Penjualan: React.FC = () => {
  const [products, setProducts] = useState<MenuStore[]>([]);
  const [sales, setSales] = useState<StoreSale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form state
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [hargaSatuan, setHargaSatuan] = useState<number>(0);
  const [qty, setQty] = useState<number>(1);
  const [namaPembeli, setNamaPembeli] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, salesRes] = await Promise.all([
        getMenuStore(),
        getSales(),
      ]);
      // Filter only active products
      const activeProducts = ((productsRes.data || []) as MenuStore[]).filter(
        (p: MenuStore) => p.Status === 'Aktif'
      );
      setProducts(activeProducts);
      setSales((salesRes.data || []) as StoreSale[]);
    } catch (err) {
      console.error('Gagal memuat data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedProductId(id);
    const product = products.find((p) => p.ID === String(id));
    setHargaSatuan(product ? Number(product.Harga) : 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || qty < 1) return;

    setSubmitting(true);
    try {
      const product = products.find((p) => p.ID === String(selectedProductId));
      await recordSale({
        ProdukID: String(selectedProductId),
        Qty: qty,
        NamaProduk: product?.NamaProduk || '',
        HargaSatuan: product ? Number(product.Harga) : 0,
        NamaPembeli: namaPembeli || undefined,
      });
      // Reset form
      setSelectedProductId('');
      setHargaSatuan(0);
      setQty(1);
      setNamaPembeli('');
      // Refresh history
      const updatedRes = await getSales();
      setSales((updatedRes.data || []) as StoreSale[]);
    } catch (err) {
      console.error('Gagal mencatat penjualan:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="penjualan-loading">
        <p>Memuat data penjualan...</p>
      </div>
    );
  }

  return (
    <div className="penjualan-container">
      {/* Left Column: Input Penjualan Form */}
      <div className="penjualan-left">
        <h2>Input Penjualan</h2>
        <form onSubmit={handleSubmit} className="penjualan-form">
          <div className="form-group">
            <label htmlFor="produk">Produk</label>
            <select
              id="produk"
              value={selectedProductId}
              onChange={handleProductChange}
              required
            >
              <option value="">-- Pilih Produk --</option>
              {products.map((p) => (
                <option key={p.ID} value={p.ID}>
                  {p.NamaProduk}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="harga">Harga Satuan</label>
            <input
              id="harga"
              type="text"
              value={hargaSatuan ? formatCurrency(hargaSatuan) : ''}
              readOnly
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="qty">Qty</label>
            <input
              id="qty"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="nama_pembeli">Nama Pembeli (opsional)</label>
            <input
              id="nama_pembeli"
              type="text"
              value={namaPembeli}
              onChange={(e) => setNamaPembeli(e.target.value)}
              placeholder="Masukkan nama pembeli"
            />
          </div>

          <button
            type="submit"
            className="btn-penjualan"
            disabled={submitting || !selectedProductId || qty < 1}
          >
            {submitting ? 'Menyimpan...' : 'Catat Penjualan'}
          </button>
        </form>
      </div>

      {/* Right Column: Riwayat Penjualan */}
      <div className="penjualan-right">
        <h2>Riwayat Penjualan</h2>
        <div className="penjualan-table-wrapper">
          <table className="penjualan-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tanggal</th>
                <th>Produk</th>
                <th>Qty</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center' }}>
                    Belum ada penjualan
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.ID}>
                    <td>{sale.ID}</td>
                    <td>{formatDate(sale.Tanggal)}</td>
                    <td>{sale.NamaProduk || '-'}</td>
                    <td>{sale.Qty}</td>
                    <td>{formatCurrency(sale.Total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Penjualan;
