import { actionSchema } from '@/game-engine';
import { handle, json, rateLimit, readJson, requireUser } from '@/lib/api';
import { perform } from '@/modules/game/game-service';

export async function POST(req: Request) {
  return handle(async () => {
    const u = await requireUser();
    rateLimit(req, 'act:' + u.id, 120, 60_000);
    const action = actionSchema.parse(await readJson(req));
    return json(await perform(u.id, u.username, action));
  });
}
