import { handle, json, rateLimit, requireUser } from '@/lib/api';
import { getState } from '@/modules/game/game-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handle(async () => {
    const u = await requireUser();
    rateLimit(req, 'state:' + u.id, 240, 60_000);
    return json(await getState(u.id, u.username));
  });
}
