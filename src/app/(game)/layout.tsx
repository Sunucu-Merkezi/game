import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { GameShell } from '@/components/game/game-shell';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function GameLayout({ children }: { children: ReactNode }) {
  if (!(await getSessionUser())) redirect('/login');
  return <GameShell>{children}</GameShell>;
}
