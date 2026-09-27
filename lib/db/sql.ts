import { neon } from "@neondatabase/serverless";

/** Runs one parameterised SQL statement and returns its rows: Neon's HTTP driver in the app, PGlite in tests. */
export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

let sql: Sql | undefined;

// Created on first use rather than at import, so `next build` runs without DATABASE_URL.
export function getSql(): Sql {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    sql = neon(url);
  }
  return sql;
}
