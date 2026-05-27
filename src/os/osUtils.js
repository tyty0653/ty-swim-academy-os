import { packageValidityMonths } from './osConstants.js';

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addMonths(dateText, months) {
  if (!dateText || !months) return '';
  const date = new Date(`${dateText}T00:00:00`);
  date.setMonth(date.getMonth() + Number(months));
  return date.toISOString().slice(0, 10);
}

export function derivePackageExpiry(pkg) {
  const months = Number(pkg.validity_months || packageValidityMonths[pkg.package_type] || 0);
  return addMonths(pkg.payment_date || pkg.start_date, months);
}

export function formatMoney(value) {
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

export function last4Phone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.slice(-4) || '0000';
}

export function placeholder(prefix, phone) {
  return `${prefix} ${last4Phone(phone)}`;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field);
      if (row.some((item) => item.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((item) => item.trim() !== '')) rows.push(row);
  const headers = rows.shift()?.map((header) => header.trim()) || [];
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() || ''])));
}

export function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function getMapped(row, names) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== '') return row[name];
  }
  return '';
}
