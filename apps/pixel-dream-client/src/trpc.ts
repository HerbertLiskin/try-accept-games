import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../pixel-dream-server/src/router';

export const trpc = createTRPCReact<AppRouter>();
