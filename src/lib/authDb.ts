import bcrypt from "bcryptjs";
import { getSql } from "./neon";

/** 認証用テーブル（companies/users）を冪等に作成。空DBでも自動初期化されるようにする。 */
export async function ensureAuthSchema(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      email         TEXT NOT NULL UNIQUE,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS users_company_id_idx ON users(company_id)`;
  // 課金（Stripe / 30日トライアル）用カラム。冪等追加。
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_store TEXT`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_product_id TEXT`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_updated_at TIMESTAMPTZ`;
}

/** メール重複チェック */
export async function emailExists(email: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`SELECT 1 FROM users WHERE email = ${email} LIMIT 1`;
  return rows.length > 0;
}

/** 会社を作成し ID を返す */
export async function createCompany(name: string): Promise<string> {
  const sql = getSql();
  const rows = await sql`INSERT INTO companies (name) VALUES (${name}) RETURNING id`;
  return rows[0].id as string;
}

/** ユーザーを作成（パスワードは bcrypt でハッシュ化） */
export async function createUser(
  companyId: string,
  email: string,
  name: string,
  password: string
): Promise<void> {
  const sql = getSql();
  const passwordHash = await bcrypt.hash(password, 12);
  await sql`
    INSERT INTO users (company_id, email, name, password_hash)
    VALUES (${companyId}, ${email}, ${name}, ${passwordHash})
  `;
}
