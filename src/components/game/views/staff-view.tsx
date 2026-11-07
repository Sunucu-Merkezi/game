'use client';
import { GraduationCap, TrendingUp, UserMinus, UserPlus } from 'lucide-react';
import { WithGame } from '@/components/game/with-game';
import { Badge, Bar, Button, Card, Empty, PageHeader } from '@/components/ui/primitives';
import { useAct } from '@/hooks/use-game';
import { fmtDec, fmtTL } from '@/lib/format';

export function StaffView() {
  const act = useAct();
  return (
    <WithGame>
      {(g, cat) => {
        const { s, d } = g;
        const full = s.staff.length >= d.officeCap;
        return (
          <>
            <PageHeader title="Personel" desc={`Kadro ${s.staff.length} / ${d.officeCap} (Ofis odası kapasiteyi artırır). Aylık maaş toplamı ${fmtTL(d.st.salary)}.`} />
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs text-slate-400">
              <Card><div>Destek kapasitesi</div><div className="num mt-1 text-lg text-white">%{Math.round(d.supScore * 100)}</div><div>{s.contracts.length} müşteri</div></Card>
              <Card><div>Arıza azaltma</div><div className="num mt-1 text-lg text-white">%{Math.round((1 - d.eff.failMult) * 100)}</div></Card>
              <Card><div>Gider indirimi</div><div className="num mt-1 text-lg text-white">%{Math.round(d.eff.opexDisc * 100)}</div></Card>
              <Card><div>Ortalama moral</div><div className="num mt-1 text-lg text-white">{s.staff.length ? fmtDec(d.st.morale) : '-'}</div></Card>
            </div>

            <Card title="Çalışanlar" icon={TrendingUp}>
              {s.staff.length === 0 ? <Empty text="Henüz çalışanın yok. Aşağıdaki adaylardan işe al." /> : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {s.staff.map((p) => (
                    <div key={p.id} className="rounded-lg border border-line bg-panel2 p-3 text-sm">
                      <div className="flex items-center justify-between"><span className="font-medium text-white">{p.name}</span><Badge>{cat.ROLES[p.role].name}</Badge></div>
                      <div className="mt-1 text-xs text-slate-500">{cat.ROLES[p.role].desc}</div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-400">
                        <div>Deneyim<br /><b className="text-white">{p.exp} yıl</b></div>
                        <div>Yetenek<br /><b className="text-white">{p.skill}</b></div>
                        <div>Maaş<br /><b className="text-white">{fmtTL(p.salary)}</b></div>
                      </div>
                      <div className="mt-2 text-xs text-slate-400">Moral {fmtDec(p.morale)}</div>
                      <Bar value={p.morale / 100} tone={p.morale > 60 ? 'ok' : p.morale > 35 ? 'warn' : 'bad'} />
                      <div className="mt-3 flex gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => act({ type: 'raise', id: p.id })}><TrendingUp size={12} className="mr-1 inline" />Zam</Button>
                        <Button size="sm" variant="ghost" onClick={() => act({ type: 'train', id: p.id })}><GraduationCap size={12} className="mr-1 inline" />Eğit</Button>
                        <Button size="sm" variant="danger" onClick={() => act({ type: 'fire', id: p.id })}><UserMinus size={12} className="mr-1 inline" />Çıkar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="İşe alım adayları" icon={UserPlus} className="mt-4" right={<Button size="sm" variant="ghost" onClick={() => act({ type: 'refreshCandidates' })}>Yeni aday ara · {fmtTL(2000)}</Button>}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {s.candidates.map((c) => {
                  const locked = s.level < cat.ROLES[c.role].lvl;
                  return (
                    <div key={c.id} className="rounded-lg border border-line bg-panel2 p-3 text-sm">
                      <div className="flex items-center justify-between"><span className="font-medium text-white">{c.name}</span><Badge tone="mute">{cat.ROLES[c.role].name}</Badge></div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-400">
                        <div>Deneyim<br /><b className="text-white">{c.exp} yıl</b></div>
                        <div>Yetenek<br /><b className="text-white">{c.skill}</b></div>
                        <div>Maaş/ay<br /><b className="text-white">{fmtTL(c.salary)}</b></div>
                      </div>
                      <Button size="sm" className="mt-3 w-full" disabled={full || locked} onClick={() => act({ type: 'hire', id: c.id })}>{full ? 'Ofis dolu' : 'İşe al (ilk maaş peşin)'}</Button>
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
