export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Parse form input value to number (handles comma & dot decimal) */
export function parseFormNumber(val: string): number {
  if (!val || val.trim() === '') return 0;
  // Keep only digits, dots, commas, minus
  let normalized = val.replace(/[^0-9.,-]/g, '');
  // Handle comma as decimal separator (Indonesian "0,5")
  if (normalized.includes(',')) {
    // Replace dots (thousands sep) then convert comma to dot
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes('.')) {
    // Multiple dots = thousands separator, keep only last dot
    const parts = normalized.split('.');
    if (parts.length > 2) {
      normalized = parts.slice(0, -1).join('') + '.' + parts.slice(-1);
    }
  }
  const num = Number(normalized);
  return isNaN(num) ? 0 : num;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Waiting': return '#f59e0b';
    case 'Checking': return '#3b82f6';
    case 'Proses Repair':
    case 'Proses Cleaning':
    case 'Proses Pengeringan': return '#8b5cf6';
    case 'Ready': return '#06b6d4';
    case 'Selesai': return '#10b981';
    case 'Batal': return '#ef4444';
    default: return '#64748b';
  }
}

export function getMonthRange(year: number, month: number): { startDate: string; endDate: string } {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate: start, endDate: end };
}

export function getTodayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}
