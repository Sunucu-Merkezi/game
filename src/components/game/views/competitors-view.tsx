'use client';
import { Swords } from 'lucide-react';
import { WithGame } from '@/components/game/with-game';
import { Badge, Bar, Card, PageHeader, Table, Td } from '@/components/ui/primitives';
import { fmtDec, fmtPct, fmtTL } from '@/lib/format';

const STRAT: Record<string, string> = { cheap: 'Ucuz fiyat', quality: 'Kalite odaklı', balanced: 'Dengeli', aggressive: 'Agresif (seni kırar)' };

export function CompetitorsView() {
  return (
    <WithGame>
      {(g) => {
        const { s } = g;
        const avgMine = Object.values(s.prices).reduce((a, x) => a + x, 0) / Object.keys(s.prices).length;
        const rows = [{ name: s.company + ' (sen)', share: s.market.share, price: avgMine, rep: s.rep, servers: s.servers.length, strat: '', me: true }, ...s.comp.map((c) => ({ name: c.name, share: c.share ?? 0, price: c.price, rep: c.rep, servers: c.servers, strat: STRAT[c.strat], me: false }))]
          .sort((a, b) => b.share - a.share);
        return (
          <>
            <PageHeader title="Rakipler" desc="Yapay zekâ rakipler fiyat değiştirir, yatırım yapar ve ihalelere teklif verir." />
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <Card><div className="text-xs text-slate-500">Pazar büyüklüğü (aylık)</div><div className="num mt-1 text-xl text-white">{fmtTL(s.market.total, true)}</div></Card>
              <Card><div className="text-xs text-slate-500">Pazar fiyat endeksi</div><div className="num mt-1 text-xl text-white">×{s.market.idx.toFixed(2)}</div></Card>
              <Card><div className="text-xs text-slate-500">Senin payın</div><div className="num mt-1 text-xl text-neonSoft">{fmtPct(s.market.share, 1)}</div></Card>
            </div>
            <Card title="Pazar sıralaması" icon={Swords}>
              <Table head={['Şirket', 'Pazar payı', 'Fiyat çarpanı', 'İtibar', 'Sunucu', 'Strateji']}>
                {rows.map((r) => (
                  <tr key={r.name} className={r.me ? 'bg-neon/10' : ''}>
                    <Td className="text-white">{r.name}</Td>
                    <Td className="w-48"><div className="mb-1 text-xs">{fmtPct(r.share, 1)}</div><Bar value={r.share * 3} tone={r.me ? 'ok' : 'neon'} /></Td>
                    <Td>×{r.price.toFixed(2)}</Td>
                    <Td>{fmtDec(r.rep)}</Td>
                    <Td>{r.servers}</Td>
                    <Td>{r.strat ? <Badge tone="mute">{r.strat}</Badge> : '-'}</Td>
                  </tr>
                ))}
              </Table>
              <p className="mt-3 text-xs text-slate-500">Rakip fiyatların altında kalırsan teklif sayısı ve ihale şansın artar. Ancak gelir düşer; dengeyi sen kur.</p>
            </Card>
          </>
        );
      }}
    </WithGame>
  );
}
