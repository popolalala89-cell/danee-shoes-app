import React, { useState, useEffect } from 'react';
import { getCashflow, addCashflowManual } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import type { Cashflow } from '../lib/types';

const Cashflow: React.FC = () => {
  // Filter state
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const firstDay = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const lastDayDate = new Date(currentYear, currentMonth + 1, 0);
  const lastDay = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

  const [startDate, setStartDate] = useState<string>(firstDay);
  const [endDate, setEndDate] = useState<string>(lastDay);
  const [filterTipe, setFilterTipe] = useState<string>('Semua');

  // Data & loading
  const [data, setData] = useState<Cashflow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetching, setFetching] = useState<boolean>(false);

  // Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Modal form
  const [formTipe, setFormTipe] = useState<string>('Pemasukan');
  const [formKategori, setFormKategori] = useState<string>('');
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formJumlah, setFormJumlah] = useState<number>(0);

  // ---- Fetch Data ----
  const fetchData = async (start: string, end: string) => {
    setFetching(true);
    try {
      const res = await getCashflow({ startDate: start, endDate: end });
      if (res.success && Array.isArray(res.data)) {
        setData(res.data as Cashflow[]);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error('Gagal memuat data cashflow:', err);
      setData([]);
    } finally {
      setFetching(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(startDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Filter ----
  const handleFilter = () => {
    setLoading(true);
    fetchData(startDate, endDate);
  };

  // ---- Compute summary from filtered data ----
  const filteredData =
    filterTipe === 'Semua'
      ? data
      : data.filter((item) => item.Tipe === filterTipe);

  const totalPemasukan = filteredData
    .filter((item) => item.Tipe === 'Pemasukan')
    .reduce((sum, item) => sum + (Number(item.Jumlah) || 0), 0);

  const totalPengeluaran = filteredData
    .filter((item) => item.Tipe === 'Pengeluaran')
    .reduce((sum, item) => sum + (Number(item.Jumlah) || 0), 0);

  const netAmount = totalPemasukan - totalPengeluaran;
  const isProfit = netAmount >= 0;
  const baseForPct = totalPemasukan > 0 ? totalPemasukan : 1;
  const marginPct = ((netAmount / baseForPct) * 100).toFixed(1);

  // ---- Tambah Manual ----
  const openModal = () => {
    setFormTipe('Pemasukan');
    setFormKategori('');
    setFormKeterangan('');
    setFormJumlah(0);
    setShowModal(true);
  };

  const handleModalChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    switch (name) {
      case 'Tipe':
        setFormTipe(value);
        break;
      case 'Kategori':
        setFormKategori(value);
        break;
      case 'Keterangan':
        setFormKeterangan(value);
        break;
      case 'Jumlah':
        setFormJumlah(Number(value) || 0);
        break;
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKategori || !formKeterangan || formJumlah <= 0) return;
    setSubmitting(true);
    try {
      await addCashflowManual({
        Tipe: formTipe,
        Kategori: formKategori,
        Keterangan: formKeterangan,
        Jumlah: formJumlah,
      });
      setShowModal(false);
      // Re-fetch with current filters
      await fetchData(startDate, endDate);
    } catch (err) {
      console.error('Gagal menambah cashflow:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Render ----
  return (
    <div className="admin-main">
      {/* Header */}
      <div className="admin-topbar">
        <h1>Cashflow</h1>
      </div>

      {/* Filter Bar */}
      <div className="page-header">
        <div className="page-header-actions">
          <div className="form-group" style={{ marginBottom: 0, minWidth: '140px' }}>
            <label htmlFor="cf-start">Dari Tanggal</label>
            <input
              id="cf-start"
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '140px' }}>
            <label htmlFor="cf-end">Sampai Tanggal</label>
            <input
              id="cf-end"
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '140px' }}>
            <label htmlFor="cf-tipe">Tipe</label>
            <select
              id="cf-tipe"
              className="form-control"
              value={filterTipe}
              onChange={(e) => setFilterTipe(e.target.value)}
            >
              <option value="Semua">Semua</option>
              <option value="Pemasukan">Pemasukan</option>
              <option value="Pengeluaran">Pengeluaran</option>
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleFilter}
            disabled={fetching}
          >
            {fetching ? 'Memuat...' : 'Filter'}
          </button>
          <button
            className="btn btn-outline"
            onClick={openModal}
          >
            + Tambah Manual
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Memuat data cashflow...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Summary Cards */}
          <div className="cf-summary">
            <div className="cf-card cf-in">
              <p>Total Pemasukan</p>
              <p style={{ color: 'var(--success)' }}>
                {formatCurrency(totalPemasukan)}
              </p>
            </div>
            <div className="cf-card cf-out">
              <p>Total Pengeluaran</p>
              <p style={{ color: 'var(--danger)' }}>
                {formatCurrency(totalPengeluaran)}
              </p>
            </div>
            <div className="cf-card cf-laba-rugi">
              <p>Analisa Laba/Rugi</p>
              <p style={{ color: isProfit ? 'var(--success)' : 'var(--danger)' }}>
                {isProfit ? 'Laba' : 'Rugi'} {formatCurrency(Math.abs(netAmount))}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', fontWeight: 600, color: isProfit ? 'var(--success)' : 'var(--danger)' }}>
                ({isProfit ? '+' : '-'}{marginPct}%)
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tanggal</th>
                  <th>Tipe</th>
                  <th>Kategori</th>
                  <th>Keterangan</th>
                  <th>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      Belum ada data cashflow.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => {
                    const isPemasukan = item.Tipe === 'Pemasukan';
                    const jumlahColor = isPemasukan ? '#10b981' : '#ef4444';
                    return (
                      <tr key={item.ID}>
                        <td>{item.ID}</td>
                        <td style={{ color: 'var(--text-gray)' }}>
                          {item.Tanggal ? formatDate(item.Tanggal) : '-'}
                        </td>
                        <td>
                          <span
                            className={`badge ${isPemasukan ? 'badge-selesai' : 'badge-batal'}`}
                          >
                            {item.Tipe}
                          </span>
                        </td>
                        <td>{item.Kategori || '-'}</td>
                        <td style={{ maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {item.Keterangan || '-'}
                        </td>
                        <td style={{ fontWeight: 700, color: jumlahColor }}>
                          {formatCurrency(Number(item.Jumlah) || 0)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ---- Tambah Manual Modal ---- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Tambah Manual</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleModalSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="cf-tipe-modal">Tipe</label>
                  <select
                    id="cf-tipe-modal"
                    name="Tipe"
                    className="form-control"
                    value={formTipe}
                    onChange={handleModalChange}
                    required
                  >
                    <option value="Pemasukan">Pemasukan</option>
                    <option value="Pengeluaran">Pengeluaran</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="cf-kategori">Kategori</label>
                  <input
                    id="cf-kategori"
                    type="text"
                    name="Kategori"
                    className="form-control"
                    value={formKategori}
                    onChange={handleModalChange}
                    placeholder="Misal: Penjualan, Operasional, dll"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cf-keterangan">Keterangan</label>
                  <input
                    id="cf-keterangan"
                    type="text"
                    name="Keterangan"
                    className="form-control"
                    value={formKeterangan}
                    onChange={handleModalChange}
                    placeholder="Deskripsi transaksi"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cf-jumlah">Jumlah (Rp)</label>
                  <input
                    id="cf-jumlah"
                    type="number"
                    name="Jumlah"
                    className="form-control"
                    min={1}
                    value={formJumlah || ''}
                    onChange={handleModalChange}
                    placeholder="0"
                    required
                  />
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
                    !formKategori ||
                    !formKeterangan ||
                    formJumlah <= 0
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

export default Cashflow;
