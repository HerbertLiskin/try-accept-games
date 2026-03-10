import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const scores = sqliteTable('scores', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    score: integer('score').notNull(),
    date: integer('date', { mode: 'timestamp' }).notNull(),
});
