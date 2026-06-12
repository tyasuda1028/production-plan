"use client";

import { useState, useRef } from "react";
import { useMasterStore } from "@/lib/masterStore";
import { useUiStore } from "@/lib/uiStore";
import { MaterialMaster } from "@/lib/masterTypes";
import { Plus, Pencil, Trash2, Upload, Download, Check, X } from "lucide-react";

function EditableCell({ value, onChange, placeholder, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white ${className ?? ""}`}
    />
  );
}

const emptyMaterial = (): MaterialMaster => ({ code: "", name: "", unit: "個" });

export default function MaterialMasterTab() {
  const materialMasters = useMasterStore((s) => s.materialMasters);
  const addMaterial     = useMasterStore((s) => s.addMaterial);
  const updateMaterial  = useMasterStore((s) => s.updateMaterial);
  const deleteMaterial  = useMasterStore((s) => s.deleteMaterial);
  const importMaterials = useMasterStore((s) => s.importMaterials);
  const bomLines        = useMasterStore((s) => s.bomLines);
  const materialStocks  = useMasterStore((s) => s.materialStocks);
  const setMaterialStock = useMasterStore((s) => s.setMaterialStock);

  const requestConfirm = useUiStore((s) => s.requestConfirm);
  const addToast = useUiStore((s) => s.addToast);

  const [editing, setEditing] = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState<MaterialMaster>(emptyMaterial());
  const [adding, setAdding] = useState(false);
  const [newBuf, setNewBuf] = useState<MaterialMaster>(emptyMaterial());
  const [addError, setAddError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const stockOf = (code: string) => materialStocks.find((s) => s.materialCode === code)?.quantity ?? 0;
  const bomCountOf = (code: string) => bomLines.filter((b) => b.materialCode === code).length;

  function saveNew() {
    if (!newBuf.code.trim()) { setAddError("部材コードを入力してください"); return; }
    if (materialMasters.some((m) => m.code === newBuf.code.trim())) {
      setAddError(`部材コード「${newBuf.code.trim()}」は既に登録されています`);
      return;
    }
    if (!newBuf.name.trim()) { setAddError("部材名を入力してください"); return; }
    addMaterial({ code: newBuf.code.trim(), name: newBuf.name.trim(), unit: newBuf.unit.trim() || "個" });
    setAdding(false);
    setNewBuf(emptyMaterial());
    setAddError("");
  }

  function saveEdit() {
    if (!editing) return;
    updateMaterial(editing, { name: editBuf.name.trim(), unit: editBuf.unit.trim() || "個" });
    setEditing(null);
  }

  async function handleDelete(m: MaterialMaster) {
    const used = bomCountOf(m.code);
    const ok = await requestConfirm(
      used > 0
        ? `部材「${m.name}」（${m.code}）を削除しますか？\nこの部材を使う ${used} 件のBOM行と在庫も削除されます。`
        : `部材「${m.name}」（${m.code}）を削除しますか？`,
      { danger: true, okLabel: "削除する" }
    );
    if (!ok) return;
    deleteMaterial(m.code);
    addToast("success", `部材「${m.name}」を削除しました`);
  }

  function handleStockBlur(code: string, raw: string) {
    const n = parseInt(raw.replace(/,/g, ""), 10);
    if (isNaN(n) || n < 0) return;
    setMaterialStock(code, n);
  }

  // ── CSV ──
  function exportCsv() {
    const header = "部材コード,部材名,単位,現在庫";
    const rows = materialMasters.map((m) => [m.code, m.name, m.unit, stockOf(m.code)].join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "部材マスター.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = (ev.target?.result as string).replace(/^\uFEFF/, "");
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        const start = lines[0]?.includes("コード") || lines[0]?.toLowerCase().includes("code") ? 1 : 0;
        const rows: MaterialMaster[] = [];
        const stocks: { code: string; qty: number }[] = [];
        for (let i = start; i < lines.length; i++) {
          const cols = lines[i].split(",").map((s) => s.trim());
          const code = cols[0] ?? "";
          const name = cols[1] ?? "";
          if (!code || !name) continue;
          rows.push({ code, name, unit: cols[2] || "個" });
          const qty = parseInt((cols[3] ?? "").replace(/,/g, ""), 10);
          if (!isNaN(qty) && qty >= 0) stocks.push({ code, qty });
        }
        if (rows.length === 0) { addToast("error", "有効なデータが見つかりません"); return; }
        importMaterials(rows);
        stocks.forEach(({ code, qty }) => setMaterialStock(code, qty));
        addToast("success", `部材マスターに${rows.length}件をインポートしました`);
      } catch {
        addToast("error", "CSVの形式が正しくありません");
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-700">
        製品に使う<strong>部材（購入部品・原材料）</strong>を登録します。
        BOM（部品構成）と組み合わせると、生産計画から「所要量計算（MRP）」で月別の必要量を自動算出できます。
        現在庫はMRPの引当てに使われます。
      </div>

      {/* ツールバー */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => { setAdding(true); setNewBuf(emptyMaterial()); setAddError(""); }}
          className="flex items-center gap-1.5 text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700">
          <Plus className="w-3.5 h-3.5" />部材追加
        </button>
        <label className="flex items-center gap-1.5 text-xs border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
          <Upload className="w-3.5 h-3.5" />CSVインポート
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
        </label>
        <button onClick={exportCsv}
          className="flex items-center gap-1.5 text-xs border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50">
          <Download className="w-3.5 h-3.5" />CSVエクスポート
        </button>
        <span className="ml-auto text-xs text-gray-400">{materialMasters.length} 部材</span>
      </div>

      {/* CSV仕様 */}
      <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-700">
        <strong>CSV形式：</strong> 部材コード, 部材名, 単位, 現在庫
      </div>

      {/* テーブル */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 whitespace-nowrap">部材コード</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 whitespace-nowrap">部材名</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">単位</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 whitespace-nowrap">現在庫</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 whitespace-nowrap">BOM使用</th>
              <th className="px-4 py-2.5 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* 追加行 */}
            {adding && (
              <tr className="bg-blue-50/60 border-b border-blue-200">
                <td className="px-4 py-2 w-32">
                  <EditableCell value={newBuf.code} onChange={(v) => { setNewBuf({ ...newBuf, code: v }); setAddError(""); }} placeholder="例: M001" />
                </td>
                <td className="px-4 py-2">
                  <EditableCell value={newBuf.name} onChange={(v) => { setNewBuf({ ...newBuf, name: v }); setAddError(""); }} placeholder="例: 制御基板" />
                </td>
                <td className="px-4 py-2 w-24">
                  <EditableCell value={newBuf.unit} onChange={(v) => setNewBuf({ ...newBuf, unit: v })} placeholder="個" />
                </td>
                <td /><td />
                <td className="px-4 py-2">
                  <div className="flex gap-1 justify-end">
                    <button onClick={saveNew} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setAdding(false); setAddError(""); }} className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            )}

            {materialMasters.map((m) =>
              editing === m.code ? (
                <tr key={m.code} className="bg-blue-50/60">
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-500">{m.code}</td>
                  <td className="px-4 py-2">
                    <EditableCell value={editBuf.name} onChange={(v) => setEditBuf({ ...editBuf, name: v })} />
                  </td>
                  <td className="px-4 py-2 w-24">
                    <EditableCell value={editBuf.unit} onChange={(v) => setEditBuf({ ...editBuf, unit: v })} />
                  </td>
                  <td /><td />
                  <td className="px-4 py-2">
                    <div className="flex gap-1 justify-end">
                      <button onClick={saveEdit} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditing(null)} className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={m.code} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs font-mono font-semibold text-gray-800">{m.code}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">{m.name}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{m.unit}</td>
                  <td className="px-4 py-2.5 text-right">
                    <input
                      type="text"
                      inputMode="numeric"
                      key={`${m.code}-${stockOf(m.code)}`}
                      defaultValue={stockOf(m.code).toLocaleString()}
                      onFocus={(e) => e.target.select()}
                      onBlur={(e) => handleStockBlur(m.code, e.target.value)}
                      className="w-24 text-right text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs text-gray-500">
                    {bomCountOf(m.code) > 0
                      ? <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{bomCountOf(m.code)} 製品</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => { setEditing(m.code); setEditBuf({ ...m }); setAdding(false); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(m)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        {materialMasters.length === 0 && !adding && (
          <div className="py-8 text-center text-gray-400 text-sm">部材が登録されていません</div>
        )}
        {addError && (
          <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">{addError}</div>
        )}
      </div>
    </div>
  );
}
