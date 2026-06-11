"use client";

import { useUiStore } from "@/lib/uiStore";
import { Check, AlertTriangle, Info, X } from "lucide-react";

const STYLES = {
  success: { box: "bg-green-50 border-green-200 text-green-800", Icon: Check },
  error:   { box: "bg-red-50 border-red-200 text-red-700",       Icon: AlertTriangle },
  info:    { box: "bg-blue-50 border-blue-200 text-blue-700",    Icon: Info },
} as const;

/** 右下固定のトースト通知（uiStore.addToast で表示） */
export default function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] space-y-2 w-72">
      {toasts.map((t) => {
        const { box, Icon } = STYLES[t.type];
        return (
          <div key={t.id} className={`flex items-start gap-2 border rounded-lg shadow-sm px-3 py-2.5 text-xs ${box}`}>
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="p-0.5 opacity-50 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
