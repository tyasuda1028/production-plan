"use client";

import { useState } from "react";
import { useMasterStore } from "@/lib/masterStore";
import { LineMaster } from "@/lib/masterTypes";
import { Pencil, Check, X, Plus, Trash2 } from "lucide-react";

function EditableCell({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={type === "number" ? 0 : undefined}
      className={`w-full text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white ${className}`}
    />
  );
}

const EMPTY_LINE: Omit<LineMaster, "lineNumber"> = {
  classification: "",
  factoryName: "",
  lineName: "",
  dailyCapacity: 0,
};

export default function LineSettingsTab() {
  const { lineMasters, addLineMaster, updateLineMaster, replaceLineMaster, deleteLineMaster } = useMasterStore();

  const [editing, setEditing] = useState<number | null>(null);       // 編集中の元ライン番号
  const [editOriginalNum, setEditOriginalNum] = useState<number | null>(null);
  const [editBuf, setEditBuf] = useState<LineMaster | null>(null);

  const [adding, setAdding] = useState(false);
  const [newBuf, setNewBuf] = useState<{ lineNumber: string } & Omit<LineMaster, "lineNumber">>({
    lineNumber: "",
    ...EMPTY_LINE,
  });
  const [addError, setAddError] = useState("");

  // ── 編集 ──
  function startEdit(l: LineMaster) {
    setAdding(false);
    setEditing(l.lineNumber);
    setEditOriginalNum(l.lineNumber);
    setEditBuf({ ...l });
  }

  function saveEdit() {
    if (!editBuf || editOriginalNum === null) return;
    const updated: LineMaster = { ...editBuf, dailyCapacity: Number(editBuf.dailyCapacity) || 0 };
    if (updated.lineNumber !== editOriginalNum) {
      replaceLineMaster(editOriginalNum, updated);
    } else {
      updateLineMaster(editOriginalNum, updated);
    }
    setEditing(null);
    setEditOriginalNum(null);
    setEditBuf(null);
  }

  function cancelEdit() {
    setEditing(null);
    setEditOriginalNum(null);
    setEditBuf(null);
  }

  // ── 追加 ──
  function startAdd() {
    setEditing(null);
    setEditBuf(null);
    setNewBuf({ lineNumber: "", ...EMPTY_LINE });
    setAddError("");
    setAdding(true);
  }

  function saveAdd() {
    const lineNumber = parseInt(newBuf.lineNumber, 10);
    if (isNaN(lineNumber) || lineNumber <= 0) {
      setAddError("ライン番号は正の整数で入力してください");
      return;
    }
    if (lineMasters.some((l) => l.lineNumber === lineNumber)) {
      setAddError(`ライン ${lineNumber} はすでに存在します`);
      return;
    }
    if (!newBuf.classification.trim()) {
      setAddError("分類を入力してください");
      return;
    }
    if (!newBuf.lineName.trim()) {
      setAddError("ライン名を入力してください");
      return;
    }
    addLineMaster({
      lineNumber,
      classification: newBuf.classification.trim(),
      factoryName: newBuf.factoryName.trim(),
      lineName: newBuf.lineName.trim(),
      dailyCapacity: Number(newBuf.dailyCapacity) || 0,
    });
    setAdding(false);
    setNewBuf({ lineNumber: "", ...EMPTY_LINE });
    setAddError("");
  }

  function cancelAdd() {
    setAdding(false);
    setAddError("");
  }

  return (
    <div className="space-y-4">
      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-700">
        各ラインに<strong>分類・工場名・ライン名・日量能力</strong>を設定します。
        日量能力はダッシュボードの日量推移グラフの基準線に反映されます。
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
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 whitespace-nowrap">日量能力（台/日）</th>
              <th className="px-4 py-2.5 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lineMasters.map((l) =>
              editing === l.lineNumber && editBuf ? (
                /* ── 編集行 ── */
                <tr key={l.lineNumber} className="bg-blue-50/60">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400 whitespace-nowrap">ライン</span>
                      <EditableCell
                        type="number"
                        value={String(editBuf.lineNumber)}
                        onChange={(v) => setEditBuf({ ...editBuf, lineNumber: parseInt(v) || editBuf.lineNumber })}
                        placeholder="番号"
                        className="w-14"
                      />
                    </div>
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
                    <EditableCell
                      type="number"
                      value={String(editBuf.dailyCapacity ?? "")}
                      onChange={(v) => setEditBuf({ ...editBuf, dailyCapacity: Number(v) })}
                      placeholder="例: 540"
                      className="text-right"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1 justify-end">
                      <button onClick={saveEdit} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={cancelEdit} className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                /* ── 表示行 ── */
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
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-xs font-semibold text-gray-800">
                      {(l.dailyCapacity ?? 0).toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">台/日</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => startEdit(l)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="編集"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`ライン ${l.lineNumber}（${l.lineName}）を削除しますか？`)) {
                            deleteLineMaster(l.lineNumber);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}

            {/* ── 追加入力行 ── */}
            {adding && (
              <tr className="bg-green-50/60 border-t-2 border-green-200">
                <td className="px-4 py-2">
                  <EditableCell
                    type="number"
                    value={newBuf.lineNumber}
                    onChange={(v) => { setNewBuf({ ...newBuf, lineNumber: v }); setAddError(""); }}
                    placeholder="番号"
                    className="w-16"
                  />
                </td>
                <td className="px-4 py-2">
                  <EditableCell
                    value={newBuf.classification}
                    onChange={(v) => setNewBuf({ ...newBuf, classification: v })}
                    placeholder="例: ブライツ"
                  />
                </td>
                <td className="px-4 py-2">
                  <EditableCell
                    value={newBuf.factoryName}
                    onChange={(v) => setNewBuf({ ...newBuf, factoryName: v })}
                    placeholder="例: 02工場"
                  />
                </td>
                <td className="px-4 py-2">
                  <EditableCell
                    value={newBuf.lineName}
                    onChange={(v) => setNewBuf({ ...newBuf, lineName: v })}
                    placeholder="例: ライン8"
                  />
                </td>
                <td className="px-4 py-2">
                  <EditableCell
                    type="number"
                    value={newBuf.dailyCapacity === 0 ? "" : String(newBuf.dailyCapacity)}
                    onChange={(v) => setNewBuf({ ...newBuf, dailyCapacity: Number(v) })}
                    placeholder="例: 400"
                    className="text-right"
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1 justify-end">
                    <button onClick={saveAdd} className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={cancelAdd} className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* エラー */}
        {addError && (
          <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">
            {addError}
          </div>
        )}

        {/* ラインを追加ボタン */}
        {!adding && (
          <div className="px-4 py-3 border-t border-gray-100">
            <button
              onClick={startAdd}
              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              ラインを追加
            </button>
          </div>
        )}
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
