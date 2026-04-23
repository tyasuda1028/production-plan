"use client";

import { useState } from "react";
import { useMasterStore } from "@/lib/masterStore";
import { FactoryMaster } from "@/lib/masterTypes";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

const emptyFactory = (): FactoryMaster => ({
  factoryName: "",
  classification: "",
  note: "",
});

function EditableCell({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white ${className}`}
    />
  );
}

export default function FactoryMasterTab() {
  const { factoryMasters, addFactory, updateFactory, deleteFactory, lineMasters } = useMasterStore();

  const [editing, setEditing] = useState<string | null>(null); // factoryName をキーとして使用
  const [editBuf, setEditBuf] = useState<FactoryMaster>(emptyFactory());
  const [editOriginalName, setEditOriginalName] = useState<string>("");

  const [adding, setAdding] = useState(false);
  const [newBuf, setNewBuf] = useState<FactoryMaster>(emptyFactory());
  const [addError, setAddError] = useState("");

  // 工場ごとのライン数
  const lineCountByFactory = (factoryName: string) =>
    lineMasters.filter((l) => l.factoryName === factoryName).length;

  // ── 編集 ──
  function startEdit(f: FactoryMaster) {
    setAdding(false);
    setEditing(f.factoryName);
    setEditOriginalName(f.factoryName);
    setEditBuf({ ...f });
  }

  function saveEdit() {
    if (!editBuf.factoryName.trim()) { return; }
    // 工場名が変わった場合、重複チェック
    if (
      editBuf.factoryName !== editOriginalName &&
      factoryMasters.some((f) => f.factoryName === editBuf.factoryName)
    ) {
      return;
    }
    // 工場名が変わった場合は削除して追加（主キー変更）
    if (editBuf.factoryName !== editOriginalName) {
      deleteFactory(editOriginalName);
      addFactory(editBuf);
      // 関連するラインマスターの工場名も更新
      useMasterStore.setState((s) => ({
        lineMasters: s.lineMasters.map((l) =>
          l.factoryName === editOriginalName
            ? { ...l, factoryName: editBuf.factoryName, classification: editBuf.classification }
            : l
        ),
      }));
    } else {
      updateFactory(editOriginalName, editBuf);
    }
    setEditing(null);
  }

  function cancelEdit() {
    setEditing(null);
  }

  // ── 追加 ──
  function startAdd() {
    setEditing(null);
    setNewBuf(emptyFactory());
    setAddError("");
    setAdding(true);
  }

  function saveAdd() {
    if (!newBuf.factoryName.trim()) {
      setAddError("工場名を入力してください");
      return;
    }
    if (factoryMasters.some((f) => f.factoryName === newBuf.factoryName)) {
      setAddError(`「${newBuf.factoryName}」はすでに登録されています`);
      return;
    }
    if (!newBuf.classification.trim()) {
      setAddError("分類を入力してください");
      return;
    }
    addFactory(newBuf);
    setAdding(false);
    setNewBuf(emptyFactory());
    setAddError("");
  }

  function cancelAdd() {
    setAdding(false);
    setAddError("");
  }

  function handleDelete(f: FactoryMaster) {
    const count = lineCountByFactory(f.factoryName);
    const msg =
      count > 0
        ? `「${f.factoryName}」を削除しますか？\n（この工場を設定している ${count} ラインの工場名はそのまま残ります）`
        : `「${f.factoryName}」を削除しますか？`;
    if (confirm(msg)) deleteFactory(f.factoryName);
  }

  return (
    <div className="space-y-4">
      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-700">
        工場名・分類を管理します。ラインマスターで工場を選択すると、分類が自動補完されます。
      </div>

      {/* 追加ボタン */}
      <div className="flex items-center gap-2">
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700"
        >
          <Plus className="w-3.5 h-3.5" />工場追加
        </button>
        <span className="ml-auto text-xs text-gray-400">{factoryMasters.length} 工場</span>
      </div>

      {/* テーブル */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 whitespace-nowrap">工場名</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 whitespace-nowrap">分類</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">備考</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-400 whitespace-nowrap">ライン数</th>
              <th className="px-4 py-2.5 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* 追加行 */}
            {adding && (
              <tr className="bg-blue-50/60 border-b border-blue-200">
                <td className="px-4 py-2">
                  <EditableCell
                    value={newBuf.factoryName}
                    onChange={(v) => { setNewBuf({ ...newBuf, factoryName: v }); setAddError(""); }}
                    placeholder="例: 01工場"
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
                    value={newBuf.note}
                    onChange={(v) => setNewBuf({ ...newBuf, note: v })}
                    placeholder="任意"
                  />
                </td>
                <td />
                <td className="px-4 py-2">
                  <div className="flex gap-1 justify-end">
                    <button onClick={saveAdd} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={cancelAdd} className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {factoryMasters.map((f) =>
              editing === f.factoryName ? (
                /* 編集行 */
                <tr key={f.factoryName} className="bg-blue-50/60">
                  <td className="px-4 py-2">
                    <EditableCell
                      value={editBuf.factoryName}
                      onChange={(v) => setEditBuf({ ...editBuf, factoryName: v })}
                      placeholder="例: 01工場"
                    />
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
                      value={editBuf.note}
                      onChange={(v) => setEditBuf({ ...editBuf, note: v })}
                      placeholder="任意"
                    />
                  </td>
                  <td className="px-4 py-2 text-center text-xs text-gray-400">
                    {lineCountByFactory(f.factoryName)}
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
                /* 表示行 */
                <tr key={f.factoryName} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs font-semibold text-gray-800">{f.factoryName}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                      {f.classification}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{f.note || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="text-xs text-gray-500">
                      {lineCountByFactory(f.factoryName)}
                      <span className="text-gray-400 ml-0.5">本</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => startEdit(f)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(f)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        {factoryMasters.length === 0 && !adding && (
          <div className="py-8 text-center text-gray-400 text-sm">工場が登録されていません</div>
        )}

        {/* エラー */}
        {addError && (
          <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">
            {addError}
          </div>
        )}
      </div>
    </div>
  );
}
