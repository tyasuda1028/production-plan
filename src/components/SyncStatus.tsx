"use client";

import { useUiStore } from "@/lib/uiStore";
import { supabaseEnabled } from "@/lib/supabaseClient";
import { Cloud, CloudOff, Check, Loader2, HardDrive } from "lucide-react";

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** サイドバー用：クラウド保存の同期状態インジケーター */
export default function SyncStatus() {
  const syncStatus = useUiStore((s) => s.syncStatus);
  const lastSavedAt = useUiStore((s) => s.lastSavedAt);

  if (!supabaseEnabled) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 px-1">
        <HardDrive className="w-3 h-3" />
        この端末に保存
      </div>
    );
  }

  if (syncStatus === "saving") {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-blue-500 px-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        保存中…
      </div>
    );
  }
  if (syncStatus === "error") {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-amber-600 px-1" title="クラウドへの保存に失敗しました。この端末には保存されています。接続が回復すると次の編集で再保存されます。">
        <CloudOff className="w-3 h-3" />
        同期エラー（ローカル保存）
      </div>
    );
  }
  if (syncStatus === "saved" && lastSavedAt) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-green-600 px-1">
        <Check className="w-3 h-3" />
        クラウド保存済み {fmtTime(lastSavedAt)}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 px-1">
      <Cloud className="w-3 h-3" />
      クラウド保存
    </div>
  );
}
