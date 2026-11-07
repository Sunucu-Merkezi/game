'use client';
import { FileSignature, Handshake } from 'lucide-react';
import { useState } from 'react';
import { WithGame } from '@/components/game/with-game';
import { Badge, Bar, Button, Card, Empty, Modal, PageHeader, Table, Td } from '@/components/ui/primitives';
import { useAct } from '@/hooks/use-game';
import type { OfferView } from '@/game-engine/types';
import { fmtDec, fmtDuration, fmtMbps, fmtSize, fmtTL } from '@/lib/format';

const need = (o: OfferView): string =>
  [o.cpu ? `${o.cpu} çekirdek` : '', o.ram ? `${fmtSize(o.ram)} RAM` : '', o.disk ? `${fmtSize(o.disk)} disk` : '', `${fmtMbps(o.net)}`, o.u ? `${o.u}U alan` : '', o.gpu ? `${o.gpu} GPU` : '']
    .filter(Boolean).join(' · ');

export function CustomersView() {
  const act = useAct();
  const [sel, setSel] = useState<string | null>(null);
  const [bid, setBid] = useState(1);
  const [tab, setTab] = useState<'offers' | 'contracts'>('offers');
  return (
    <WithGame>
      {(g, cat) => {
        const { s, d } = g;
        const offer = s.offers.find((o) => o.id === sel);
        return (
          <>
            <PageHeader title="Müşteriler" desc="Teklifleri kapasiteni ve fiyatını düşünerek kabul et; memnuniyet performans, uptime, fiyat ve desteğe bağlıdır." />
            <div className="mb-4 flex gap-2">
              <Button variant={tab === 'offers' ? 'primary' : 'ghost'} onClick={() => setTab('offers')}>Teklifler ({s.offers.length})</Button>
              <Button variant={tab === 'contracts' ? 'primary' : 'ghost'} onClick={() => setTab('contracts')}>Sözleşmeler ({s.contracts.length})</Button>
            </div>

            {tab === 'offers' && (s.offers.length === 0 ? <Card><Empty text="Şu an teklif yok. İtibarını ve kapasiteni artır; pazarlama kampanyası da teklifleri çoğaltır." icon={Handshake} /></Card> : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {s.offers.map((o) => {
                  const mult = o.tender ? 1 : s.prices[o.svc];
                  const left = Math.max(0, o.exp - s.t);
                  return (
                    <Card key={o.id} title={o.name} right={o.tender ? <Badge tone="warn">İhale</Badge> : <Badge>{cat.SERVICES[o.svc].name}</Badge>}>
                      <div className="text-xs text-slate-500">{cat.CUSTOMERS[o.cust].name} · {o.months} ay · kalan {fmtDuration(left)}</div>
                      <div className="mt-2 text-sm text-slate-300">{need(o)}</div>
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <div className="num text-lg font-semibold text-white">{fmtTL(Math.round(o.ref * mult))}<span className="text-xs text-slate-500"> /ay</span></div>
                          <div className="text-xs text-slate-500">Referans {fmtTL(o.ref)} × {mult.toFixed(2)}</div>
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => act({ type: 'declineOffer', id: o.id })}>Reddet</Button>
                          <Button size="sm" onClick={() => { setSel(o.id); setBid(o.tender ? 1 : 1); }}>İncele</Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ))}

            {tab === 'contracts' && (
              <Card title="Aktif sözleşmeler" icon={FileSignature}>
                {s.contracts.length === 0 ? <Empty text="Henüz sözleşmen yok." /> : (
                  <Table head={['Müşteri', 'Hizmet', 'Bina', 'Aylık', 'Memnuniyet', 'Uptime', 'Kalite', 'Bitiş', '']}>
                    {s.contracts.map((c) => (
                      <tr key={c.id}>
                        <Td className="text-white">{c.name}</Td>
                        <Td>{cat.SERVICES[c.svc].name}</Td>
                        <Td>{s.buildings.find((b) => b.id === c.b)?.name}</Td>
                        <Td>{fmtTL(c.price)}</Td>
                        <Td className="w-32"><div className="mb-1 text-xs">%{fmtDec(c.sat)}</div><Bar value={c.sat / 100} tone={c.sat > 60 ? 'ok' : c.sat > 35 ? 'warn' : 'bad'} /></Td>
                        <Td>%{c.up.toFixed(2)}</Td>
                        <Td>%{Math.round((d.q[c.id] ?? 1) * 100)}</Td>
                        <Td>{fmtDuration(c.end - s.t)}</Td>
                        <Td><Button size="sm" variant="danger" onClick={() => act({ type: 'cancelContract', id: c.id })}>Fes</Button></Td>
                      </tr>
                    ))}
                  </Table>
                )}
              </Card>
            )}

            {offer && (
              <Modal title={offer.tender ? `İhale: ${offer.name}` : `Sözleşme: ${offer.name}`} onClose={() => setSel(null)}>
                <p className="text-sm text-slate-300">{need(offer)}</p>
                <p className="mt-1 text-xs text-slate-500">IP ihtiyacı: {offer.ips} · Süre: {offer.months} ay</p>
                {offer.tender && (
                  <div className="mt-3 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm">
                    <div className="text-warn">Rakip teklifi: ×{offer.compMult} ({s.comp.find((c) => c.id === offer.comp)?.name})</div>
                    <label className="mt-2 block text-xs text-slate-400">Teklif çarpanı: <b className="num text-white">×{bid.toFixed(2)}</b> → {fmtTL(Math.round(offer.ref * bid))}/ay
                      <input type="range" min={0.6} max={1.4} step={0.01} value={bid} onChange={(e) => setBid(Number(e.target.value))} className="mt-1 w-full accent-blue-500" />
                    </label>
                    <p className="text-xs text-slate-500">Düşük teklif kazanma şansını artırır; itibarın da etkili.</p>
                  </div>
                )}
                <div className="mt-4 text-sm text-slate-400">Hangi veri merkezinde barındırılsın?</div>
                <div className="mt-2 space-y-2">
                  {s.buildings.map((b) => {
                    const bd = d.b[b.id];
                    const fits = offer.cpu <= bd.nom.cpu - bd.used.cpu && offer.ram <= bd.nom.ram - bd.used.ram && offer.disk <= bd.nom.disk - bd.used.disk
                      && offer.gpu <= bd.nom.gpu - bd.used.gpu && offer.net <= bd.bw - bd.used.net && offer.u <= bd.freeU && offer.ips <= bd.ipFree;
                    return (
                      <button key={b.id} onClick={() => { act({ type: 'acceptOffer', id: offer.id, b: b.id, bid: offer.tender ? bid : undefined }); setSel(null); }}
                        className="flex w-full items-center justify-between rounded-lg border border-line bg-panel2 px-3 py-2 text-left text-sm transition hover:border-neon">
                        <span>{b.name}<span className="block text-xs text-slate-500">Gecikme {Math.round(bd.lat)} ms · IP boş {bd.ipFree}</span></span>
                        {fits ? <Badge tone="ok">Kapasite yeterli</Badge> : <Badge tone="bad">Yetersiz</Badge>}
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
