"use client";

import { useEffect } from "react";
import { useUiStore } from "@/lib/uiStore";
import { AlertTriangle, HelpCircle } from "lucide-react";

/**
 * アプリ共通の確認ダイアログ（ブラウザ標準 confirm() の代替）。
 * uiStore.requestConfirm() で表示し、Promise<boolean> で結果を返す。
 */
export default function ConfirmDialog() {
  const confirmReq = useUiStore((s) => s.confirmReq);
  const resolveConfirm = useUiStore((s) => s.resolveConfirm);

  // Escape でキャンセル
  useEffect(() => {
    if (!confirmReq) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") resolveConfirm(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmReq, resolveConfirm]);

  if (!confirmReq) return null;

  const { message, danger, okLabel } = confirmReq;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={() => resolveConfirm(false)}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${danger ? "bg-red-100" : "bg-blue-100"}`}>
            {danger
              ? <AlertTriangle className="w-5 h-5 text-red-600" />
              : <HelpCircle className="w-5 h-5 text-blue-600" />}
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line pt-1.5">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => resolveConfirm(false)}
            className="text-xs border border-gray-200 text-gray-600 rounded px-4 py-2 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            autoFocus
            onClick={() => resolveConfirm(true)}
            className={`text-xs text-white rounded px-4 py-2 font-medium ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {okLabel ?? "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
