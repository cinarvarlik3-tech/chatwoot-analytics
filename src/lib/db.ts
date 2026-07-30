/**
 * PostgreSQL connection pool for Chatwoot Supabase analytics queries.
 */

import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

let pool: Pool | null = null;

/**
 * URL-encodes an unescaped password segment in a PostgreSQL connection URL.
 */
function encodeDatabaseUrl(url: string): string {
  return url.replace(
    /(postgresql:\/\/[^:]+:)([^@\s]+)(@)/,
    (_, prefix, password, suffix) => {
      if (password.includes("%")) return prefix + password + suffix;
      return prefix + encodeURIComponent(password) + suffix;
    },
  );
}

/**
 * Resolves CHATWOOT_DATABASE_URL from process.env or the parent repo .env file.
 */
function resolveDatabaseUrl(): string {
  if (process.env.CHATWOOT_DATABASE_URL) {
    return process.env.CHATWOOT_DATABASE_URL;
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
      .match(/^CHATWOOT_DATABASE_URL=(.+)$/m);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  throw new Error(
    "CHATWOOT_DATABASE_URL is not configured. Add it to chatwoot/.env.local or the repo root .env file.",
  );
}

/**
 * Returns a singleton connection pool using CHATWOOT_DATABASE_URL.
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: encodeDatabaseUrl(resolveDatabaseUrl()),
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}
