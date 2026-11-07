'use client';
import { Landmark, Megaphone, Receipt, Tag } from 'lucide-react';
import { useState } from 'react';
import { WithGame } from '@/components/game/with-game';
import { Donut } from '@/components/ui/charts';
import { Badge, Button, Card, Empty, PageHeader, Table, Td } from '@/components/ui/primitives';
import { useAct } from '@/hooks/use-game';
import { fmtGameTime, fmtTL } from '@/lib/format';

const EXP_LABEL: Record<string, string> = {
  elec: 'Elektrik', net: 'İnternet / IP', salary: 'Personel maaşları', hw: 'Donanım bakımı', rent: 'Bina kirası', tax: 'Vergiler', interest: 'Kredi faizi',
};

export function EconomyView() {
  const act = useAct();
  const [amount, setAmount] = useState(50000);
  return (
    <WithGame>
      {(g, cat) => {
        const { s, d } = g;
        const expRows = Object.entries(d.expMo).map(([k, v]) => ({ name: EXP_LABEL[k], value: Math.round(v) }));
        const incRows = Object.entries(d.incSvc).map(([k, v]) => ({ name: cat.SERVICES[k].name, value: Math.round(v * 720) }));
        const mkOn = s.marketing > s.t;
        return (
          <>
            <PageHeader title="Ekonomi" desc="Gelir kaynaklarını, giderleri ve hizmet fiyatlarını yönet." />
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Aylık gelir (hizmete göre)" icon={Receipt}>
                {incRows.length === 0 ? <Empty text="Henüz gelir yok." /> : <Donut data={incRows} />}
                <ul className="mt-2 space-y-1 text-sm">{incRows.map((r) => <li key={r.name} className="flex justify-between"><span className="text-slate-400">{r.name}</span><span className="num">{fmtTL(r.value)}</span></li>)}</ul>
              </Card>
              <Card title="Aylık gider (kategoriye göre)" icon={Receipt}>
                <Donut data={expRows} />
                <ul className="mt-2 space-y-1 text-sm">{expRows.map((r) => <li key={r.name} className="flex justify-between"><span className="text-slate-400">{r.name}</span><span className="num">{fmtTL(r.value)}</span></li>)}</ul>
              </Card>
            </div>

            <Card title="Hizmet fiyatları" icon={Tag} className="mt-4">
              <p className="mb-3 text-xs text-slate-500">Çarpan referans fiyata uygulanır. Pazar fiyat endeksi şu an ×{s.market.idx.toFixed(2)}. Pahalı fiyat teklif sayısını ve memnuniyeti düşürür; ucuz fiyat geliri azaltır.</p>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(cat.SERVICES).map(([k, sv]) => (
                  <PriceSlider key={k} name={sv.name} value={s.prices[k]} locked={k === 'cloud' && !d.mods.cloud} onCommit={(v) => act({ type: 'setPrice', svc: k, mult: v })} />
                ))}
              </div>
            </Card>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card title="Kredi" icon={Landmark}>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Borç</span><span className="num text-white">{fmtTL(s.loan)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Limit (seviyeye bağlı)</span><span className="num">{fmtTL(s.level * 50000)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Faiz</span><span>%2 / ay</span></div>
                  <input type="number" min={1000} step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-white outline-none focus:border-neon" />
                  <div className="flex gap-2">
                    <Button onClick={() => act({ type: 'loan', amount: Math.max(1000, Math.round(amount)) })}>Kredi çek</Button>
                    <Button variant="ghost" disabled={!s.loan} onClick={() => act({ type: 'repay', amount: Math.max(1, Math.round(amount)) })}>Öde</Button>
                  </div>
                </div>
              </Card>
              <Card title="Pazarlama" icon={Megaphone}>
                <p className="text-sm text-slate-300">7 gün boyunca gelen müşteri teklifleri %60 artar.</p>
                <p className="mt-1 text-xs text-slate-500">Maliyet: {fmtTL(8000 * s.level)} (seviyeyle artar)</p>
                <div className="mt-3 flex items-center gap-3">
                  <Button disabled={mkOn} onClick={() => act({ type: 'marketing' })}>Kampanya başlat</Button>
                  {mkOn && <Badge tone="ok">Aktif</Badge>}
                </div>
              </Card>
            </div>

            <Card title="Son işlemler (defter)" className="mt-4">
              {s.tx.length === 0 ? <Empty text="Henüz işlem yok." /> : (
                <Table head={['Zaman', 'İşlem', 'Tutar']}>
                  {[...s.tx].reverse().slice(0, 20).map((t, i) => (
                    <tr key={i}><Td>{fmtGameTime(t.t)}</Td><Td className="text-slate-200">{t.n}</Td><Td className={t.a >= 0 ? 'text-ok' : 'text-bad'}>{t.a >= 0 ? '+' : ''}{fmtTL(t.a)}</Td></tr>
                  ))}
                </Table>
              )}
            </Card>
          </>
        );
      }}
    </WithGame>
  );
}

function PriceSlider({ name, value, locked, onCommit }: { name: string; value: number; locked: boolean; onCommit: (v: number) => void }) {
  const [v, setV] = useState<number | null>(null);
  const shown = v ?? value;
  const commit = () => { if (v !== null) { onCommit(v); setV(null); } };
  return (
    <label className="block text-sm">
      <div className="mb-1 flex justify-between"><span className="text-slate-300">{name}{locked && <span className="ml-2 text-xs text-slate-500">(Cloud araştırması gerekir)</span>}</span><b className="num text-white">×{shown.toFixed(2)}</b></div>
      <input type="range" min={0.5} max={2} step={0.01} value={shown} onChange={(e) => setV(Number(e.target.value))} onPointerUp={commit} onKeyUp={commit} className="w-full accent-blue-500" />
    </label>
  );
}
