import { ApiError, handle, json, rateLimit, readJson, clientIp } from '@/lib/api';
import { createSession, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { registerSchema } from '@/modules/auth/auth-schema';
import { createGameFor } from '@/modules/game/game-service';

export async function POST(req: Request) {
  return handle(async () => {
    rateLimit(req, 'auth', 10, 60_000);
    const body = registerSchema.parse(await readJson(req));
    const company = body.company.replace(/[<>"&]/g, '') || 'Yeni Şirket';
    if (await prisma.user.findUnique({ where: { username: body.username } })) throw new ApiError(409, 'Bu kullanıcı adı alınmış');
    const { hash, salt } = await hashPassword(body.password);
    const user = await prisma.user.create({ data: { username: body.username, passwordHash: hash, salt } });
    await createGameFor(user.id, company);
    await prisma.auditLog.create({ data: { userId: user.id, type: 'register', detail: '', ip: clientIp(req) } });
    await createSession(user.id);
    return json({ username: user.username });
  });
}
