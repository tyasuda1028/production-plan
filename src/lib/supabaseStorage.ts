import { PersistStorage, StorageValue } from 'zustand/middleware';
import { getSupabase } from './supabaseClient';
import { getStorageUserId } from './localStore';
import { useUiStore } from './uiStore';

function setSync(status: 'idle' | 'saving' | 'saved' | 'error') {
  useUiStore.getState().setSyncStatus(status);
}

/**
 * Zustand persist 用 Supabase ストレージアダプタ（非同期）
 * ------------------------------------------------------------
 * - 正本：Supabase の app_state テーブル（user_id ごとに 1 行・jsonb）
 * - localStorage を「ミラー」として併用（即時表示・オフライン耐性）
 * - 書込はデバウンスして Supabase へ upsert（連続編集をまとめる）
 * - 初回：Supabase に行が無く localStorage に既存データがあれば自動移行
 *
 * ユーザーIDは localStore と共有（setStorageUserId 経由）。
 */
const TABLE = 'app_state';
const DEBOUNCE_MS = 800;

function lsKey(name: string): string {
  const uid = getStorageUserId();
  return uid ? `${name}::${uid}` : name;
}

function lsGet<T>(name: string): StorageValue<T> | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(lsKey(name));
  if (!raw) return null;
  try { return JSON.parse(raw) as StorageValue<T>; } catch { return null; }
}

function lsSet<T>(name: string, value: StorageValue<T>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(lsKey(name), JSON.stringify(value));
}

function lsRemove(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(lsKey(name));
}

// ── デバウンス付き upsert ──
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let pendingValue: unknown = undefined;
let hasPending = false;

async function flush(): Promise<void> {
  writeTimer = null;
  if (!hasPending) return;
  const sb = getSupabase();
  const uid = getStorageUserId();
  const value = pendingValue;
  hasPending = false;
  pendingValue = undefined;
  if (!sb || !uid) return;
  try {
    const { error } = await sb
      .from(TABLE)
      .upsert({ user_id: uid, data: value, updated_at: new Date().toISOString() });
    if (error) throw error;
    setSync('saved');
  } catch (e) {
    // 失敗してもミラー（localStorage）が残るため致命ではない
    console.warn('[supabaseStorage] upsert failed:', (e as Error).message);
    setSync('error');
  }
}

export function createSupabaseStorage<T>(): PersistStorage<T> {
  return {
    getItem: async (name: string): Promise<StorageValue<T> | null> => {
      if (typeof window === 'undefined') return null;
      const uid = getStorageUserId();
      if (!uid) return null; // 未ログイン時は読み込まない
      const sb = getSupabase();
      if (!sb) return lsGet<T>(name);

      try {
        const { data, error } = await sb
          .from(TABLE)
          .select('data')
          .eq('user_id', uid)
          .maybeSingle();
        if (error) throw error;

        if (data?.data) {
          const val = data.data as StorageValue<T>;
          lsSet(name, val); // ミラー更新
          return val;
        }

        // Supabase に未保存 → localStorage に既存データがあれば初回移行
        const mirror = lsGet<T>(name);
        if (mirror) {
          await sb.from(TABLE).upsert({ user_id: uid, data: mirror, updated_at: new Date().toISOString() });
          return mirror;
        }
        return null;
      } catch (e) {
        // オフライン・一時障害 → ミラーにフォールバック
        console.warn('[supabaseStorage] getItem fallback to localStorage:', (e as Error).message);
        return lsGet<T>(name);
      }
    },

    setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
      if (typeof window === 'undefined') return;
      if (!getStorageUserId()) return; // 未ログイン時は書き込まない
      lsSet(name, value);              // 即時ミラー
      pendingValue = value;            // Supabase はデバウンスで
      hasPending = true;
      setSync('saving');
      if (writeTimer) clearTimeout(writeTimer);
      writeTimer = setTimeout(flush, DEBOUNCE_MS);
    },

    removeItem: async (name: string): Promise<void> => {
      if (typeof window === 'undefined') return;
      lsRemove(name);
      const sb = getSupabase();
      const uid = getStorageUserId();
      if (sb && uid) {
        await sb.from(TABLE).delete().eq('user_id', uid);
      }
    },
  };
}
