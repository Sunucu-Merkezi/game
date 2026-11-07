import { Server } from 'lucide-react';

/** Sunucu Merkezi marka logosu — giriş, yükleme ve panel genelinde aynı kimlik */
export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const big = size === 'lg';
  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex items-center justify-center rounded-lg bg-neon/20 shadow-neon ${big ? 'h-12 w-12' : 'h-8 w-8'}`}>
        <Server size={big ? 26 : 17} className="text-neonSoft" />
      </div>
      <div className="leading-tight">
        <div className={`font-semibold tracking-tight text-white ${big ? 'text-2xl' : 'text-[15px]'}`}>Sunucu Merkezi</div>
        <div className={`uppercase tracking-[.2em] text-neonSoft/70 ${big ? 'text-[11px]' : 'text-[9px]'}`}>Veri Merkezi Simülasyonu</div>
      </div>
    </div>
  );
}

export function LoadingScreen({ text = 'Yükleniyor…' }: { text?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <Logo size="lg" />
      <div className="h-1 w-48 overflow-hidden rounded-full bg-line">
        <div className="skeleton h-full w-full" />
      </div>
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}
