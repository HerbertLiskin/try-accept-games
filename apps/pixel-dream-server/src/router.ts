import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { db } from './db/index.js';
import { scores } from './db/schema.js';
import { desc } from 'drizzle-orm';

const t = initTRPC.create();

export const appRouter = t.router({
  getLeaderboard: t.procedure.query(async () => {
    const topScores = await db.query.scores.findMany({
      orderBy: [desc(scores.score)],
      limit: 10,
    });
    return topScores;
  }),
  submitScore: t.procedure
    .input(z.object({ name: z.string().min(1).max(20), score: z.number().int().min(0) }))
    .mutation(async ({ input }) => {
      await db.insert(scores).values({
        name: input.name,
        score: input.score,
        date: new Date(),
      });
      return { success: true };
    }),
});

export type AppRouter = typeof appRouter;
