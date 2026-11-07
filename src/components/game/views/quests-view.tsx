'use client';
import { Award, Check, Gift } from 'lucide-react';
import { WithGame } from '@/components/game/with-game';
import { Badge, Button, Card, PageHeader, cn } from '@/components/ui/primitives';
import { useAct } from '@/hooks/use-game';
import { fmtTL } from '@/lib/format';

export function QuestsView() {
  const act = useAct();
  return (
    <WithGame>
      {(g, cat) => {
        const { s } = g;
        const done = cat.QUESTS.filter((q) => s.quests[q.id]).length;
        return (
          <>
            <PageHeader title="Görevler ve Başarımlar" desc={`${done} / ${cat.QUESTS.length} tamamlandı. Görevler para ve itibar ödülü verir.`} />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {cat.QUESTS.map((q) => {
                const st = s.quests[q.id];
                return (
                  <Card key={q.id} className={cn(st === 'claimed' && 'opacity-60')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-white"><Award size={15} className={st ? 'text-ok' : 'text-slate-500'} />{q.name}</div>
                      {st === 'claimed' ? <Badge tone="ok"><Check size={11} className="mr-1" />Alındı</Badge> : st === 'ready' ? <Badge tone="warn">Hazır</Badge> : <Badge tone="mute">Sürüyor</Badge>}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">Ödül: {fmtTL(q.reward.money, true)}{q.reward.rep ? ` + ${q.reward.rep} itibar` : ''}</div>
                    {st === 'ready' && <Button size="sm" variant="ok" className="mt-3 w-full" onClick={() => act({ type: 'claimQuest', id: q.id })}><Gift size={12} className="mr-1 inline" />Ödülü al</Button>}
                  </Card>
                );
              })}
            </div>
            <Card title="Şirket seviyeleri" className="mt-4">
              <div className="space-y-2">
                {cat.LEVELS.map((l) => (
                  <div key={l.n} className={cn('rounded-lg border px-3 py-2 text-sm', s.level >= l.n ? 'border-ok/40 bg-ok/10' : 'border-line bg-panel2')}>
                    <div className="flex justify-between"><span className="text-white">{l.n}. {l.name}</span><span className="num text-xs text-slate-400">{fmtTL(l.rev, true)} toplam gelir</span></div>
                    <div className="text-xs text-slate-500">{l.unlock}</div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        );
      }}
    </WithGame>
  );
}
