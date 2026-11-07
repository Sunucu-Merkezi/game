import { ApiError, clientIp, handle, json, rateLimit, readJson } from '@/lib/api';
import { createSession, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { credentialsSchema } from '@/modules/auth/auth-schema';

export async function POST(req: Request) {
  return handle(async () => {
    rateLimit(req, 'auth', 10, 60_000);
    const body = credentialsSchema.parse(await readJson(req));
    const user = await prisma.user.findUnique({ where: { username: body.username } });
    const valid = user ? await verifyPassword(body.password, user.passwordHash, user.salt) : false;
    await prisma.auditLog.create({ data: { userId: user?.id, type: valid ? 'login' : 'login_fail', detail: body.username, ip: clientIp(req) } });
    if (!user || !valid) throw new ApiError(401, 'Kullanıcı adı veya şifre hatalı');
    await createSession(user.id);
    return json({ username: user.username });
  });
}
