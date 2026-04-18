"use client";

import { useState } from "react";
import { useMasterStore } from "@/lib/masterStore";
import { LineMaster } from "@/lib/masterTypes";
import { Pencil, Check, X } from "lucide-react";

function EditableCell({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
    />
  );
}

export default function LineSettingsTab() {
  const { lineMasters, updateLineMaster } = useMasterStore();
  const [editing, setEditing] = useState<number | null>(null);
  const [editBuf, setEditBuf] = useState<LineMaster | null>(null);

  function startEdit(l: LineMaster) {
    setEditing(l.lineNumber);
    setEditBuf({ ...l });
  }

  function saveEdit() {
    if (editBuf) {
      updateLineMaster(editBuf.lineNumber, editBuf);
      setEditing(null);
      setEditBuf(null);
    }
  }

  function cancelEdit() {
    setEditing(null);
    setEditBuf(null);
  }

  return (
    <div className="space-y-4">
      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-700">
        各ラインに<strong>分類・工場名・ライン名</strong>を設定します。
        設定内容はダッシュボードのラインサマリーや生産計画表のフィルターに反映されます。
      </div>

      {/* テーブル */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">ライン番号</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 whitespace-nowrap">分類</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 whitespace-nowrap">工場名</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 whitespace-nowrap">ライン名</th>
              <th className="px-4 py-2.5 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lineMasters.map((l) =>
              editing === l.lineNumber && editBuf ? (
                <tr key={l.lineNumber} className="bg-blue-50/60">
                  <td className="px-4 py-2 text-xs font-mono text-gray-500">
                    ライン {l.lineNumber}
                  </td>
                  <td className="px-4 py-2">
                    <EditableCell
                      value={editBuf.classification}
                      onChange={(v) => setEditBuf({ ...editBuf, classification: v })}
                      placeholder="例: ブライツ"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <EditableCell
                      value={editBuf.factoryName}
                      onChange={(v) => setEditBuf({ ...editBuf, factoryName: v })}
                      placeholder="例: 02工場"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <EditableCell
                      value={editBuf.lineName}
                      onChange={(v) => setEditBuf({ ...editBuf, lineName: v })}
                      placeholder="例: ライン2"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button
                        onClick={saveEdit}
                        className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={l.lineNumber} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-500">
                    ライン {l.lineNumber}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                      {l.classification}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">{l.factoryName}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">{l.lineName}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => startEdit(l)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* プレビュー */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-medium text-gray-600 mb-2">フィルター選択肢プレビュー</p>
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <div>
            <span className="text-gray-400">分類：</span>
            {[...new Set(lineMasters.map((l) => l.classification))].map((c) => (
              <span key={c} className="ml-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{c}</span>
            ))}
          </div>
          <div>
            <span className="text-gray-400">工場名：</span>
            {[...new Set(lineMasters.map((l) => l.factoryName))].map((f) => (
              <span key={f} className="ml-1 bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{f}</span>
            ))}
          </div>
          <div>
            <span className="text-gray-400">ライン名：</span>
            {lineMasters.map((l) => (
              <span key={l.lineNumber} className="ml-1 bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">{l.lineName}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
