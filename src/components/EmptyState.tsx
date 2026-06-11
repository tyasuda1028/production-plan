"use client";

import Link from "next/link";
import { useUiStore } from "@/lib/uiStore";
import { Sparkles, Settings, PackageOpen } from "lucide-react";

/**
 * データが無い画面の共通案内。
 * 「セットアップを開く」「マスター設定へ」の導線付き。
 */
export default function EmptyState({
  message,
  showSetup = true,
  showMasters = true,
}: {
  message: string;
  showSetup?: boolean;
  showMasters?: boolean;
}) {
  const openSetup = useUiStore((s) => s.openSetup);

  return (
    <div className="py-14 text-center border border-dashed border-gray-200 rounded-lg bg-white/50">
      <PackageOpen className="w-9 h-9 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-500 mb-5 whitespace-pre-line">{message}</p>
      <div className="flex items-center justify-center gap-2">
        {showSetup && (
          <button
            onClick={openSetup}
            className="flex items-center gap-1.5 text-xs bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 font-medium"
          >
            <Sparkles className="w-3.5 h-3.5" />
            セットアップを開く
          </button>
        )}
        {showMasters && (
          <Link
            href="/masters"
            className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 rounded px-4 py-2 hover:bg-gray-50"
          >
            <Settings className="w-3.5 h-3.5" />
            マスター設定へ
          </Link>
        )}
      </div>
    </div>
  );
}
