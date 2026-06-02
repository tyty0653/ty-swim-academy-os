import { statusLabels, statusTones } from './osConstants.js';
import { cn } from './osUtils.js';

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-sky-600 text-white hover:bg-sky-700 disabled:bg-sky-300',
    soft: 'border border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100',
    ghost: 'border border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:text-sky-700',
    danger: 'border border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100',
    dark: 'bg-slate-950 text-white hover:bg-slate-800',
  };
  return (
    <button {...props} className={cn('inline-flex min-h-10 max-w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-center text-sm font-semibold whitespace-normal disabled:cursor-not-allowed disabled:opacity-60', styles[variant], className)}>
      {children}
    </button>
  );
}

export function Input({ className = '', ...props }) {
  return <input {...props} className={cn('min-h-10 w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100', className)} />;
}

export function Select({ className = '', children, ...props }) {
  return <select {...props} className={cn('min-h-10 w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100', className)}>{children}</select>;
}

export function Textarea({ className = '', ...props }) {
  return <textarea {...props} className={cn('min-h-24 w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100', className)} />;
}

export function Field({ label, children }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export function Card({ title, value, note, tone = 'sky' }) {
  const tones = {
    sky: 'border-sky-100 bg-sky-50 text-sky-700',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    rose: 'border-rose-100 bg-rose-50 text-rose-700',
    slate: 'border-slate-200 bg-white text-slate-600',
  };
  return (
    <div className={cn('rounded-lg border p-4 shadow-sm', tones[tone])}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      {note ? <p className="mt-2 text-xs leading-5 opacity-80">{note}</p> : null}
    </div>
  );
}

export function StatusBadge({ value, children }) {
  const tone = statusTones[value] || 'slate';
  const styles = {
    sky: 'bg-sky-50 text-sky-700 ring-sky-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  };
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', styles[tone])}>{children || statusLabels[value] || value || '-'}</span>;
}

export function Section({ title, action, children, className = '' }) {
  return (
    <section className={cn('min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm', className)}>
      <div className="flex min-w-0 flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="min-w-0 text-lg font-semibold text-slate-950">{title}</h2>
        {action ? <div className="min-w-0 max-w-full">{action}</div> : null}
      </div>
      <div className="min-w-0 p-4">{children}</div>
    </section>
  );
}

export function DataTable({ columns, rows, empty = 'No records yet.', onRowClick, className = '' }) {
  return (
    <div className={cn('max-w-full overflow-x-auto rounded-lg border border-slate-200', className)}>
      <table className="w-full min-w-0 table-fixed text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>{columns.map((column) => <th key={column.key} className="break-words px-3 py-3 sm:whitespace-nowrap">{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={columns.length}>{empty}</td></tr>
          ) : rows.map((row) => (
            <tr key={row.id || row.key} className={cn('border-t border-slate-100 bg-white', onRowClick && 'cursor-pointer hover:bg-sky-50/60')} onClick={() => onRowClick?.(row)}>
              {columns.map((column) => <td key={column.key} className="break-words px-3 py-3 align-top text-slate-700 sm:whitespace-nowrap">{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4">
      <div className={cn('max-h-[90vh] w-full overflow-auto rounded-xl bg-white shadow-2xl', wide ? 'max-w-6xl' : 'max-w-2xl')}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function Toasts({ toasts }) {
  return (
    <div className="fixed right-4 top-4 z-[90] grid gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="rounded-lg border border-sky-100 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-xl shadow-sky-100">
          {toast.message}
        </div>
      ))}
    </div>
  );
}

export function EmptySetup() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16 text-slate-700">
      <div className="mx-auto max-w-2xl rounded-xl border border-sky-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-sky-700">TY Swim Academy OS</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Supabase setup required</h1>
        <p className="mt-3 leading-7">To use the internal OS, add these environment variables and run the SQL setup in the documentation.</p>
        <div className="mt-5 rounded-lg bg-slate-950 p-4 text-sm text-slate-100">
          <p>VITE_SUPABASE_URL=your-project-url</p>
          <p>VITE_SUPABASE_ANON_KEY=your-anon-key</p>
        </div>
        <a className="mt-5 inline-flex font-semibold text-sky-700 hover:text-sky-900" href="/login">Back to login</a>
      </div>
    </div>
  );
}
