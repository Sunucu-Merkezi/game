'use client';
import { Cable, Globe, Network as NetIcon } from 'lucide-react';
import { BuildingPicker, selectBuilding } from '@/components/game/building-picker';
import { WithGame } from '@/components/game/with-game';
import { Badge, Bar, Button, Card, PageHeader } from '@/components/ui/primitives';
import { useAct } from '@/hooks/use-game';
import { fmtDec, fmtMbps, fmtPct, fmtTL } from '@/lib/format';
import { useUi } from '@/stores/ui-store';

export function NetworkView() {
  const act = useAct();
  const selId = useUi((s) => s.buildingId);
  return (
    <WithGame>
      {(g, cat) => {
        const { s, d } = g;
        const b = selectBuilding(s.buildings, selId);
        const bd = d.b[b.id];
        return (
          <>
            <PageHeader title="Network" desc="Transit, IX bağlantıları, IP blokları ve fiber altyapı. Gecikme, trafik ve bant genişliği müşteri memnuniyetini etkiler." />
            <BuildingPicker buildings={s.buildings} cat={cat} />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Card><div className="text-xs text-slate-500">Bant genişliği</div><div className="num mt-1 text-xl text-white">{fmtMbps(bd.bw)}</div><Bar value={bd.bw ? bd.used.net / bd.bw : 0} /><div className="num mt-1 text-xs text-slate-500">Ayrılan {fmtMbps(bd.used.net)} ({fmtPct(bd.bw ? bd.used.net / bd.bw : 0)})</div></Card>
              <Card><div className="text-xs text-slate-500">Gecikme</div><div className="num mt-1 text-xl text-white">{Math.round(bd.lat)} ms</div></Card>
              <Card><div className="text-xs text-slate-500">IP adresi</div><div className="num mt-1 text-xl text-white">{bd.used.ip} / {bd.ipTotal}</div><Bar value={bd.ipTotal ? bd.used.ip / bd.ipTotal : 0} /></Card>
              <Card><div className="text-xs text-slate-500">Saldırı hafifletme</div><div className="num mt-1 text-xl text-white">{fmtPct(bd.mit)}</div><div className="text-xs text-slate-500">firewall + güvenlik</div></Card>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card title={`Bağlantılar (${b.uplinks.length}/6)`} icon={Cable}>
                {b.uplinks.length === 0 && <p className="mb-2 text-sm text-warn">Hiç bağlantı yok: trafik taşınamaz. Bir transit sağlayıcı kirala.</p>}
                <div className="space-y-2">
                  {b.uplinks.map((k, i) => {
                    const u = cat.TRANSIT[k] || cat.IX[k];
                    return (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-line bg-panel2 px-3 py-2 text-sm">
                        <div>{u.name} <Badge tone={cat.IX[k] ? 'ok' : 'neon'}>{cat.IX[k] ? 'IX' : 'Transit'}</Badge><div className="text-xs text-slate-500">{fmtTL(u.cost)}/ay · {u.lat} ms</div></div>
                        <Button size="sm" variant="danger" onClick={() => act({ type: 'dropUplink', b: b.id, idx: i })}>Kapat</Button>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 text-xs uppercase tracking-wider text-slate-500">Yeni bağlantı kirala</div>
                <div className="mt-2 grid gap-2">
                  {[...Object.entries(cat.TRANSIT), ...Object.entries(cat.IX)].map(([k, u]) => (
                    <Button key={k} variant="ghost" disabled={s.level < u.lvl} onClick={() => act({ type: 'buyUplink', b: b.id, k })}>
                      {u.name} — {fmtTL(u.cost)}/ay {s.level < u.lvl ? `(Seviye ${u.lvl})` : ''}
                    </Button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">Kurulumda ilk ay bedeli alınır. IX bağlantıları gecikmeyi düşürür ve önce transit gerektirir. İkinci hat, kesintide kapasitenin %60’ını korur.</p>
              </Card>

              <div className="space-y-4">
                <Card title="IP blokları" icon={Globe}>
                  <div className="space-y-2">
                    {b.ips.map((k, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-line bg-panel2 px-3 py-2 text-sm">
                        <span>{cat.IPBLOCKS[k].name}<span className="ml-2 text-xs text-slate-500">{fmtTL(cat.IPBLOCKS[k].cost)}/ay</span></span>
                        <Button size="sm" variant="danger" onClick={() => act({ type: 'dropIp', b: b.id, idx: i })}>Bırak</Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {Object.entries(cat.IPBLOCKS).map(([k, ip]) => (
                      <Button key={k} variant="ghost" onClick={() => act({ type: 'buyIp', b: b.id, k })}>{ip.name} · {fmtTL(ip.cost)}</Button>
                    ))}
                  </div>
                </Card>
                <Card title="Fiber altyapı" icon={NetIcon}>
                  <p className="text-sm text-slate-300">Seviye {b.fiber} / 3 — fiber kablo hasarı riskini azaltır, gecikmeyi düşürür.</p>
                  <Button className="mt-3" disabled={b.fiber >= 3} onClick={() => act({ type: 'upgradeFiber', b: b.id })}>
                    {b.fiber >= 3 ? 'Maksimum' : `Yükselt · ${fmtTL(cat.FIBER_COSTS[b.fiber + 1])}`}
                  </Button>
                </Card>
                <Card title="Cihaz kapasitesi">
                  <p className="text-sm text-slate-300">Yerleştirilmiş cihazlar: {fmtDec(bd.bwRaw / 1000)} Gbps hat, {fmtMbps(bd.bw)} etkin. Switch, router, load balancer ve network kartı Donanım Mağazası’ndadır; 3D sayfasında yerleştirmeyi unutma.</p>
                </Card>
              </div>
            </div>
          </>
        );
      }}
    </WithGame>
  );
}
