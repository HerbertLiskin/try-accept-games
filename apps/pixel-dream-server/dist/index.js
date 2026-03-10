import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './router.js';
const app = express();
const port = process.env.PORT || 3001;
app.use(cors());
app.use('/trpc', trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: () => ({}),
}));
app.listen(Number(port), "0.0.0.0", () => {
    console.log(`Server listening on port ${port}`);
});
