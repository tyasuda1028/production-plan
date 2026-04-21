"use client";

import { useEffect, useState } from "react";
import { useMasterStore } from "@/lib/masterStore";

/**
 * Supabase からの初回データロードが完了するまでローディング画面を表示する。
 * 環境変数未設定時（localStorage フォールバック）は即座に完了する。
 */
export default function HydrationGuard({ children }: { children: React.ReactNode }) {
  const hasHydrated = useMasterStore((s) => s._hasHydrated);
  const [timedOut, setTimedOut] = useState(false);

  // 5 秒経っても応答がなければタイムアウトしてコンテンツを表示
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, []);

  if (!hasHydrated && !timedOut) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm">データを読み込んでいます…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
