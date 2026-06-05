import { create } from 'zustand';

/**
 * 永続化しない軽量UIストア。
 * セットアップウィザードの開閉状態をサイドバーとウィザードで共有する。
 */
interface UiStore {
  setupOpen: boolean;
  openSetup: () => void;
  closeSetup: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  setupOpen: false,
  openSetup: () => set({ setupOpen: true }),
  closeSetup: () => set({ setupOpen: false }),
}));
