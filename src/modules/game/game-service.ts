import { Prisma } from '@prisma/client';
import { type Action, type ActionResult, type GameState, type GameView, type LedgerRow, type OfflineReport, advance, applyAction, buildView, collectLedger, newGame } from '@/game-engine';
import { prisma } from '@/lib/db';

export interface GameResponse extends GameView {
  user: string;
  offline: OfflineReport | null;
  result?: ActionResult;
}

/** Aynı oyuncunun istekleri sıraya girer; böylece aynı zaman aralığı iki kez işlenmez. */
const locks = new Map<string, Promise<unknown>>();
function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.catch(() => undefined);
  locks.set(key, tail);
  void tail.then(() => { if (locks.get(key) === tail) locks.delete(key); });
  return run;
}

const MAX_RETRY = 3;

interface Mutation { offline: OfflineReport | null; result?: ActionResult; state: GameState }

/**
 * Oyunu okur, zamanı ilerletir, (varsa) eylemi uygular ve sonucu tek transaction içinde yazar.
 * `version` iyimser kilidi, çoklu süreçte bile aynı aralığın iki kez hesaplanmasını engeller.
 */
async function mutate(userId: string, action: Action | null, now: number): Promise<Mutation> {
  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    const row = await prisma.game.findUnique({ where: { userId } });
    if (!row) throw new Error('Oyun bulunamadı');
    const state = JSON.parse(row.state) as GameState;

    const { result: out, rows } = collectLedger(() => {
      const offline = advance(state, now);
      const result = action ? applyAction(state, action) : undefined;
      return { offline, result };
    });

    try {
      await prisma.$transaction(async (tx) => {
        const upd = await tx.game.updateMany({
          where: { id: row.id, version: row.version },
          data: { state: JSON.stringify(state), version: row.version + 1 },
        });
        if (upd.count !== 1) throw new Prisma.PrismaClientKnownRequestError('version conflict', { code: 'P2034', clientVersion: 'game' });
        if (rows.length) await tx.ledgerEntry.createMany({ data: toLedger(row.id, rows) });
      });
      return { offline: out.offline, result: out.result, state };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') continue;
      throw e;
    }
  }
  throw new Error('Oyun güncellenemedi, tekrar dene');
}

const toLedger = (gameId: string, rows: LedgerRow[]) =>
  rows.map((r) => ({ gameId, gameTime: Math.round(r.t), amount: r.a, note: r.n.slice(0, 120), balanceAfter: r.balance }));

export function getState(userId: string, username: string): Promise<GameResponse> {
  return withLock(userId, async () => {
    const m = await mutate(userId, null, Date.now());
    return { user: username, offline: m.offline, ...buildView(m.state) };
  });
}

export function perform(userId: string, username: string, action: Action): Promise<GameResponse> {
  return withLock(userId, async () => {
    const m = await mutate(userId, action, Date.now());
    return { user: username, offline: m.offline, result: m.result, ...buildView(m.state) };
  });
}

export async function createGameFor(userId: string, company: string): Promise<void> {
  await prisma.game.create({ data: { userId, company, state: JSON.stringify(newGame(company)) } });
}

export function resetGame(userId: string): Promise<void> {
  return withLock(userId, async () => {
    const row = await prisma.game.findUnique({ where: { userId } });
    if (!row) throw new Error('Oyun bulunamadı');
    await prisma.$transaction([
      prisma.ledgerEntry.deleteMany({ where: { gameId: row.id } }),
      prisma.game.update({ where: { id: row.id }, data: { state: JSON.stringify(newGame(row.company)), version: { increment: 1 } } }),
    ]);
  });
}

/** İşlem defteri, sayfalı (en yeni önce). */
export async function listLedger(userId: string, page: number, pageSize: number) {
  const game = await prisma.game.findUnique({ where: { userId }, select: { id: true } });
  if (!game) return { items: [], total: 0, page, pageSize };
  const [items, total] = await Promise.all([
    prisma.ledgerEntry.findMany({ where: { gameId: game.id }, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.ledgerEntry.count({ where: { gameId: game.id } }),
  ]);
  return { items, total, page, pageSize };
}
