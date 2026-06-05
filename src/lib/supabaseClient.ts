import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase クライアント（クライアントSPA専用）
 * ------------------------------------------------------------
 * 認証は Clerk。各リクエストに Clerk のセッショントークンを載せ、
 * Supabase 側の RLS（auth.jwt()->>'sub' = user_id）でユーザー分離する。
 * サービスキーは使わない（anon キーのみ＝RLS 前提で公開安全）。
 *
 * 環境変数が未設定なら supabaseEnabled=false となり、
 * アプリは従来どおり localStorage のみで動作する。
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = !!url && !!anon;

type ClerkWindow = {
  Clerk?: { session?: { getToken: () => Promise<string | null> } };
};

let client: SupabaseClient | null = null;

/** Clerk トークン付き Supabase クライアントを返す（未設定時は null） */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseEnabled) return null;
  if (client) return client;
  client = createClient(url!, anon!, {
    accessToken: async () => {
      if (typeof window === 'undefined') return null;
      try {
        return (await (window as unknown as ClerkWindow).Clerk?.session?.getToken()) ?? null;
      } catch {
        return null;
      }
    },
  });
  return client;
}
