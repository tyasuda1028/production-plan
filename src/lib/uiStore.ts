import { create } from 'zustand';

/**
 * 永続化しない軽量UIストア。
 * - セットアップウィザードの開閉
 * - 確認ダイアログ（ブラウザ標準 confirm() の代替）
 * - トースト通知
 * - クラウド保存の同期状態（supabaseStorage から更新）
 */
export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';
export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ConfirmReq {
  message: string;
  okLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

interface UiStore {
  // セットアップウィザード
  setupOpen: boolean;
  openSetup: () => void;
  closeSetup: () => void;

  // 確認ダイアログ
  confirmReq: ConfirmReq | null;
  requestConfirm: (message: string, opts?: { okLabel?: string; danger?: boolean }) => Promise<boolean>;
  resolveConfirm: (ok: boolean) => void;

  // トースト
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: number) => void;

  // 同期状態
  syncStatus: SyncStatus;
  lastSavedAt: number | null;
  setSyncStatus: (s: SyncStatus) => void;
}

let toastSeq = 0;

export const useUiStore = create<UiStore>((set, get) => ({
  setupOpen: false,
  openSetup: () => set({ setupOpen: true }),
  closeSetup: () => set({ setupOpen: false }),

  confirmReq: null,
  requestConfirm: (message, opts) =>
    new Promise<boolean>((resolve) => {
      set({ confirmReq: { message, ...opts, resolve } });
    }),
  resolveConfirm: (ok) => {
    get().confirmReq?.resolve(ok);
    set({ confirmReq: null });
  },

  toasts: [],
  addToast: (type, message) => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => get().removeToast(id), 3500);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  syncStatus: 'idle',
  lastSavedAt: null,
  setSyncStatus: (s) =>
    set(s === 'saved' ? { syncStatus: s, lastSavedAt: Date.now() } : { syncStatus: s }),
}));
