'use client';
import type { ReactNode } from 'react';
import { ErrorState, PageSkeleton } from '@/components/ui/primitives';
import { useCatalog, useGame } from '@/hooks/use-game';
import type { GameResponse } from '@/modules/game/game-service';
import type { Catalog } from '@/types/catalog';

/** Yükleme / hata durumlarını yönetir; veri hazırsa içeriği oyun verisiyle çizer. */
export function WithGame({ children }: { children: (g: GameResponse, cat: Catalog) => ReactNode }) {
  const q = useGame();
  const cat = useCatalog();
  if (q.error && !q.data) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  if (!q.data || !cat) return <PageSkeleton />;
  return <>{children(q.data, cat)}</>;
}
