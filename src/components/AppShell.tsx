"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useMasterStore } from "@/lib/masterStore";
import { setStorageUserId } from "@/lib/localStore";
import Sidebar from "@/components/Sidebar";
import HydrationGuard from "@/components/HydrationGuard";
import LoginForm from "@/components/LoginForm";
import SetupWizard from "@/components/SetupWizard";

// Clerk 公開キーが設定されているときだけ認証を有効化する
const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <svg
          className="animate-spin w-8 h-8 text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="text-sm">読み込み中…</span>
      </div>
    </div>
  );
}

function AppBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <HydrationGuard>{children}</HydrationGuard>
      </main>
      <SetupWizard />
    </div>
  );
}

/**
 * Clerk 認証ゲート＋localStorage ブリッジ。
 * Clerk が有効なときだけマウントされる（フックは ClerkProvider 配下が必須のため）。
 */
function ClerkAuthShell({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const prevSignedInRef = useRef(false);

  // Clerk のユーザー ID を localStorage アダプタへ橋渡しし、
  // ログイン時にこのユーザーのデータを読み込む
  useEffect(() => {
    if (isSignedIn && user) {
      setStorageUserId(user.id);
      if (!prevSignedInRef.current) {
        // 初回ログイン → このユーザーのデータを読み込み（Supabase/localStorage）。
        // Supabase は非同期取得のため、完了まで読み込み中表示にする。
        useMasterStore.setState({ _hasHydrated: false });
        useMasterStore.persist.rehydrate?.();
        prevSignedInRef.current = true;
      }
    } else {
      setStorageUserId(null);
      // ログアウト時は画面上のデータをクリアし、次のユーザーへ残さない。
      // （未ログイン時は localStore 側の書き込みガードにより保存はされない）
      if (prevSignedInRef.current) {
        useMasterStore.getState().resetAll();
      }
      prevSignedInRef.current = false;
    }
  }, [isSignedIn, user]);

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <LoginForm />;
  return <AppBody>{children}</AppBody>;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  // Clerk 未設定時は認証なしで動作（ローカル開発など）
  if (!clerkEnabled) return <AppBody>{children}</AppBody>;
  return <ClerkAuthShell>{children}</ClerkAuthShell>;
}
