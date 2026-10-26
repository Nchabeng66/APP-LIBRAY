import { CURRENCY, LOW_STOCK_THRESHOLD } from './constants.js';

export const stripDigits = (value) => value.replace(/\d/g, '');
export const onlyDigits = (value) => value.replace(/\D/g, '');
export const hasNoDigits = (value) => !/\d/.test(value);
export const isDigitsOnly = (value) => /^\d+$/.test(value.trim());

export function isValidIsbn(raw) {
  const digits = raw.replace(/[-\s]/g, '');
  return /^\d{10}(\d{3})?$/.test(digits);
}

export function isValidUrl(raw) {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const isLowStock = (book) => Number(book.quantity) < LOW_STOCK_THRESHOLD;
export const isFree = (book) => !book.price || Number(book.price) <= 0;
export const hasFile = (book) => Boolean(book.filePath);
export const priceLabel = (book) => (isFree(book) ? 'Free' : `${CURRENCY}${book.price}`);

export function isOverdue(entry) {
  return !entry.returnedAt && Boolean(entry.dueDate) && new Date(entry.dueDate) < new Date();
}

export function triggerDownload(book) {
  if (!book.filePath) return;
  const a = document.createElement('a');
  a.href = book.filePath;
  a.download = book.fileName || book.title;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}