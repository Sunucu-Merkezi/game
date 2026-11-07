'use client';
import type { LucideIcon } from 'lucide-react';
import { Inbox, X } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const cn = (...c: (string | false | null | undefined)[]): string => c.filter(Boolean).join(' ');

export function Card({ title, icon: Icon, right, children, className }: { title?: string; icon?: LucideIcon; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-line bg-panel/80 backdrop-blur fade-up', className)}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            {Icon && <Icon size={15} className="text-neonSoft" />}
            {title}
          </h3>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function PageHeader({ title, desc, right }: { title: string; desc?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
        {desc && <p className="mt-1 text-sm text-slate-400">{desc}</p>}
      </div>
      {right}
    </div>
  );
}

type Tone = 'neon' | 'ok' | 'warn' | 'bad' | 'mute';
const toneText: Record<Tone, string> = { neon: 'text-neonSoft', ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', mute: 'text-slate-400' };

export function Stat({ label, value, sub, icon: Icon, tone = 'neon' }: { label: string; value: ReactNode; sub?: ReactNode; icon?: LucideIcon; tone?: Tone }) {
  return (
    <div className="rounded-xl border border-line bg-panel/80 p-4 fade-up">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
        <span>{label}</span>
        {Icon && <Icon size={15} className={toneText[tone]} />}
      </div>
      <div className="num mt-2 text-2xl font-semibold text-white">{value}</div>
      {sub && <div className="num mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Button({ variant = 'primary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'ok'; size?: 'sm' | 'md' }) {
  const v = {
    primary: 'bg-neon/90 text-white hover:bg-neon shadow-neon',
    ghost: 'border border-line bg-panel2 text-slate-200 hover:border-neon/60',
    danger: 'bg-bad/15 text-bad border border-bad/40 hover:bg-bad/25',
    ok: 'bg-ok/15 text-ok border border-ok/40 hover:bg-ok/25',
  }[variant];
  return (
    <button
      {...p}
      className={cn('rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-40', size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm', v, className)}
    />
  );
}

export function Badge({ children, tone = 'neon' }: { children: ReactNode; tone?: Tone }) {
  const bg = { neon: 'bg-neon/15', ok: 'bg-ok/15', warn: 'bg-warn/15', bad: 'bg-bad/15', mute: 'bg-slate-500/15' }[tone];
  return <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium', bg, toneText[tone])}>{children}</span>;
}

export function Bar({ value, tone, label }: { value: number; tone?: Tone; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  const t: Tone = tone ?? (v > 0.9 ? 'bad' : v > 0.75 ? 'warn' : 'neon');
  const bg = { neon: 'bg-neon', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', mute: 'bg-slate-500' }[t];
  return (
    <div title={label}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className={cn('h-full rounded-full transition-all duration-500', bg)} style={{ width: `${v * 100}%` }} />
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-72" />
    </div>
  );
}

export function Empty({ text, icon: Icon = Inbox }: { text: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-slate-500">
      <Icon size={28} className="text-slate-600" />
      {text}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-bad/40 bg-bad/10 p-6 text-center">
      <p className="text-sm text-bad">{message}</p>
      {onRetry && <Button className="mt-3" variant="ghost" onClick={onRetry}>Tekrar dene</Button>}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="fade-up max-h-[85vh] w-full max-w-lg overflow-auto rounded-xl border border-neon/30 bg-panel p-5 shadow-neon" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Kapat"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wider text-slate-500">
            {head.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">{children}</tbody>
      </table>
    </div>
  );
}
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cn('num whitespace-nowrap px-3 py-2', className)}>{children}</td>;
