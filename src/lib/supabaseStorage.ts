import { PersistStorage, StorageValue } from 'zustand/middleware';
import { supabase } from './supabaseClient';

/**
 * Zustand persist 用 Supabase ストレージアダプター
 *
 * - Supabase の環境変数が設定されていない場合は localStorage にフォールバック
 * - app_state テーブルの 1 行 (id = storeName) にすべての状態を JSONB で保存
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

      const { data, error } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', name)
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

      const { error } = await supabase
        .from('app_state')
        .upsert({ id: name, data: value, updated_at: new Date().toISOString() });

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

      const { error } = await supabase
        .from('app_state')
        .delete()
        .eq('id', name);

      if (error) {
        console.error('[supabaseStorage] removeItem error:', error.message);
      }
    },
  };
}
