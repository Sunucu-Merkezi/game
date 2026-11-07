'use client';
import { Area, AreaChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HistPoint } from '@/game-engine/types';
import { fmtNum } from '@/lib/format';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a78bfa', '#ef4444', '#06b6d4', '#ec4899'];
const tip = { background: '#0c1322', border: '1px solid #1b2a45', borderRadius: 8, fontSize: 12 };

export interface Series { key: keyof HistPoint; name: string; color?: string }

const dayLabel = (t: number): string => `G${Math.floor(t / 1440) + 1} ${String(Math.floor((t % 1440) / 60)).padStart(2, '0')}:00`;

/** Oyun geçmişinden (gerçek simülasyon örnekleri) çizgi/alan grafiği */
export function HistChart({ data, series, area = false, height = 220, unit = '' }: { data: HistPoint[]; series: Series[]; area?: boolean; height?: number; unit?: string }) {
  if (data.length < 2) return <div className="flex h-32 items-center justify-center text-sm text-slate-500">Veri birikiyor…</div>;
  const Chart = area ? AreaChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color ?? COLORS[i]} stopOpacity={0.4} />
              <stop offset="100%" stopColor={s.color ?? COLORS[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="#1b2a45" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="t" tickFormatter={dayLabel} stroke="#475569" fontSize={11} minTickGap={50} />
        <YAxis stroke="#475569" fontSize={11} tickFormatter={(v: number) => fmtNum(v) + unit} width={56} />
        <Tooltip contentStyle={tip} labelFormatter={(t) => dayLabel(Number(t))} formatter={(v) => fmtNum(Number(v)) + unit} />
        {series.map((s, i) =>
          area ? (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color ?? COLORS[i]} fill={`url(#g-${s.key})`} strokeWidth={2} dot={false} isAnimationActive={false} />
          ) : (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color ?? COLORS[i]} strokeWidth={2} dot={false} isAnimationActive={false} />
          ),
        )}
      </Chart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 200 }: { data: { name: string; value: number }[]; height?: number }) {
  const rows = data.filter((d) => d.value > 0);
  if (!rows.length) return <div className="flex h-32 items-center justify-center text-sm text-slate-500">Veri yok</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none" isAnimationActive={false}>
          {rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={tip} formatter={(v) => fmtNum(Number(v))} />
      </PieChart>
    </ResponsiveContainer>
  );
}
export const chartColors = COLORS;
