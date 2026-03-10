export default {
    out: './drizzle',
    schema: './src/db/schema.ts',
    breakpoints: true,
    dialect: 'sqlite',
    dbCredentials: {
        url: './sqlite.db',
    },
};
