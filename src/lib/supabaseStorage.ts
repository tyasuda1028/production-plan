import { PersistStorage, StorageValue } from 'zustand/middleware';
import { supabase, getClerkUserId } from './supabaseClient';

/**
 * Zustand persist 用 Supabase ストレージアダプター（Clerk マルチテナント対応版）
 *
 * - 認証は Clerk。ログイン中ユーザーの Clerk ID（user_xxx 形式の文字列）を
 *   user_id カラムに付与して読み書きする
 * - Supabase 側は Clerk を Third-Party Auth として検証し、
 *   RLS（auth.jwt()->>'sub' = user_id）で他社データへのアクセスを防ぐ
 * - Supabase 未設定／未ログイン時は no-op（localStorage フォールバック）
 *
 * Supabase 側で必要なスキーマ変更は supabase/migration_clerk.sql を参照。
 *   - user_id カラムは TEXT 型（Clerk ID は UUID ではない）
 *   - RLS ポリシー: USING ((select auth.jwt()->>'sub') = user_id)
 */
export function createSupabaseStorage<T>(): PersistStorage<T> {
  return {
    getItem: async (name: string): Promise<StorageValue<T> | null> => {
      if (!supabase) {
        // フォールバック: localStorage
        if (typeof window === 'undefined') return null;
        const raw = localStorage.getItem(name);
        if (!raw) return null;
        try { return JSON.parse(raw) as StorageValue<T>; } catch { return null; }
      }

      const userId = getClerkUserId();
      if (!userId) return null; // 未ログイン時は読み込まない

      const { data, error } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', name)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[supabaseStorage] getItem error:', error.message);
        return null;
      }
      if (!data) return null;
      return data.data as StorageValue<T>;
    },

    setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
      if (!supabase) {
        if (typeof window === 'undefined') return;
        localStorage.setItem(name, JSON.stringify(value));
        return;
      }

      const userId = getClerkUserId();
      if (!userId) return; // 未ログイン時は保存しない

      const { error } = await supabase
        .from('app_state')
        .upsert(
          { id: name, user_id: userId, data: value, updated_at: new Date().toISOString() },
          { onConflict: 'id,user_id' }
        );

      if (error) {
        console.error('[supabaseStorage] setItem error:', error.message);
      }
    },

    removeItem: async (name: string): Promise<void> => {
      if (!supabase) {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(name);
        return;
      }

      const userId = getClerkUserId();
      if (!userId) return;

      const { error } = await supabase
        .from('app_state')
        .delete()
        .eq('id', name)
        .eq('user_id', userId);

      if (error) {
        console.error('[supabaseStorage] removeItem error:', error.message);
      }
    },
  };
}
