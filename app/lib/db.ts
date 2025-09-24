'use server';
import 'server-only';

import postgres from 'postgres';

// Server-only Postgres client (Supabase Postgres 互換)
// NOTE: 必ずサーバー環境変数から取得し、クライアントに公開しないこと
const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('POSTGRES_URL is not set. Set it in .env.local');
}

export const sql = postgres(connectionString, { ssl: 'require' });

