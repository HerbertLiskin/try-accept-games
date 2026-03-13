import express from 'express';
// Triggering Railway redeploy with a real file change
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './router.js';
import { db } from './db/index.js';
import { scores } from './db/schema.js';
import { desc, inArray } from 'drizzle-orm';

// Temporary cleanup trigger for production without terminal access
if (process.env.DELETE_TOP_SCORES === 'true') {
  console.log('Cleanup triggered: Deleting top 2 scores...');
  const top2 = db.select({ id: scores.id })
    .from(scores)
    .orderBy(desc(scores.score))
    .limit(2)
    .all();
    
  if (top2.length > 0) {
    const ids = top2.map(s => s.id);
    db.delete(scores).where(inArray(scores.id, ids)).run();
    console.log(`Successfully deleted ${top2.length} scores.`);
  } else {
    console.log('No scores found to delete.');
  }
}

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: () => ({}),
  })
);

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
