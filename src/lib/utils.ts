export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
