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
// Clerk 認証が有効か（公開キーの有無で判定）
const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

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
      // 認証が有効で未ログインのときは何も読み込まない。
      // これがないと、ログイン判定前に旧来の素キー（認証導入前のデータ）を
      // 読み込んでしまい、ログイン後のユーザーに旧データが混入する。
      if (clerkEnabled && !currentUserId) return null;
      const raw = localStorage.getItem(keyFor(name));
      if (!raw) return null;
      try { return JSON.parse(raw) as StorageValue<T>; } catch { return null; }
    },

    setItem: (name: string, value: StorageValue<T>): void => {
      if (typeof window === 'undefined') return;
      // 認証が有効で未ログインのときは書き込まない（素キーへ誤保存しない）
      if (clerkEnabled && !currentUserId) return;
      localStorage.setItem(keyFor(name), JSON.stringify(value));
    },

    removeItem: (name: string): void => {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(keyFor(name));
    },
  };
}
