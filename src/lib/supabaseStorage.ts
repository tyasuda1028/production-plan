import { PersistStorage, StorageValue } from 'zustand/middleware';
import { supabase } from './supabaseClient';

/**
 * Zustand persist 用 Supabase ストレージアダプター（マルチテナント対応版）
 *
 * - ログイン中のユーザー ID を user_id カラムに付与して読み書きする
 * - Supabase RLS（行レベルセキュリティ）と組み合わせることで他社データへのアクセスを防ぐ
 * - Supabase 未設定時は localStorage にフォールバック
 *
 * Supabase 側で必要なスキーマ変更（Supabase ダッシュボード > SQL エディタで実行）:
 *   ALTER TABLE app_state ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
 *   ALTER TABLE app_state DROP CONSTRAINT IF EXISTS app_state_pkey;
 *   ALTER TABLE app_state ADD PRIMARY KEY (id, user_id);
 *   ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "tenant_isolation" ON app_state
 *     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
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

      // 現在のログインユーザーを取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', name)
        .eq('user_id', user.id)
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // 未ログイン時は保存しない

      const { error } = await supabase
        .from('app_state')
        .upsert(
          { id: name, user_id: user.id, data: value, updated_at: new Date().toISOString() },
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

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('app_state')
        .delete()
        .eq('id', name)
        .eq('user_id', user.id);

      if (error) {
        console.error('[supabaseStorage] removeItem error:', error.message);
      }
    },
  };
}
