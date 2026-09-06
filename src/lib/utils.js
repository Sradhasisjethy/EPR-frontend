import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDate as formatDateWithPreferences } from './date-format';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Deprecated: prefer <DateText />, which follows Settings > General.
 *
 * This was pinned to en-US with a short month name, so four screens printed
 * "Sep 6, 2026" whatever the tenant's date format said. Kept as a thin
 * delegate for callers outside a React tree; it uses the default pattern
 * because it has no access to the setting.
 */
export function formatDate(date) {
  return formatDateWithPreferences(date);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Formats a Unit of Measure (UoM) with natural pluralization when quantity > 1 (e.g. 50 bags vs 1 bag),
 * while preserving standard metric symbol abbreviations (e.g. MT, KG, LTR).
 */
export function formatUom(uom, qty = 1) {
  if (!uom) return '';
  const num = Number(qty);
  const code = uom.trim();
  const lower = code.toLowerCase();

  if (num > 1 || num === 0) {
    if (lower === 'bag' || lower === 'bags') return 'bags';
    if (lower === 'box' || lower === 'boxes') return 'boxes';
    if (lower === 'drum' || lower === 'drums') return 'drums';
    if (lower === 'can' || lower === 'cans') return 'cans';
    if (lower === 'roll' || lower === 'rolls') return 'rolls';
    if (lower === 'unit' || lower === 'units') return 'units';
    if (lower === 'piece' || lower === 'pieces') return 'pieces';
    if (lower === 'packet' || lower === 'packets' || lower === 'pkt') return 'packets';
    if (lower === 'bundle' || lower === 'bundles') return 'bundles';
    if (lower === 'barrel' || lower === 'barrels') return 'barrels';
    if (lower === 'bottle' || lower === 'bottles') return 'bottles';
    if (lower === 'nos' || lower === 'no') return 'nos';
  } else {
    if (lower === 'bags' || lower === 'bag') return 'bag';
    if (lower === 'boxes' || lower === 'box') return 'box';
    if (lower === 'drums' || lower === 'drum') return 'drum';
    if (lower === 'cans' || lower === 'can') return 'can';
    if (lower === 'rolls' || lower === 'roll') return 'roll';
    if (lower === 'units' || lower === 'unit') return 'unit';
    if (lower === 'pieces' || lower === 'piece') return 'piece';
    if (lower === 'packets' || lower === 'packet') return 'packet';
    if (lower === 'bundles' || lower === 'bundle') return 'bundle';
    if (lower === 'barrels' || lower === 'barrel') return 'barrel';
    if (lower === 'bottles' || lower === 'bottle') return 'bottle';
  }

  return code;
}

