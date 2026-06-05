"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import {
  LayoutDashboard, Table2, CalendarDays, FlaskConical, Settings,
  ChevronLeft, ChevronRight, Factory, LogOut, Sparkles,
} from "lucide-react";
import { useMasterStore } from "@/lib/masterStore";
import { useUiStore } from "@/lib/uiStore";
import { formatYearMonth, addMonths } from "@/lib/data";
import { useUser, useClerk } from "@clerk/nextjs";

// Clerk 公開キーが設定されているときだけユーザー情報・ログアウトを表示
const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const navItems: { href: string; label: string; icon: React.ElementType; badge?: string; divider?: boolean }[] = [
  { href: "/",          label: "ダッシュボード",   icon: LayoutDashboard },
  { href: "/plan",      label: "生産計画表",        icon: Table2 },
  { href: "/schedule",  label: "日割りスケジュール", icon: CalendarDays },
  { href: "/simulate",  label: "生産計画立案",       icon: FlaskConical, badge: "NEW" },
  { href: "/masters",   label: "マスター設定",       icon: Settings, divider: true },
];

function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <div className="px-3 py-3 border-t border-gray-200">
      <div className="flex items-center gap-2 text-xs text-gray-500 px-1 mb-2">
        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-blue-600">
            {email?.[0]?.toUpperCase() ?? "?"}
          </span>
        </div>
        <span className="truncate">{email}</span>
      </div>
      <button
        onClick={() => signOut()}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        ログアウト
      </button>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { planBaseMonth, setPlanBaseMonth } = useMasterStore();
  const openSetup = useUiStore((s) => s.openSetup);

  function prevMonth() { setPlanBaseMonth(addMonths(planBaseMonth, -1)); }
  function nextMonth() { setPlanBaseMonth(addMonths(planBaseMonth,  1)); }

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* ロゴ・タイトル */}
      <div className="px-4 py-4 border-b border-gray-200 flex items-center gap-2.5">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <Factory style={{ width: 18, height: 18 }} className="text-white" />
        </div>
        <div className="leading-tight">
          <div className="font-bold text-gray-800 text-sm">生産計画システム</div>
          <div className="text-[10px] text-gray-400">Production Planning</div>
        </div>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon, badge, divider }) => {
          const active = pathname === href;
          return (
            <React.Fragment key={href}>
              {divider && <div className="border-t border-gray-100 my-1" />}
              <Link
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">
                    {badge}
                  </span>
                )}
              </Link>
            </React.Fragment>
          );
        })}

        <button
          onClick={openSetup}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">セットアップ</span>
        </button>
      </nav>

      {/* 計画基準月セレクター */}
      <div className="px-4 py-3 border-t border-gray-200 space-y-1.5">
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">計画基準月</p>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            title="前月"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="flex-1 text-center text-xs font-semibold text-gray-700">
            {formatYearMonth(planBaseMonth)}
          </span>
          <button
            onClick={nextMonth}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            title="翌月"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400">
          〜 {formatYearMonth(addMonths(planBaseMonth, 5))}
        </p>
      </div>

      {/* ユーザー情報・ログアウト（Clerk 認証時のみ表示） */}
      {clerkEnabled && <UserMenu />}
    </aside>
  );
}
