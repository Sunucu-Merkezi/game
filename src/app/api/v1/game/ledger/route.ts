import { z } from 'zod';
import { handle, json, requireUser } from '@/lib/api';
import { listLedger } from '@/modules/game/game-service';

const query = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(req: Request) {
  return handle(async () => {
    const u = await requireUser();
    const q = query.parse(Object.fromEntries(new URL(req.url).searchParams));
    return json(await listLedger(u.id, q.page, q.pageSize));
  });
}
