'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { WithGame } from '@/components/game/with-game';
import { Button, Card, Empty, PageHeader, Table, Td } from '@/components/ui/primitives';
import { GAME_KEY } from '@/hooks/use-game';
import { apiFetch } from '@/lib/api-client';
import { fmtNum, fmtTL } from '@/lib/format';
import { useUi } from '@/stores/ui-store';

interface LedgerPage { items: { id: number; gameTime: number; amount: number; note: string; balanceAfter: number }[]; total: number; page: number; pageSize: number }

export function SettingsView() {
  const qc = useQueryClient();
  const toast = useUi((s) => s.pushToast);
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState('');
  const ledger = useQuery({ queryKey: ['ledger', page], queryFn: () => apiFetch<LedgerPage>(`/game/ledger?page=${page}&pageSize=15`), refetchInterval: 8000 });

  async function reset() {
    try {
      await apiFetch('/game/reset', { method: 'POST', body: JSON.stringify({ confirm: 'SIFIRLA' }) });
      setConfirm('');
      await qc.invalidateQueries({ queryKey: GAME_KEY });
      await qc.invalidateQueries({ queryKey: ['ledger'] });
      toast('good', 'Oyun sıfırlandı. Yeni şirketin hazır.');
    } catch (e) {
      toast('bad', e instanceof Error ? e.message : 'Sıfırlanamadı');
    }
  }

  const pages = ledger.data ? Math.max(1, Math.ceil(ledger.data.total / ledger.data.pageSize)) : 1;
  return (
    <WithGame>
      {(g) => (
        <>
          <PageHeader title="Ayarlar" desc={`Oyuncu: ${g.user} · Şirket: ${g.s.company}`} />
          <Card title="İşlem kaydı (sunucu defteri)">
            {!ledger.data || ledger.data.items.length === 0 ? <Empty text="Kayıtlı işlem yok." /> : (
              <>
                <Table head={['#', 'Oyun günü', 'İşlem', 'Tutar', 'Bakiye']}>
                  {ledger.data.items.map((r) => (
                    <tr key={r.id}>
                      <Td>{r.id}</Td><Td>{Math.floor(r.gameTime / 1440) + 1}</Td><Td className="text-slate-200">{r.note}</Td>
                      <Td className={r.amount >= 0 ? 'text-ok' : 'text-bad'}>{r.amount >= 0 ? '+' : ''}{fmtTL(r.amount)}</Td><Td>{fmtTL(r.balanceAfter)}</Td>
                    </tr>
                  ))}
                </Table>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>{fmtNum(ledger.data.total)} kayıt</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Önceki</Button>
                    <span className="num">{page} / {pages}</span>
                    <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Sonraki</Button>
                  </div>
                </div>
              </>
            )}
          </Card>

          <Card title="Oyunu sıfırla" icon={RotateCcw} className="mt-4">
            <p className="text-sm text-slate-300">Bu işlem şirketini, tüm sunucularını ve işlem kaydını kalıcı olarak siler ve yeniden başlatır.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Onay için SIFIRLA yaz" className="rounded-lg border border-line bg-panel2 px-3 py-2 text-sm text-white outline-none focus:border-bad" />
              <Button variant="danger" disabled={confirm !== 'SIFIRLA'} onClick={reset}>Sıfırla</Button>
            </div>
          </Card>
        </>
      )}
    </WithGame>
  );
}
