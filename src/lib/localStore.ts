import { PersistStorage, StorageValue } from 'zustand/middleware';

/**
 * Zustand persist 用 localStorage アダプター
 * ------------------------------------------------------------
 * 認証は Clerk（アクセスゲート）。データはバックエンドを使わず
 * 各ブラウザの localStorage に保存する。
 *
 * 同一ブラウザで複数アカウントを使った場合にデータが混ざらないよう、
 * 保存キーを Clerk ユーザー ID で名前空間化する（name::userId）。
 * ログイン前や Clerk 無効時（ローカル開発）は素の name キーを使う。
 *
 * ※ データは端末ローカルのため、複数端末での同期はされない。
 */
let currentUserId: string | null = null;

export function setStorageUserId(id: string | null) {
  currentUserId = id;
}

function keyFor(name: string): string {
  return currentUserId ? `${name}::${currentUserId}` : name;
}

export function createLocalStorage<T>(): PersistStorage<T> {
  return {
    getItem: (name: string): StorageValue<T> | null => {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem(keyFor(name));
      if (!raw) return null;
      try { return JSON.parse(raw) as StorageValue<T>; } catch { return null; }
    },

    setItem: (name: string, value: StorageValue<T>): void => {
      if (typeof window === 'undefined') return;
      localStorage.setItem(keyFor(name), JSON.stringify(value));
    },

    removeItem: (name: string): void => {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(keyFor(name));
    },
  };
}
