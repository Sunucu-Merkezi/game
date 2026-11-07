'use client';
import { Award, Bell, Box, Building2, Cable, ChevronsRight, FlaskConical, Gauge, LogOut, Menu, Settings, ShoppingCart, Siren, Swords, Users, UserCog, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { Logo, LoadingScreen } from '@/components/brand';
import { Badge, Button, Modal, cn } from '@/components/ui/primitives';
import { useAct, useCatalog, useGame } from '@/hooks/use-game';
import { apiFetch } from '@/lib/api-client';
import { fmtDec, fmtGameTime, fmtTL } from '@/lib/format';
import { useUi } from '@/stores/ui-store';

const NAV = [
  { href: '/dashboard', label: 'Ana Panel', icon: Gauge },
  { href: '/datacenter', label: 'Veri Merkezi', icon: Building2 },
  { href: '/3d', label: '3D Veri Merkezi', icon: Box },
  { href: '/store', label: 'Donanım Mağazası', icon: ShoppingCart },
  { href: '/customers', label: 'Müşteriler', icon: Users },
  { href: '/economy', label: 'Ekonomi', icon: Wallet },
  { href: '/staff', label: 'Personel', icon: UserCog },
  { href: '/events', label: 'Olaylar', icon: Siren },
  { href: '/network', label: 'Network', icon: Cable },
  { href: '/research', label: 'Araştırma', icon: FlaskConical },
  { href: '/competitors', label: 'Rakipler', icon: Swords },
  { href: '/quests', label: 'Görevler', icon: Award },
  { href: '/settings', label: 'Ayarlar', icon: Settings },
] as const;

export function GameShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: g } = useGame();
  const cat = useCatalog();
  const act = useAct();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [offlineSeen, setOfflineSeen] = useState(false);
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismissToast);

  if (!g || !cat) return <LoadingScreen text="Veri merkezi başlatılıyor…" />;
  const s = g.s;
  const lvl = cat.LEVELS[s.level - 1];
  const net = g.d.incHr - g.d.expHr;
  const readyQuests = Object.values(s.quests).filter((x) => x === 'ready').length;
  const badges: Record<string, number> = { '/events': s.events.length, '/customers': s.offers.length, '/quests': readyQuests };

  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[236px_1fr]">
      <aside className={cn('fixed inset-y-0 left-0 z-40 w-[236px] border-r border-line bg-bg/95 p-4 backdrop-blur transition-transform lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="mb-6 px-1"><Logo /></div>
        <nav className="space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            const n = badges[href];
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition', active ? 'bg-neon/15 text-white shadow-neon' : 'text-slate-400 hover:bg-panel2 hover:text-white')}>
                <Icon size={16} className={active ? 'text-neonSoft' : ''} />
                <span className="flex-1">{label}</span>
                {n ? <span className="rounded-full bg-neon px-1.5 text-[10px] font-semibold text-white">{n}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-4 bottom-4 rounded-lg border border-line bg-panel p-3 text-xs">
          <div className="text-slate-400">{s.company}</div>
          <div className="mt-0.5 font-medium text-white">{lvl.name}</div>
          <div className="mt-0.5 text-slate-500">Seviye {s.level} / {cat.LEVELS.length}</div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-bg/85 px-4 py-2.5 backdrop-blur">
          <button className="lg:hidden" onClick={() => setOpen(!open)} aria-label="Menü"><Menu size={20} /></button>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Bakiye</div>
            <div className={cn('num text-lg font-semibold', s.money < 0 ? 'text-bad' : 'text-white')}>{fmtTL(s.money)}</div>
          </div>
          <div className="hidden sm:block">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Net / saat</div>
            <div className={cn('num text-sm font-medium', net >= 0 ? 'text-ok' : 'text-bad')}>{net >= 0 ? '+' : ''}{fmtTL(net)}</div>
          </div>
          <div className="hidden md:block">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">İtibar</div>
            <div className="num text-sm font-medium text-white">{fmtDec(s.rep)}</div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="num hidden text-xs text-slate-400 sm:inline">{fmtGameTime(s.t)}</span>
            <div className="flex overflow-hidden rounded-lg border border-line" role="group" aria-label="Zaman hızı">
              {[1, 2, 5, 10].map((sp) => (
                <button key={sp} onClick={() => act({ type: 'setSpeed', speed: sp as 1 | 2 | 5 | 10 })}
                  className={cn('num px-2.5 py-1 text-xs transition', s.speed === sp ? 'bg-neon text-white' : 'bg-panel text-slate-400 hover:text-white')}>{sp}x</button>
              ))}
            </div>
            <div className="relative">
              <button onClick={() => setBell(!bell)} className="relative rounded-lg border border-line bg-panel p-2 text-slate-300 hover:text-white" aria-label="Bildirimler">
                <Bell size={16} />
                {s.events.length > 0 && <span className="pulse-dot absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-bad" />}
              </button>
              {bell && (
                <div className="absolute right-0 mt-2 max-h-96 w-80 overflow-auto rounded-xl border border-line bg-panel p-2 shadow-neon">
                  {s.notifs.length === 0 && <p className="p-3 text-sm text-slate-500">Bildirim yok</p>}
                  {[...s.notifs].reverse().slice(0, 25).map((n) => (
                    <div key={n.id} className="flex gap-2 rounded-lg p-2 text-xs hover:bg-panel2">
                      <Badge tone={n.type === 'good' ? 'ok' : n.type === 'bad' ? 'bad' : n.type === 'warn' ? 'warn' : 'neon'}>{fmtGameTime(n.t).replace('Gün ', 'G')}</Badge>
                      <span className="text-slate-300">{n.msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={logout} className="rounded-lg border border-line bg-panel p-2 text-slate-300 hover:text-white" aria-label="Çıkış"><LogOut size={16} /></button>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] p-4 lg:p-6">{children}</main>
      </div>

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <button key={t.id} onClick={() => dismiss(t.id)}
            className={cn('fade-up pointer-events-auto rounded-lg border bg-panel px-3.5 py-2.5 text-left text-sm shadow-neon', t.type === 'good' && 'border-ok/50', t.type === 'bad' && 'border-bad/50', t.type === 'warn' && 'border-warn/50', t.type === 'info' && 'border-neon/50')}>
            <span className="mb-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neonSoft"><ChevronsRight size={11} />Sunucu Merkezi</span>
            {t.msg}
          </button>
        ))}
      </div>

      {g.offline && !offlineSeen && (
        <Modal title="Çevrimdışıyken neler oldu?" onClose={() => setOfflineSeen(true)}>
          <div className="space-y-2 text-sm text-slate-300">
            <p>Yokluğunda şirketin <b className="text-white">{g.offline.days}</b> oyun günü çalıştı.</p>
            <p>Net bakiye değişimi: <b className={g.offline.money >= 0 ? 'text-ok' : 'text-bad'}>{g.offline.money >= 0 ? '+' : ''}{fmtTL(g.offline.money)}</b></p>
            <p>Çözülen olay: <b className="text-white">{g.offline.events}</b> · Müşteri değişimi: <b className="text-white">{g.offline.customers >= 0 ? '+' : ''}{g.offline.customers}</b></p>
            <p className="text-xs text-slate-500">Çevrimdışı ilerleme sunucuda 1x hızla, en fazla 12 gerçek saat için hesaplanır.</p>
          </div>
          <Button className="mt-4" onClick={() => setOfflineSeen(true)}>Devam et</Button>
        </Modal>
      )}
    </div>
  );
}
