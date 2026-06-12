"use client";

import { useState, useMemo } from "react";
import { useMasterStore } from "@/lib/masterStore";
import { useUiStore } from "@/lib/uiStore";
import { pmKey } from "@/lib/masterTypes";
import { Plus, Trash2, Upload, Download, Search, ListTree } from "lucide-react";

/**
 * BOM（部品構成）タブ。
 * 製品を選択し、その製品1台あたりの部材使用量（員数）を登録する。
 * 単階層（製品→部材）。MRP（所要量計算）の入力になる。
 */
export default function BomTab() {
  const productMasters  = useMasterStore((s) => s.productMasters);
  const materialMasters = useMasterStore((s) => s.materialMasters);
  const bomLines        = useMasterStore((s) => s.bomLines);
  const upsertBomLine   = useMasterStore((s) => s.upsertBomLine);
  const deleteBomLine   = useMasterStore((s) => s.deleteBomLine);
  const importBom       = useMasterStore((s) => s.importBom);

  const requestConfirm = useUiStore((s) => s.requestConfirm);
  const addToast = useUiStore((s) => s.addToast);

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [newMaterial, setNewMaterial] = useState("");
  const [newQty, setNewQty] = useState("1");

  const activeProducts = useMemo(
    () => productMasters.filter((p) => p.active !== false),
    [productMasters]
  );

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return activeProducts;
    return activeProducts.filter(
      (p) => p.code.toLowerCase().includes(q) || p.modelCode.toLowerCase().includes(q)
    );
  }, [search, activeProducts]);

  const selected = activeProducts.find((p) => pmKey(p) === selectedId) ?? null;

  const bomCountByProduct = useMemo(() => {
    const m = new Map<string, number>();
    bomLines.forEach((b) => m.set(b.productId, (m.get(b.productId) ?? 0) + 1));
    return m;
  }, [bomLines]);

  const linesForSelected = useMemo(
    () => bomLines.filter((b) => b.productId === selectedId)
      .sort((a, b) => a.materialCode.localeCompare(b.materialCode)),
    [bomLines, selectedId]
  );

  const materialName = (code: string) => materialMasters.find((m) => m.code === code);

  function addLine() {
    if (!selectedId || !newMaterial) return;
    const qty = parseFloat(newQty);
    if (isNaN(qty) || qty <= 0) { addToast("error", "員数は正の数で入力してください"); return; }
    upsertBomLine(selectedId, newMaterial, qty);
    setNewQty("1");
    setNewMaterial("");
  }

  function handleQtyBlur(materialCode: string, raw: string) {
    const qty = parseFloat(raw.replace(/,/g, ""));
    if (isNaN(qty) || qty <= 0) return;
    upsertBomLine(selectedId, materialCode, qty);
  }

  async function handleDeleteLine(materialCode: string) {
    const m = materialName(materialCode);
    const ok = await requestConfirm(
      `構成から「${m?.name ?? materialCode}」を外しますか？`,
      { danger: true, okLabel: "外す" }
    );
    if (!ok) return;
    deleteBomLine(selectedId, materialCode);
  }

  // ── CSV（全BOM一括） ──
  function exportCsv() {
    const header = "品目コード,部材コード,員数";
    const rows = bomLines.map((b) => [b.productId, b.materialCode, b.qtyPer].join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "BOM部品構成.csv";
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
        const start = lines[0]?.includes("コード") ? 1 : 0;
        const productIds = new Set(activeProducts.map((p) => pmKey(p)));
        const materialCodes = new Set(materialMasters.map((m) => m.code));
        const rows: { productId: string; materialCode: string; qtyPer: number }[] = [];
        let skipped = 0;
        for (let i = start; i < lines.length; i++) {
          const cols = lines[i].split(",").map((s) => s.trim());
          const productId = cols[0] ?? "";
          const materialCode = cols[1] ?? "";
          const qtyPer = parseFloat(cols[2] ?? "");
          if (!productId || !materialCode || isNaN(qtyPer) || qtyPer <= 0) continue;
          if (!productIds.has(productId) || !materialCodes.has(materialCode)) { skipped++; continue; }
          rows.push({ productId, materialCode, qtyPer });
        }
        if (rows.length === 0) { addToast("error", "有効なBOM行が見つかりません（製品・部材の登録を確認してください）"); return; }
        importBom(rows);
        addToast("success", `BOM ${rows.length}行をインポートしました${skipped > 0 ? `（未登録の製品/部材 ${skipped}行はスキップ）` : ""}`);
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
        製品1台あたりに使う<strong>部材と員数（使用量）</strong>を登録します。
        登録すると「所要量計算（MRP）」で生産計画から部材の月別必要量を自動算出できます。
        部材は先に「部材マスター」へ登録してください。
      </div>

      {/* ツールバー */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-1.5 text-xs border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
          <Upload className="w-3.5 h-3.5" />CSVインポート（全BOM）
          <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
        </label>
        <button onClick={exportCsv}
          className="flex items-center gap-1.5 text-xs border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50">
          <Download className="w-3.5 h-3.5" />CSVエクスポート
        </button>
        <span className="text-xs text-gray-400">形式：品目コード, 部材コード, 員数</span>
        <span className="ml-auto text-xs text-gray-400">{bomLines.length} 行 / {bomCountByProduct.size} 製品</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        {/* 製品リスト */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="品目コード・品名で検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs border-none outline-none bg-transparent"
            />
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {filteredProducts.map((p) => {
              const id = pmKey(p);
              const count = bomCountByProduct.get(id) ?? 0;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedId(id)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                    selectedId === id ? "bg-blue-50 text-blue-800" : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <span className="font-mono text-gray-400 shrink-0">{p.code || "—"}</span>
                  <span className="flex-1 truncate">{p.modelCode}</span>
                  {count > 0 && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded shrink-0">{count}</span>
                  )}
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-gray-400">
                {activeProducts.length === 0 ? "製品マスターに品目がありません" : "該当なし"}
              </p>
            )}
          </div>
        </div>

        {/* 構成編集 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          {!selected ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              <ListTree className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              左のリストから製品を選択してください
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-800">{selected.modelCode}</h3>
                <span className="text-xs text-gray-400 font-mono">{selected.code}</span>
                <span className="text-xs text-gray-400 ml-auto">1台あたりの構成</span>
              </div>

              {/* 追加フォーム */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded p-2">
                <select
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white flex-1"
                >
                  <option value="">部材を選択...</option>
                  {materialMasters
                    .filter((m) => !linesForSelected.some((l) => l.materialCode === m.code))
                    .map((m) => (
                      <option key={m.code} value={m.code}>{m.code}：{m.name}</option>
                    ))}
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addLine(); }}
                  className="w-20 text-right text-xs border border-gray-200 rounded px-2 py-1.5"
                  placeholder="員数"
                />
                <button onClick={addLine}
                  disabled={!newMaterial}
                  className="flex items-center gap-1 text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700 disabled:opacity-40">
                  <Plus className="w-3.5 h-3.5" />追加
                </button>
              </div>
              {materialMasters.length === 0 && (
                <p className="text-xs text-amber-600">部材マスターが空です。先に「部材マスター」タブで部材を登録してください。</p>
              )}

              {/* 構成一覧 */}
              {linesForSelected.length === 0 ? (
                <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded p-4 text-center">
                  まだ構成部材がありません
                </p>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">部材コード</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">部材名</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">員数</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">単位</th>
                      <th className="px-3 py-2 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {linesForSelected.map((line) => {
                      const m = materialName(line.materialCode);
                      return (
                        <tr key={line.materialCode} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs font-mono font-semibold text-gray-800">{line.materialCode}</td>
                          <td className="px-3 py-2 text-xs text-gray-700">
                            {m?.name ?? <span className="text-amber-600">未登録部材</span>}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="text"
                              inputMode="decimal"
                              key={`${line.materialCode}-${line.qtyPer}`}
                              defaultValue={String(line.qtyPer)}
                              onFocus={(e) => e.target.select()}
                              onBlur={(e) => handleQtyBlur(line.materialCode, e.target.value)}
                              className="w-20 text-right text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500">{m?.unit ?? "—"}</td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => handleDeleteLine(line.materialCode)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
