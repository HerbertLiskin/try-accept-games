/// <reference types="node" />
import type { Config } from 'drizzle-kit';
import fs from 'fs';
import path from 'path';

const url = process.env.DATABASE_URL || './sqlite.db';
console.log(`Drizzle Kit using database at: ${url}`);

// Ensure directory exists for drizzle-kit
const dbDir = path.dirname(url);
if (dbDir !== '.' && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export default {
  out: './drizzle',
  schema: './src/db/schema.ts',
  breakpoints: true,
  dialect: 'sqlite',
  dbCredentials: {
    url,
  },
} satisfies Config;
