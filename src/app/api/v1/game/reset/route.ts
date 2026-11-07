import { z } from 'zod';
import { handle, json, rateLimit, readJson, requireUser } from '@/lib/api';
import { resetGame } from '@/modules/game/game-service';

const schema = z.object({ confirm: z.literal('SIFIRLA') });

export async function POST(req: Request) {
  return handle(async () => {
    const u = await requireUser();
    rateLimit(req, 'reset:' + u.id, 5, 60_000);
    schema.parse(await readJson(req));
    await resetGame(u.id);
    return json({ reset: true });
  });
}
