"use client";

import { useState, useRef } from "react";
import { useMasterStore } from "@/lib/masterStore";
import { getPlanMonths, formatYearMonth } from "@/lib/data";
import { Upload, FileText, Check, AlertTriangle, Download } from "lucide-react";

interface PreviewRow {
  code: string;
  quantity: number;
  productName?: string;
  isKnown: boolean;
}

export default function InventoryImportTab() {
  const { productMasters, importInventoryCSV, getInventory, inventorySnapshots, planBaseMonth } = useMasterStore();
  const planMonths = getPlanMonths(planBaseMonth);
  const [targetYM, setTargetYM] = useState(planBaseMonth);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const codeMap = new Map(productMasters.map((p) => [p.code, p.modelCode]));

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

  // CSVテンプレートダウンロード
  function downloadTemplate() {
    const header = "製品コード,在庫数";
    const rows = productMasters.map((p) => `${p.code},0`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `在庫インポートテンプレート_${targetYM}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 現在の在庫データ
  const currentInv = getInventory(targetYM);
  const snapCount = inventorySnapshots.filter((s) => s.yearMonth === targetYM).length;

  return (
    <div className="space-y-4">
      {/* 対象月 + テンプレート */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">対象月：</label>
          <select value={targetYM} onChange={(e) => { setTargetYM(+e.target.value); setPreview(null); }}
            className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white font-medium">
            {planMonths.map((m) => (
              <option key={m} value={m}>{formatYearMonth(m)}</option>
            ))}
          </select>
        </div>
        {snapCount > 0 && (
          <span className="text-xs text-green-600 bg-green-50 border border-green-200 rounded px-2 py-1">
            ✓ {snapCount}件 登録済み
          </span>
        )}
        <button onClick={downloadTemplate}
          className="flex items-center gap-1.5 text-xs border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50 ml-auto">
          <Download className="w-3.5 h-3.5" />テンプレートDL
        </button>
      </div>

      {/* CSV仕様 */}
      <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-700">
        <strong>CSV形式（truck-loaderと共通）：</strong> 1行目ヘッダー（省略可）、2列目以降：製品コード, 在庫数
        <br />例： <code className="bg-blue-100 px-1 rounded">1001,530</code>
      </div>

      {/* ドロップゾーン */}
      {!preview && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
            ${isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}
        >
          <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">CSVファイルをドロップ または クリックして選択</p>
          <p className="text-xs text-gray-400 mt-1">製品コード, 在庫数</p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
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

      {/* プレビュー */}
      {preview && (
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
                <Check className="w-3.5 h-3.5" />インポート確定
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
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

      {/* 登録済み在庫 */}
      {snapCount > 0 && !preview && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">登録済み在庫（{formatYearMonth(targetYM)}）</h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-medium text-gray-500">製品コード</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">製品名</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">在庫数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(currentInv).map(([code, qty]) => (
                  <tr key={code} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-gray-600">{code}</td>
                    <td className="px-3 py-2 text-gray-700">{codeMap.get(code) ?? "-"}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-800">{qty.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
