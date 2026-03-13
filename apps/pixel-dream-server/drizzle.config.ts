/// <reference types="node" />
import type { Config } from 'drizzle-kit';

const url = process.env.DATABASE_URL || './sqlite.db';
console.log(`Drizzle Kit using database at: ${url}`);

export default {
  out: './drizzle',
  schema: './src/db/schema.ts',
  breakpoints: true,
  dialect: 'sqlite',
  dbCredentials: {
    url,
  },
} satisfies Config;
