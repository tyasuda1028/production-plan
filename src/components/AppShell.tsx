"use client";

import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/lib/AuthContext";
import { useMasterStore } from "@/lib/masterStore";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";
import HydrationGuard from "@/components/HydrationGuard";
import LoginForm from "@/components/LoginForm";

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

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const prevUserRef = useRef<User | null>(null);

  // ログイン直後にこのユーザーのデータを Supabase から再読み込み
  useEffect(() => {
    if (!prevUserRef.current && user) {
      // null → user に変化 = ログイン完了
      useMasterStore.persist.rehydrate?.();
    }
    prevUserRef.current = user;
  }, [user]);

  // Supabase 未設定時は認証なしで動作（ローカル開発など）
  if (!supabase) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <HydrationGuard>{children}</HydrationGuard>
        </main>
      </div>
    );
  }

  // セッション確認中
  if (loading) return <LoadingScreen />;

  // 未ログイン → ログイン画面
  if (!user) return <LoginForm />;

  // ログイン済み → アプリ本体
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <HydrationGuard>{children}</HydrationGuard>
      </main>
    </div>
  );
}
