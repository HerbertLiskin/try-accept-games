import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import path from 'path';

const dbPath = process.env.DATABASE_URL || path.join(import.meta.dirname, '../../sqlite.db');
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
