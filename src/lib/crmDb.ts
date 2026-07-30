/**
 * PostgreSQL connection pool for the live CRM Supabase database.
 */

import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

let pool: Pool | null = null;

function encodeDatabaseUrl(url: string): string {
  return url.replace(
    /(postgresql:\/\/[^:]+:)([^@\s]+)(@)/,
    (_, prefix, password, suffix) => {
      if (password.includes("%")) return prefix + password + suffix;
      return prefix + encodeURIComponent(password) + suffix;
    },
  );
}

function resolveCrmDatabaseUrl(): string {
  if (process.env.CRM_DATABASE_URL) {
    return process.env.CRM_DATABASE_URL;
  }

  const candidates = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
  ];

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const match = fs
      .readFileSync(envPath, "utf8")
      .match(/^CRM_DATABASE_URL=(.+)$/m);
    if (match?.[1]) return match[1].trim();
  }

  throw new Error(
    "CRM_DATABASE_URL is not configured. Add it to .env.local or the repo root .env file.",
  );
}

/** Returns a singleton CRM connection pool. */
export function getCrmPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: encodeDatabaseUrl(resolveCrmDatabaseUrl()),
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}
