'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import type { Action } from '@/game-engine/action-schema';
import { apiFetch } from '@/lib/api-client';
import type { GameResponse } from '@/modules/game/game-service';
import { useUi } from '@/stores/ui-store';
import type { Catalog } from '@/types/catalog';

export const GAME_KEY = ['game'] as const;

export function useCatalog(): Catalog | undefined {
  return useQuery({ queryKey: ['catalog'], queryFn: () => apiFetch<Catalog>('/catalog'), staleTime: Infinity }).data;
}

/** Oyun durumu: sunucudan her 1,5 saniyede bir çekilir (sunucu zamanı ilerletir). */
export function useGame() {
  const q = useQuery({
    queryKey: GAME_KEY,
    queryFn: () => apiFetch<GameResponse>('/game/state'),
    refetchInterval: 1500,
    refetchIntervalInBackground: false,
  });
  const pushToast = useUi((s) => s.pushToast);
  const lastId = useUi((s) => s.lastNotifId);
  const setLast = useUi((s) => s.setLastNotifId);
  const notifs = q.data?.s.notifs;

  // yeni oyun bildirimlerini toast olarak göster
  useEffect(() => {
    if (!notifs) return;
    const maxId = notifs.length ? notifs[notifs.length - 1].id : 0;
    if (lastId < 0) { setLast(maxId); return; }
    const fresh = notifs.filter((n) => n.id > lastId);
    if (fresh.length) {
      for (const n of fresh.slice(-3)) pushToast(n.type, n.msg);
      setLast(maxId);
    }
  }, [notifs, lastId, pushToast, setLast]);

  return q;
}

/** Oyun eylemi gönderir; sonucu toast olarak gösterir ve önbelleği günceller. */
export function useAct() {
  const qc = useQueryClient();
  const pushToast = useUi((s) => s.pushToast);
  const m = useMutation({
    mutationFn: (a: Action) => apiFetch<GameResponse>('/game/action', { method: 'POST', body: JSON.stringify(a) }),
    onSuccess: (data) => {
      qc.setQueryData(GAME_KEY, data);
      if (data.result) {
        if ('ok' in data.result) pushToast('good', data.result.msg);
        else pushToast('bad', data.result.err);
      }
    },
    onError: (e: Error) => pushToast('bad', e.message),
  });
  return useCallback((a: Action) => m.mutate(a), [m]);
}
