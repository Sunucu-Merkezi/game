import { handle, json, requireUser } from '@/lib/api';

export async function GET() {
  return handle(async () => {
    const u = await requireUser();
    return json({ username: u.username });
  });
}
