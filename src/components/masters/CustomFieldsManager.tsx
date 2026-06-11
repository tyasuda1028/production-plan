"use client";

import { useState } from "react";
import { useMasterStore } from "@/lib/masterStore";
import { useUiStore } from "@/lib/uiStore";
import { CustomFieldTarget } from "@/lib/masterTypes";
import { Plus, X, Pencil, Check, Settings2 } from "lucide-react";

/**
 * マスターのカスタム項目（ユーザー定義の表示・メモ用フィールド）を
 * 追加・改名・削除する管理バー。製品／工場／ラインの各タブ先頭に置く。
 * 計算には使われない（コア項目は固定）。
 */
export default function CustomFieldsManager({ target }: { target: CustomFieldTarget }) {
  const fields = useMasterStore((s) =>
    target === "product" ? s.productFields : target === "factory" ? s.factoryFields : s.lineFields
  );
  const addCustomField = useMasterStore((s) => s.addCustomField);
  const renameCustomField = useMasterStore((s) => s.renameCustomField);
  const deleteCustomField = useMasterStore((s) => s.deleteCustomField);
  const requestConfirm = useUiStore((s) => s.requestConfirm);
  const addToast = useUiStore((s) => s.addToast);

  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  function handleAdd() {
    const t = newLabel.trim();
    if (!t) return;
    addCustomField(target, t);
    setNewLabel("");
  }

  function startEdit(id: string, label: string) {
    setEditingId(id);
    setEditLabel(label);
  }

  function saveEdit() {
    if (editingId && editLabel.trim()) renameCustomField(target, editingId, editLabel.trim());
    setEditingId(null);
  }

  async function handleDelete(id: string, label: string) {
    const ok = await requestConfirm(
      `カスタム項目「${label}」を削除します。\nこの列と入力済みの値もすべて消えます。よろしいですか？`,
      { danger: true, okLabel: "削除する" }
    );
    if (!ok) return;
    deleteCustomField(target, id);
    addToast("success", `カスタム項目「${label}」を削除しました`);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
        <Settings2 className="w-3.5 h-3.5 text-gray-400" />
        カスタム項目（表示・メモ用。計算には使われません）
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {fields.length === 0 && (
          <span className="text-xs text-gray-400">項目はありません。右の入力欄から追加できます。</span>
        )}
        {fields.map((f) =>
          editingId === f.id ? (
            <span key={f.id} className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded px-1.5 py-1">
              <input
                autoFocus
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                className="text-xs border border-blue-300 rounded px-1.5 py-0.5 w-28 focus:outline-none"
              />
              <button onClick={saveEdit} className="p-0.5 text-blue-600 hover:bg-blue-100 rounded"><Check className="w-3 h-3" /></button>
              <button onClick={() => setEditingId(null)} className="p-0.5 text-gray-400 hover:bg-gray-100 rounded"><X className="w-3 h-3" /></button>
            </span>
          ) : (
            <span key={f.id} className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded px-2 py-1 text-xs text-gray-700">
              {f.label}
              <button onClick={() => startEdit(f.id, f.label)} title="名前を変更" className="p-0.5 text-gray-400 hover:text-blue-600"><Pencil className="w-3 h-3" /></button>
              <button onClick={() => handleDelete(f.id, f.label)} title="削除" className="p-0.5 text-gray-400 hover:text-red-600"><X className="w-3 h-3" /></button>
            </span>
          )
        )}
        <span className="flex items-center gap-1 ml-auto">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            placeholder="項目名を入力"
            className="text-xs border border-gray-200 rounded px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button onClick={handleAdd} className="flex items-center gap-1 text-xs bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-700">
            <Plus className="w-3 h-3" />項目を追加
          </button>
        </span>
      </div>
    </div>
  );
}
