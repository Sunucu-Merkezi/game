import { handle, json } from '@/lib/api';
import { destroySession } from '@/lib/auth';

export async function POST() {
  return handle(async () => {
    await destroySession();
    return json({ loggedOut: true });
  });
}
