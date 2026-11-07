'use client';
import { Cpu, Fan, Network, Plug, Server as ServerIcon } from 'lucide-react';
import { useState } from 'react';
import { BuildingPicker, selectBuilding } from '@/components/game/building-picker';
import { WithGame } from '@/components/game/with-game';
import { Badge, Button, Card, Modal, PageHeader, cn } from '@/components/ui/primitives';
import { useAct } from '@/hooks/use-game';
import { fmtSize, fmtTL, fmtMbps } from '@/lib/format';
import { useUi } from '@/stores/ui-store';

type Tab = 'server' | 'network' | 'power' | 'cooling';
const TABS: { id: Tab; label: string; icon: typeof Cpu }[] = [
  { id: 'server', label: 'Sunucular', icon: ServerIcon },
  { id: 'network', label: 'Network', icon: Network },
  { id: 'power', label: 'Elektrik', icon: Plug },
  { id: 'cooling', label: 'Soğutma', icon: Fan },
];

export function StoreView() {
  const act = useAct();
  const selId = useUi((s) => s.buildingId);
  const [tab, setTab] = useState<Tab>('server');
  const [pick, setPick] = useState<string | null>(null);
  return (
    <WithGame>
      {(g, cat) => {
        const { s, d } = g;
        const b = selectBuilding(s.buildings, selId);
        const bd = d.b[b.id];
        const racks = s.racks.filter((r) => r.b === b.id);
        return (
          <>
            <PageHeader title="Donanım Mağazası" desc="Her ürünün fiyatı, performansı, tüketimi ve arıza ihtimali farklıdır." />
            <BuildingPicker buildings={s.buildings} cat={cat} />
            <div className="mb-4 flex flex-wrap gap-2">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)} className={cn('flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition', tab === id ? 'border-neon bg-neon/15 text-white' : 'border-line bg-panel text-slate-400 hover:text-white')}>
                  <Icon size={14} />{label}
                </button>
              ))}
              <span className="ml-auto self-center text-xs text-slate-500">Hedef: <b className="text-slate-300">{b.name}</b></span>
            </div>

            {tab === 'server' && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(cat.SERVERS).map(([k, t]) => {
                  const locked = s.level < t.lvl;
                  return (
                    <Card key={k} title={t.name} right={locked ? <Badge tone="mute">Seviye {t.lvl}</Badge> : <Badge tone="ok">{t.u}U</Badge>}>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                        <Spec k="CPU" v={`${t.cores} çekirdek`} /><Spec k="RAM" v={fmtSize(t.ram)} />
                        <Spec k="Disk" v={fmtSize(t.disk)} /><Spec k="Ağ" v={fmtMbps(t.net)} />
                        <Spec k="Tüketim" v={`${t.w} W`} />{t.gpu ? <Spec k="GPU" v={`${t.gpu} adet`} /> : <Spec k="Arıza/gün" v={`%${(t.fail * 100).toFixed(2)}`} />}
                        {t.gpu ? <Spec k="Arıza/gün" v={`%${(t.fail * 100).toFixed(2)}`} /> : null}
                      </dl>
                      <Button className="mt-3 w-full" disabled={locked} onClick={() => setPick(k)}>{fmtTL(t.price)} — Satın al</Button>
                    </Card>
                  );
                })}
              </div>
            )}

            {tab !== 'server' && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(cat.INFRA).filter(([, it]) => it.cat === tab).map(([k, it]) => {
                  const locked = s.level < it.lvl;
                  const free = bd.slots.cap[it.room] - (bd.slots.used[it.room] || 0);
                  return (
                    <Card key={k} title={it.name} right={locked ? <Badge tone="mute">Seviye {it.lvl}</Badge> : <Badge>{it.slot} yuva</Badge>}>
                      <p className="text-sm text-slate-300">{it.desc}</p>
                      <p className="mt-1 text-xs text-slate-500">{it.w ? `Tüketim ${it.w} W · ` : ''}{cat.ROOMS[it.room].name}: {free} boş yuva · Kurulu: {b.infra[k] || 0}</p>
                      <Button className="mt-3 w-full" disabled={locked || free < it.slot} onClick={() => act({ type: 'buyInfra', b: b.id, item: k })}>{fmtTL(it.price)} — Satın al</Button>
                    </Card>
                  );
                })}
              </div>
            )}

            {pick && (
              <Modal title={`${cat.SERVERS[pick].name} — hangi rack’e?`} onClose={() => setPick(null)}>
                {racks.length === 0 && <p className="text-sm text-slate-400">Bu binada rack yok. Veri Merkezi sayfasından rack satın al.</p>}
                <div className="space-y-2">
                  {racks.map((r, i) => {
                    const used = s.servers.filter((v) => v.rack === r.id).reduce((a, v) => a + cat.SERVERS[v.type].u, 0);
                    const fits = r.u - used >= cat.SERVERS[pick].u;
                    return (
                      <button key={r.id} disabled={!fits} onClick={() => { act({ type: 'buyServer', server: pick, rack: r.id }); setPick(null); }}
                        className="flex w-full items-center justify-between rounded-lg border border-line bg-panel2 px-3 py-2 text-sm transition enabled:hover:border-neon disabled:opacity-40">
                        <span>Rack {i + 1} · {cat.RACKS[r.type].name}</span>
                        <span className="num text-xs text-slate-400">{r.u - used} U boş</span>
                      </button>
                    );
                  })}
                </div>
              </Modal>
            )}
          </>
        );
      }}
    </WithGame>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (<><dt className="text-slate-500">{k}</dt><dd className="num text-right text-slate-200">{v}</dd></>);
}
