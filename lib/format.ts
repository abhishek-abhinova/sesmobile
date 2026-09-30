/** INR currency + general formatting helpers. Pure functions, safe on client & server. */

const DEFAULT_LOCALE = 'en-IN';

export function formatCurrency(
  value: number | string | null | undefined,
  options: { symbol?: string; decimals?: boolean; locale?: string } = {},
): string {
  const { symbol = '₹', decimals = true, locale = DEFAULT_LOCALE } = options;
  if (value === null || value === undefined || value === '') return '—';

  const num = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (!Number.isFinite(num)) return '—';

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals ? 0 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(num);

  return `${symbol}${formatted}`;
}

/** Compact form for dense admin tables: 1,29,999 -> 1.3L */
export function formatCurrencyCompact(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? Number.parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(num)) return '—';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num}`;
}

export function formatNumber(value: number | null | undefined, locale = DEFAULT_LOCALE): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0';
  return new Intl.NumberFormat(locale).format(value);
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0';
  return new Intl.NumberFormat(DEFAULT_LOCALE, { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

export function formatPercent(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

export function calculateDiscountPercent(mrp: number | null, selling: number | null): number {
  if (!mrp || !selling || mrp <= 0 || selling >= mrp) return 0;
  return Math.round(((mrp - selling) / mrp) * 100);
}

export function formatDate(
  value: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, opts).format(date);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  return formatDate(value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['minute', 60],
    ['hour', 3600],
    ['day', 86400],
    ['week', 604800],
    ['month', 2592000],
    ['year', 31536000],
  ];
  const rtf = new Intl.RelativeTimeFormat(DEFAULT_LOCALE, { numeric: 'auto' });
  let chosen: Intl.RelativeTimeFormatUnit = 'minute';
  let divisor = 60;
  for (const [unit, secs] of units) {
    if (seconds >= secs) {
      chosen = unit;
      divisor = secs;
    }
  }
  return rtf.format(-Math.floor(seconds / divisor), chosen);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith('91')) {
    return `${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

export function toPaislessNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

export function truncate(text: string, max = 120): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function initials(name: string | null | undefined): string {
  if (!name) return 'S';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
