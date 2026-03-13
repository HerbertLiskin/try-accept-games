/// <reference types="node" />
import type { Config } from 'drizzle-kit';

export default {
  out: './drizzle',
  schema: './src/db/schema.ts',
  breakpoints: true,
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || './sqlite.db',
  },
} satisfies Config;
