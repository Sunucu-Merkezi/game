'use client';
import { Building2, Layers, Plus, Trash2 } from 'lucide-react';
import { BuildingPicker, selectBuilding } from '@/components/game/building-picker';
import { WithGame } from '@/components/game/with-game';
import { Badge, Bar, Button, Card, Empty, PageHeader } from '@/components/ui/primitives';
import { useAct } from '@/hooks/use-game';
import { fmtDec, fmtTL } from '@/lib/format';
import { useUi } from '@/stores/ui-store';

export function DatacenterView() {
  const act = useAct();
  const selId = useUi((s) => s.buildingId);
  return (
    <WithGame>
      {(g, cat) => {
        const { s, d } = g;
        const b = selectBuilding(s.buildings, selId);
        const bd = d.b[b.id];
        const city = cat.CITIES[b.city];
        const maxRoom = Math.min(cat.ROOM_MAX, 1 + b.floors);
        const racks = s.racks.filter((r) => r.b === b.id);
        const rackCap = 4 * b.rooms.server;
        return (
          <>
            <PageHeader title="Veri Merkezi" desc="Odaları genişlet, rack’leri yönet, yeni katlar ve binalar aç." />
            <BuildingPicker buildings={s.buildings} cat={cat} />

            <Card title={`${b.name} — ${city.name}`} icon={Building2} right={<Badge>{b.floors} kat</Badge>}>
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <Info label="Sıcaklık" value={`${fmtDec(bd.temp)} °C`} tone={bd.temp > 35 ? 'text-warn' : 'text-ok'} />
                <Info label="Güç kullanımı" value={`${fmtDec(bd.totKw)} / ${fmtDec(bd.powerCap)} kW`} tone={bd.totKw > bd.powerCap ? 'text-bad' : 'text-white'} />
                <Info label="Boş U alanı" value={`${bd.freeU} / ${bd.totU} U`} />
                <Info label="Kullanılabilirlik" value={`%${fmtDec(bd.avail * 100)}`} />
              </div>
              {bd.totKw > bd.powerCap && <p className="mt-3 text-xs text-bad">Güç kapasitesi aşıldı: sunucular yavaşlıyor. PDU veya trafo ekle.</p>}
              {bd.throttle < 1 && <p className="mt-1 text-xs text-warn">Aşırı ısınma nedeniyle işlemciler %{Math.round((1 - bd.throttle) * 100)} kısılıyor. Soğutma ekle.</p>}
            </Card>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card title="Odalar" icon={Layers} right={
                <Button size="sm" variant="ghost" disabled={b.floors >= 5} onClick={() => act({ type: 'addFloor', b: b.id })}>
                  <Plus size={12} className="mr-1 inline" />Kat aç ({fmtTL(Math.round(cat.FLOOR_COST * Math.pow(1.6, b.floors - 1)), true)})
                </Button>}>
                <div className="space-y-2">
                  {Object.entries(cat.ROOMS).map(([k, r]) => {
                    const lv = b.rooms[k];
                    const cost = Math.round(r.cost * Math.pow(1.9, lv));
                    return (
                      <div key={k} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel2 px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white">{r.name} <span className="text-xs text-slate-500">Sv. {lv}/{maxRoom}</span></div>
                          <div className="truncate text-xs text-slate-500">{r.desc}</div>
                        </div>
                        <Button size="sm" disabled={lv >= maxRoom} onClick={() => act({ type: 'buildRoom', b: b.id, room: k })}>
                          {lv === 0 ? 'İnşa et' : 'Yükselt'} · {fmtTL(cost, true)}
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-slate-500">Maksimum oda seviyesi kat sayısına bağlıdır (kat + 1, en çok {cat.ROOM_MAX}).</p>
              </Card>

              <Card title="Kurulu altyapı" icon={Building2}>
                {Object.keys(b.infra).length === 0 ? <Empty text="Henüz ekipman yok. Mağazadan satın al." /> : (
                  <div className="space-y-2">
                    {Object.entries(b.infra).map(([k, n]) => (
                      <div key={k} className="flex items-center justify-between rounded-lg border border-line bg-panel2 px-3 py-2 text-sm">
                        <div><span className="text-white">{cat.INFRA[k].name}</span> <span className="text-slate-500">× {n}</span><div className="text-xs text-slate-500">{cat.INFRA[k].desc}</div></div>
                        <Button size="sm" variant="danger" onClick={() => act({ type: 'sellInfra', b: b.id, item: k })}><Trash2 size={12} /></Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
                  {(['power', 'cooling', 'network'] as const).map((r) => (
                    <div key={r}>
                      <div className="mb-1">{cat.ROOMS[r].name}</div>
                      <Bar value={bd.slots.cap[r] ? (bd.slots.used[r] || 0) / bd.slots.cap[r] : 0} tone="neon" />
                      <div className="num mt-0.5">{bd.slots.used[r] || 0} / {bd.slots.cap[r]} yuva</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card title={`Rack’ler (${racks.length} / ${rackCap})`} className="mt-4" right={
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(cat.RACKS).map(([k, r]) => (
                  <Button key={k} size="sm" variant="ghost" disabled={racks.length >= rackCap} onClick={() => act({ type: 'buyRack', b: b.id, rack: k })}>
                    {r.name} · {fmtTL(r.price, true)}
                  </Button>
                ))}
              </div>}>
              {racks.length === 0 ? <Empty text={rackCap ? 'Bu binada rack yok. Yukarıdan satın al.' : 'Önce Sunucu Odası inşa et.'} /> : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {racks.map((r, i) => {
                    const srv = s.servers.filter((v) => v.rack === r.id);
                    const used = srv.reduce((a, v) => a + cat.SERVERS[v.type].u, 0);
                    return (
                      <div key={r.id} className="rounded-lg border border-line bg-panel2 p-3">
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium text-white">Rack {i + 1} <span className="text-xs text-slate-500">{cat.RACKS[r.type].name}</span></span>
                          <span className="num text-xs text-slate-400">{used}/{r.u} U</span>
                        </div>
                        <Bar value={used / r.u} />
                        <div className="mt-2 space-y-1">
                          {srv.map((v) => (
                            <div key={v.id} className="flex items-center justify-between rounded border border-line/70 bg-bg/60 px-2 py-1 text-xs">
                              <span className="text-slate-200">{cat.SERVERS[v.type].name} <span className="text-slate-500">{cat.SERVERS[v.type].u}U</span></span>
                              <span className="flex items-center gap-1.5">
                                {!v.ok ? <Badge tone="bad">Arızalı</Badge> : v.hot ? <Badge tone="warn">Isınıyor</Badge> : v.dm ? <Badge tone="warn">Disk</Badge> : <Badge tone="ok">Çalışıyor</Badge>}
                                <button className="text-slate-500 hover:text-bad" aria-label="Sat" onClick={() => act({ type: 'sellServer', id: v.id })}><Trash2 size={12} /></button>
                              </span>
                            </div>
                          ))}
                          {srv.length === 0 && <div className="py-2 text-center text-xs text-slate-500">Boş rack</div>}
                        </div>
                        {srv.length === 0 && <Button size="sm" variant="danger" className="mt-2 w-full" onClick={() => act({ type: 'sellRack', id: r.id })}>Rack’i sat</Button>}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card title="Yeni veri merkezi aç" className="mt-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Object.entries(cat.CITIES).map(([k, c]) => {
                  const has = s.buildings.some((x) => x.city === k);
                  const locked = s.level < c.unlock;
                  return (
                    <div key={k} className="rounded-lg border border-line bg-panel2 p-3 text-sm">
                      <div className="flex items-center justify-between"><span className="font-medium text-white">{c.name}</span>{has ? <Badge tone="ok">Açık</Badge> : locked ? <Badge tone="mute">Seviye {c.unlock}</Badge> : null}</div>
                      <div className="mt-1 space-y-0.5 text-xs text-slate-400">
                        <div>Kira {fmtTL(c.rent)}/ay · Elektrik ×{c.power}</div>
                        <div>Talep ×{c.demand} · Gecikme tabanı {c.lat} ms</div>
                      </div>
                      <Button size="sm" className="mt-2 w-full" disabled={has || locked} onClick={() => act({ type: 'buyBuilding', city: k })}>{fmtTL(c.build, true)} ile aç</Button>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        );
      }}
    </WithGame>
  );
}

function Info({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`num mt-0.5 text-base font-medium ${tone}`}>{value}</div>
    </div>
  );
}
