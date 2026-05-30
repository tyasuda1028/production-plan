import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Clerk と Supabase のブリッジ
 * ------------------------------------------------------------
 * 認証は Clerk、データ保存は Supabase（Third-Party Auth 連携）。
 * Supabase クライアントはモジュール読み込み時（React の外）で生成されるため、
 * Clerk のセッショントークン取得関数とユーザー ID を
 * モジュールレベル変数で受け渡す。
 * ClerkSupabaseBridge（AppShell 内）がマウント時にセットする。
 */
let clerkGetToken: (() => Promise<string | null>) | null = null;
let clerkUserId: string | null = null;

export function setClerkAuth(
  getToken: (() => Promise<string | null>) | null,
  userId: string | null,
) {
  clerkGetToken = getToken;
  clerkUserId = userId;
}

export function getClerkUserId(): string | null {
  return clerkUserId;
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        // 各リクエストで Clerk のセッショントークンを添付する。
        // Supabase 側は Clerk を Third-Party Auth プロバイダとして検証し、
        // RLS の auth.jwt()->>'sub' に Clerk ユーザー ID が入る。
        accessToken: async () => (clerkGetToken ? await clerkGetToken() : null),
      })
    : null;
