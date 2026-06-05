"use client";

import { useState, useMemo, useRef } from "react";
import { useMasterStore } from "@/lib/masterStore";
import { getPlanMonths, formatYearMonth, addMonths } from "@/lib/data";
import { pmKey } from "@/lib/masterTypes";
import { Upload, FileText, Check, AlertTriangle, Download, Search, RotateCcw, Trash2 } from "lucide-react";

interface PreviewRow {
  code: string;
  quantity: number;
  productName?: string;
  isKnown: boolean;
}

export default function InventoryImportTab() {
  const productMasters     = useMasterStore((s) => s.productMasters);
  const inventorySnapshots = useMasterStore((s) => s.inventorySnapshots);
  const importInventoryCSV = useMasterStore((s) => s.importInventoryCSV);
  const upsertInventory    = useMasterStore((s) => s.upsertInventory);
  const removeInventory    = useMasterStore((s) => s.removeInventory);
  const planBaseMonth      = useMasterStore((s) => s.planBaseMonth);

  const prevMonth  = addMonths(planBaseMonth, -1);
  const planMonths = getPlanMonths(planBaseMonth);
  const baseMonths = useMemo(() => [prevMonth, ...planMonths], [prevMonth, planMonths]);

  // 基準月 + スナップショットに含まれる月をまとめて表示列にする
  const displayMonths = useMemo(() => {
    const all = new Set<number>([...baseMonths, ...inventorySnapshots.map((s) => s.yearMonth)]);
    return Array.from(all).sort((a, b) => a - b);
  }, [baseMonths, inventorySnapshots]);

  // 在庫スナップショット索引: `${productCode}:${yearMonth}` → quantity
  const invMap = useMemo(() => {
    const m = new Map<string, number>();
    inventorySnapshots.forEach((s) => m.set(`${s.productCode}:${s.yearMonth}`, s.quantity));
    return m;
  }, [inventorySnapshots]);

  const getQty = (productId: string, ym: number) => invMap.get(`${productId}:${ym}`);

  const codeMap = useMemo(
    () => new Map(productMasters.map((p) => [p.code, p.modelCode])),
    [productMasters]
  );

  // ──────────────────────────────────────────────
  // CSV インポート（単月）
  // ──────────────────────────────────────────────
  const [targetYM, setTargetYM] = useState(prevMonth);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function parseCSV(text: string): PreviewRow[] {
    const cleaned = text.replace(/^\uFEFF/, "");
    const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
    const rows: PreviewRow[] = [];
    const start = lines[0]?.toLowerCase().includes("コード") || lines[0]?.toLowerCase().includes("code") ? 1 : 0;
    for (let i = start; i < lines.length; i++) {
      const parts = lines[i].split(",").map((s) => s.trim());
      if (parts.length < 2) continue;
      const code = parts[0];
      const qty = parseInt(parts[1]);
      if (!code || isNaN(qty)) continue;
      rows.push({
        code,
        quantity: qty,
        productName: codeMap.get(code),
        isKnown: codeMap.has(code),
      });
    }
    return rows;
  }

  function handleFile(file: File) {
    setError(""); setSuccess("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCSV(e.target?.result as string);
        if (rows.length === 0) { setError("有効なデータが見つかりません"); return; }
        setPreview(rows);
      } catch {
        setError("CSVの解析に失敗しました");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) handleFile(f);
  }

  function confirmImport() {
    if (!preview) return;
    importInventoryCSV(targetYM, preview.map((r) => ({ code: r.code, quantity: r.quantity })));
    setSuccess(`${preview.length}件の在庫データをインポートしました（${formatYearMonth(targetYM)}）`);
    setPreview(null);
    setTimeout(() => setSuccess(""), 5000);
  }

  // CSVテンプレートDL（対象月の現在値入り）
  function downloadTemplate() {
    const header = "製品コード,在庫数";
    const rows = productMasters.map((p) => `${p.code},${getQty(pmKey(p), targetYM) ?? 0}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `在庫インポートテンプレート_${targetYM}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ──────────────────────────────────────────────
  // 手入力グリッド
  // ──────────────────────────────────────────────
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      productMasters.filter((pm) => {
        if (pm.active === false) return false;
        const q = search.toLowerCase();
        return !q || pm.code.toLowerCase().includes(q) || pm.modelCode.toLowerCase().includes(q);
      }),
    [search, productMasters]
  );

  function handleBlur(productId: string, ym: number, rawValue: string) {
    const num = parseInt(rawValue.replace(/,/g, ""), 10);
    if (isNaN(num) || num < 0) return;
    if (num === 0) {
      removeInventory(ym, productId);
    } else {
      upsertInventory({
        yearMonth: ym,
        productCode: productId,
        quantity: num,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  function hasAnyQty(productId: string) {
    return displayMonths.some((ym) => getQty(productId, ym) !== undefined);
  }

  function clearProduct(productId: string) {
    displayMonths.forEach((ym) => removeInventory(ym, productId));
  }

  function clearMonth(ym: number) {
    useMasterStore.setState((s) => ({
      inventorySnapshots: s.inventorySnapshots.filter((i) => i.yearMonth !== ym),
    }));
  }

  const filledCount = inventorySnapshots.length;

  return (
    <div className="space-y-4">
      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-700">
        品目ごとに在庫数を入力します。生産計画・シミュレーションの起点になるのは
        <strong>前月末（{formatYearMonth(prevMonth)}）の在庫</strong>です（青色の列）。
        画面から直接入力するか、CSVで一括取り込みできます。
      </div>

      {/* CSVで一括インポート */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">CSVで一括インポート（単月）</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">対象月：</label>
            <select
              value={targetYM}
              onChange={(e) => { setTargetYM(+e.target.value); setPreview(null); }}
              className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white font-medium"
            >
              {displayMonths.map((m) => (
                <option key={m} value={m}>{formatYearMonth(m)}{m === prevMonth ? "（前月末・基準）" : ""}</option>
              ))}
            </select>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 text-xs border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50 ml-auto"
          >
            <Download className="w-3.5 h-3.5" />テンプレートDL（現在値入り）
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded p-2.5 text-xs text-blue-700">
          <strong>CSV形式：</strong> 1行目ヘッダー（省略可）、2列目以降：製品コード, 在庫数
          <br />例： <code className="bg-blue-100 px-1 rounded">1001,530</code>
        </div>

        {!preview ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}
          >
            <Upload className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">CSVファイルをドロップ または クリックして選択</p>
            <p className="text-xs text-gray-400 mt-1">製品コード, 在庫数 → {formatYearMonth(targetYM)} に取り込み</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{preview.length}件のデータを確認</span>
                <span className="text-xs text-gray-400">
                  （既知: {preview.filter((r) => r.isKnown).length}件 / 未登録: {preview.filter((r) => !r.isKnown).length}件）
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPreview(null)}
                  className="text-xs border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50">キャンセル</button>
                <button onClick={confirmImport}
                  className="flex items-center gap-1.5 text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700">
                  <Check className="w-3.5 h-3.5" />{formatYearMonth(targetYM)} にインポート確定
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">製品コード</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">製品名</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">在庫数</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">状態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.map((r) => (
                    <tr key={r.code} className={`hover:bg-gray-50 ${!r.isKnown ? "bg-amber-50/50" : ""}`}>
                      <td className="px-3 py-2 text-xs font-mono text-gray-600">{r.code}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{r.productName ?? <span className="text-amber-600">未登録品目</span>}</td>
                      <td className="px-3 py-2 text-right text-xs font-medium text-gray-800">{r.quantity.toLocaleString()}</td>
                      <td className="px-3 py-2 text-center">
                        {r.isKnown
                          ? <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">OK</span>
                          : <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">未登録</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded p-3">
            <Check className="w-4 h-4 shrink-0" />{success}
          </div>
        )}
      </div>

      {/* 検索バー */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm bg-white border border-gray-200 rounded px-3 py-1.5">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="品目コード・品名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm border-none outline-none bg-transparent"
          />
        </div>
        {filledCount > 0 && (
          <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1">
            {filledCount} セル入力中
          </span>
        )}
      </div>

      {/* グリッドテーブル */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap sticky left-0 bg-gray-50 z-10">品目コード</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap sticky left-[120px] bg-gray-50 z-10">品名</th>
                {displayMonths.map((ym) => (
                  <th key={ym} className={`px-2 py-2 text-right text-xs font-medium whitespace-nowrap min-w-[90px] ${ym === prevMonth ? "text-blue-600" : "text-gray-400"}`}>
                    <div className="flex items-center justify-end gap-1">
                      <span>{formatYearMonth(ym)}{ym === prevMonth ? "（基準）" : ""}</span>
                      <button
                        onClick={() => clearMonth(ym)}
                        title={`${formatYearMonth(ym)}の在庫を全削除`}
                        className="p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((pm) => {
                const id = pmKey(pm);
                const modified = hasAnyQty(id);
                return (
                  <tr key={id} className={`hover:bg-gray-50 ${modified ? "bg-blue-50/30" : ""}`}>
                    <td className="px-3 py-2 text-xs font-mono font-semibold text-gray-800 whitespace-nowrap sticky left-0 bg-inherit z-10">
                      {pm.code || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 font-mono whitespace-nowrap sticky left-[120px] bg-inherit z-10">
                      {pm.modelCode}
                    </td>
                    {displayMonths.map((ym) => {
                      const qty        = getQty(id, ym);
                      const displayVal = qty ?? 0;
                      const changed    = qty !== undefined && qty !== 0;
                      const isBase     = ym === prevMonth;
                      return (
                        <td key={ym} className="px-2 py-1.5 text-right">
                          <input
                            type="number"
                            defaultValue={displayVal}
                            key={`${id}-${ym}-${displayVal}`}
                            min={0}
                            onBlur={(e) => handleBlur(id, ym, e.target.value)}
                            className={`w-20 text-right text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                              changed
                                ? isBase
                                  ? "border-blue-400 bg-blue-50 text-blue-800 font-semibold"
                                  : "border-gray-300 bg-gray-50 text-gray-700 font-medium"
                                : "border-gray-200 bg-white text-gray-700"
                            }`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center">
                      {modified && (
                        <button
                          onClick={() => clearProduct(id)}
                          title="この品目の在庫をリセット"
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">
              {productMasters.length === 0
                ? "製品マスターに品目が登録されていません"
                : "該当する品目が見つかりません"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
