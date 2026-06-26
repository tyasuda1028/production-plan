"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";
import { useMasterStore } from "@/lib/masterStore";
import { useUiStore } from "@/lib/uiStore";
import { setStorageUserId, setDemoMode, isDemoMode } from "@/lib/localStore";
import { cancelPendingWrites } from "@/lib/neonStateStorage";
import { isDemoActive, stopDemo, clearDemoFlag, DEMO_USER_ID } from "@/lib/demo";
import { useIsNative } from "@/lib/native";
import BrandMark from "@/components/BrandMark";
import Sidebar from "@/components/Sidebar";
import HydrationGuard from "@/components/HydrationGuard";
import SetupWizard from "@/components/SetupWizard";
import ConfirmDialog from "@/components/ConfirmDialog";
import Toaster from "@/components/Toaster";
import LockScreen from "@/components/LockScreen";

// モバイル用トップバー（サイドバー非表示時に表示）。ハンバーガーでサイドナビを開く。
function MobileTopBar() {
  const toggleMobileNav = useUiStore((s) => s.toggleMobileNav);
  return (
    <header className="wide:hidden flex items-center gap-3 px-3 h-14 border-b border-gray-200 bg-white shrink-0 no-print">
      <button
        onClick={toggleMobileNav}
        className="p-2 -ml-1 rounded text-gray-600 hover:bg-gray-100"
        aria-label="メニューを開く"
      >
        <Menu className="w-6 h-6" />
      </button>
      <div className="flex items-center gap-2">
        <BrandMark size={28} className="shrink-0 rounded-lg" />
        <span className="font-bold text-gray-800 text-sm">スマコウバ計画</span>
      </div>
    </header>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <svg className="animate-spin w-8 h-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span className="text-sm">読み込み中…</span>
      </div>
    </div>
  );
}

// スクリーンショット/デモ用：NEXT_PUBLIC_DEMO_SEED=1 のビルドのみ、空ならサンプル投入。
function useDemoSeed() {
  const hydrated = useMasterStore((s) => s._hasHydrated);
  const router = useRouter();
  useEffect(() => {
    const envDemo = process.env.NEXT_PUBLIC_DEMO_SEED === "1";
    // 実アカウントに種を撒かないよう、デモ「ストレージ」フラグ(isDemoMode)で判定する。
    if ((!envDemo && !isDemoMode()) || !hydrated) return;
    const s = useMasterStore.getState();
    if (s.productMasters.length === 0) s.seedSampleData();
    useUiStore.getState().closeSetup();
    if (envDemo) {
      const route = process.env.NEXT_PUBLIC_DEMO_ROUTE;
      if (route) setTimeout(() => router.replace(route), 300);
    }
  }, [hydrated, router]);
}

// デモモードの帯（ログイン不要で閲覧中の明示＋登録/終了導線）
function DemoBanner() {
  const router = useRouter();
  const native = useIsNative();
  function exit(to: string) {
    stopDemo();
    router.push(to);
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs no-print">
      <span className="font-bold">🎭 デモモード</span>
      <span className="text-amber-700 hidden sm:inline">サンプルデータで閲覧中・保存はされません</span>
      <div className="ml-auto flex items-center gap-2">
        {/* 新規登録CTAはアプリ(iOS)では出さない（App Store 3.1.1 対応）。Web版のみ表示 */}
        {!native && (
          <button
            onClick={() => exit("/register")}
            className="rounded bg-amber-600 text-white px-3 py-1 font-medium hover:bg-amber-700"
          >
            新規登録
          </button>
        )}
        <button
          onClick={() => exit("/login")}
          className="rounded border border-amber-300 px-3 py-1 hover:bg-amber-100"
        >
          {native ? "ログイン" : "終了"}
        </button>
      </div>
    </div>
  );
}

function AppBody({ children, demo }: { children: React.ReactNode; demo?: boolean }) {
  useDemoSeed();
  return (
    <div className="flex h-screen overflow-hidden print-root">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 print:overflow-visible">
        {demo && <DemoBanner />}
        <MobileTopBar />
        <main className="flex-1 overflow-y-auto print-main">
          <HydrationGuard>{children}</HydrationGuard>
        </main>
      </div>
      <SetupWizard />
      <ConfirmDialog />
      <Toaster />
    </div>
  );
}

/**
 * 認証済みユーザーの利用権ゲート。
 * Web でトライアル終了かつ未契約(active=false)ならロック画面。
 * ネイティブ(iOS・リモートロード)は 3.1.1 のためロックしない（取得失敗時もフェイルオープン）。
 */
function AuthedApp({ children }: { children: React.ReactNode }) {
  const native = useIsNative();
  const [active, setActive] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/entitlement")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && typeof d.active === "boolean") setActive(d.active); })
      .catch(() => { /* フェイルオープン */ });
    return () => { alive = false; };
  }, []);
  if (!native && active === false) return <LockScreen />;
  return <AppBody demo={false}>{children}</AppBody>;
}

/**
 * next-auth セッションゲート。
 * 未ログイン → /login へ。ログイン時に companyId をストレージに橋渡しして再ハイドレート。
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const prevAuthRef = useRef(false);
  const demoInitRef = useRef(false);
  // デモ判定はマウント後に確定（SSR 不一致回避）
  const [demo, setDemo] = useState(false);
  useEffect(() => setDemo(isDemoActive()), []);

  useEffect(() => {
    // 実ログイン
    if (status === "authenticated" && session?.user?.companyId) {
      if (!prevAuthRef.current) {
        // デモから実ログインへ：デモ状態を完全破棄してから実データを読む
        // （在庫データ未保存の新規アカウントにデモのサンプルが混入するのを防ぐ）
        if (isDemoActive() || demoInitRef.current) {
          clearDemoFlag();
          setStorageUserId(null);
          cancelPendingWrites();
          useMasterStore.getState().resetAll();
          demoInitRef.current = false;
        }
        setDemoMode(false);
        setDemo(false);
        setStorageUserId(session.user.companyId);
        useMasterStore.setState({ _hasHydrated: false });
        useMasterStore.persist.rehydrate?.();
        prevAuthRef.current = true;
      }
      return;
    }
    // デモ：認証をバイパスし、__demo__ 名前空間でローカル保存
    if (demo) {
      setDemoMode(true);
      setStorageUserId(DEMO_USER_ID);
      if (!demoInitRef.current) {
        cancelPendingWrites();
        prevAuthRef.current = false;
        useMasterStore.setState({ _hasHydrated: false });
        useMasterStore.persist.rehydrate?.();
        demoInitRef.current = true;
      }
      return;
    }
    // 未ログイン（かつデモでもない）→ /login。
    // isDemoActive() を直読みして、demo state 確定前の誤リダイレクトを防ぐ。
    if (status === "unauthenticated" && !isDemoActive()) {
      setDemoMode(false);
      setStorageUserId(null);
      if (prevAuthRef.current) {
        cancelPendingWrites();
        useMasterStore.getState().resetAll();
        prevAuthRef.current = false;
      }
      demoInitRef.current = false;
      router.replace("/login");
    }
  }, [status, session, demo, router]);

  if (demo) return <AppBody demo={true}>{children}</AppBody>;
  if (status === "authenticated") return <AuthedApp>{children}</AuthedApp>;
  return <LoadingScreen />;
}

// 認証不要で公開するページ（プライバシー・サポート・ログイン・登録・料金・問い合わせ）。
// ※ /pricing・/contact は公開URLのみ。iOSアプリの審査要件のためアプリ内ナビからはリンクしない。
const PUBLIC_PATHS = ["/privacy", "/support", "/login", "/register", "/pricing", "/contact", "/demo"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname && PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return <>{children}</>;
  }
  return <AuthGate>{children}</AuthGate>;
}
