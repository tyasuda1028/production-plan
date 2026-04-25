"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useMasterStore } from "@/lib/masterStore";
import { getPlanMonths, formatYearMonth } from "@/lib/data";
import { ProductMaster, SalesPlanOverride, pmKey } from "@/lib/masterTypes";
import { Search, RotateCcw, Upload, Download, FileText, Check, AlertTriangle, Trash2 } from "lucide-react";

// ── CSV インポート関連型 ──
interface PreviewRow {
  productId: string;         // pmKey(pm)
  modelCode: string;         // 製造器種名（表示用）
  plans: { yearMonth: number; salesPlan: number }[];
  isKnown: boolean;
}

// ── CSV インポートセクション ──
function CsvImportSection({
  planMonths,
  onImport,
  productMasters,
  salesPlanOverrides,
}: {
  planMonths: number[];
  onImport: (rows: PreviewRow[]) => void;
  productMasters: ProductMaster[];
  salesPlanOverrides: SalesPlanOverride[];
}) {
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 製造器種名 → ProductMaster 逆引きマップ
  const pmByModelCode = useMemo(
    () => new Map(productMasters.map((pm) => [pm.modelCode, pm])),
    [productMasters]
  );

  // 品目コード → ProductMaster 逆引きマップ
  const pmByCode = useMemo(() => {
    const map = new Map<string, ProductMaster>();
    productMasters.forEach((pm) => {
      if (pm.code) map.set(pm.code, pm);
    });
    return map;
  }, [productMasters]);

  // 各種フォーマットの年月ヘッダーを YYYYMM 数値に変換
  function parseYearMonth(s: string): number | null {
    const t = s.trim();
    // YYYYMM（例: 202506）
    const n = parseInt(t);
    if (!isNaN(n) && n > 200000 && n < 210000) return n;
    // YYYY/MM または YYYY/M（例: 2025/06, 2025/6）
    const slash = t.match(/^(20\d{2})[\/\-](\d{1,2})$/);
    if (slash) return parseInt(slash[1]) * 100 + parseInt(slash[2]);
    // YYYY年M月 または YYYY年MM月（例: 2025年6月, 2025年06月）
    const jp = t.match(/^(20\d{2})年(\d{1,2})月?$/);
    if (jp) return parseInt(jp[1]) * 100 + parseInt(jp[2]);
    return null;
  }

  function parseCSV(text: string): PreviewRow[] {
    const cleaned = text.replace(/^\uFEFF/, "");
    const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error("データが不足しています");

    // ヘッダー: 品目コード, 製造器種名（参考）, 年月列...
    const headers = lines[0].split(",").map((s) => s.trim());
    const monthCols: { colIdx: number; ym: number }[] = [];
    for (let i = 0; i < headers.length; i++) {
      const ym = parseYearMonth(headers[i]);
      if (ym !== null) monthCols.push({ colIdx: i, ym });
    }
    if (monthCols.length === 0) throw new Error("月列（YYYYMM / YYYY/MM / YYYY年MM月 形式）が見つかりません");

    const rows: PreviewRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((s) => s.trim());
      const col0 = cols[0] ?? "";
      const col1 = cols[1] ?? "";
      if (!col0 && !col1) continue;

      // 照合順: ① 品目コード(col0) → ② 製造器種名(col0) → ③ 製造器種名(col1)
      const pm =
        (col0 ? pmByCode.get(col0) : undefined) ??
        pmByModelCode.get(col0) ??
        (col1 ? pmByModelCode.get(col1) : undefined);

      const plans = monthCols.map(({ colIdx, ym }) => ({
        yearMonth: ym,
        salesPlan: Math.max(0, parseInt(cols[colIdx] ?? "0") || 0),
      }));

      rows.push({
        productId: pm ? pmKey(pm) : "",
        modelCode: pm?.modelCode ?? (col1 || col0),
        plans,
        isKnown: !!pm,
      });
    }
    return rows;
  }

  function handleFile(file: File) {
    setError(""); setSuccess(""); setPreview(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCSV(e.target?.result as string);
        if (rows.length === 0) { setError("有効なデータが見つかりません"); return; }
        setPreview(rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "CSVの解析に失敗しました");
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
    const known = preview.filter((r) => r.isKnown);
    onImport(known);
    setSuccess(`${known.length}品目の販売計画をインポートしました`);
    setPreview(null);
    setTimeout(() => setSuccess(""), 5000);
  }

  // テンプレートDL: 現在の入力値（オーバーライド込み）を含む
  function downloadTemplate() {
    const header = ["品目コード", "製造器種名（参考）", ...planMonths.map(String)].join(",");
    const rows: string[] = [];
    productMasters.forEach((pm) => {
      const id = pmKey(pm);
      const vals = planMonths.map((ym) => {
        const override = salesPlanOverrides.find(
          (o) => o.productId === id && o.yearMonth === ym
        );
        return override !== undefined ? override.salesPlan : 0;
      });
      rows.push([pm.code, pm.modelCode, ...vals].join(","));
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `販売計画テンプレート_${planMonths[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Upload className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium text-gray-700">CSVで一括インポート</span>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded p-2.5 text-xs text-blue-700">
        <strong>CSV形式：</strong> 品目コード, 製造器種名（参考）, {planMonths.map(String).join(", ")}
        <br />品目コードで照合します。品目コードがない場合は製造器種名（参考）列で照合します。
      </div>

      {/* テンプレートDL */}
      <button
        onClick={downloadTemplate}
        className="flex items-center gap-1.5 text-xs bg-gray-700 text-white rounded px-3 py-2 hover:bg-gray-800 font-medium"
      >
        <Download className="w-3.5 h-3.5" />テンプレートDL（現在の入力値入り）
      </button>

      {/* ドロップゾーン or プレビュー */}
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
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{preview.length}品目を確認</span>
              <span className="text-xs text-gray-400">
                （照合済: {preview.filter((r) => r.isKnown).length}件
                {preview.filter((r) => !r.isKnown).length > 0 && (
                  <span className="text-amber-600"> / 未照合: {preview.filter((r) => !r.isKnown).length}件（スキップ）</span>
                )}）
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreview(null)}
                className="text-xs border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50">
                キャンセル
              </button>
              <button onClick={confirmImport}
                className="flex items-center gap-1.5 text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700">
                <Check className="w-3.5 h-3.5" />インポート確定
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">製造器種名</th>
                  {preview[0]?.plans.map(({ yearMonth }) => (
                    <th key={yearMonth} className="px-3 py-2 text-right font-medium text-blue-600 whitespace-nowrap">
                      {formatYearMonth(yearMonth)}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-medium text-gray-500">照合</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((r, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${!r.isKnown ? "bg-amber-50/50" : ""}`}>
                    <td className="px-3 py-2 font-mono text-gray-600 whitespace-nowrap">{r.modelCode}</td>
                    {r.plans.map(({ yearMonth, salesPlan }) => (
                      <td key={yearMonth} className="px-3 py-2 text-right font-medium text-gray-800">
                        {salesPlan.toLocaleString()}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center">
                      {r.isKnown
                        ? <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">OK</span>
                        : <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">スキップ</span>}
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
  );
}

// ── メインコンポーネント ──
export default function SalesPlanTab() {
  const planBaseMonth        = useMasterStore((s) => s.planBaseMonth);
  const setPlanBaseMonth     = useMasterStore((s) => s.setPlanBaseMonth);
  const salesPlanOverrides   = useMasterStore((s) => s.salesPlanOverrides);
  const setSalesPlanOverride = useMasterStore((s) => s.setSalesPlanOverride);
  const clearSalesPlanOverride = useMasterStore((s) => s.clearSalesPlanOverride);
  const productMasters       = useMasterStore((s) => s.productMasters);

  const planMonths = getPlanMonths(planBaseMonth);

  // オーバーライドに含まれる全月 + 計画月 を統合して表示列にする
  const displayMonths = useMemo(() => {
    const all = new Set<number>([
      ...planMonths,
      ...salesPlanOverrides.map((o) => o.yearMonth),
    ]);
    return Array.from(all).sort((a, b) => a - b);
  }, [planMonths, salesPlanOverrides]);

  const [search, setSearch] = useState("");

  const filtered = useMemo(() =>
    productMasters.filter((pm) => {
      if (pm.active === false) return false;
      const q = search.toLowerCase();
      return !q
        || pm.code.toLowerCase().includes(q)
        || pm.modelCode.toLowerCase().includes(q);
    }),
    [search, productMasters]
  );

  const getOverride = useCallback(
    (productId: string, ym: number) =>
      salesPlanOverrides.find((o) => o.productId === productId && o.yearMonth === ym)?.salesPlan,
    [salesPlanOverrides]
  );

  function handleBlur(productId: string, ym: number, rawValue: string) {
    const num = parseInt(rawValue.replace(/,/g, ""), 10);
    if (isNaN(num) || num < 0) return;
    if (num === 0) {
      clearSalesPlanOverride(productId, ym);
    } else {
      setSalesPlanOverride(productId, ym, num);
    }
  }

  function hasAnyOverride(productId: string) {
    return displayMonths.some((ym) => getOverride(productId, ym) !== undefined);
  }

  function clearProduct(productId: string) {
    displayMonths.forEach((ym) => clearSalesPlanOverride(productId, ym));
  }

  // CSVインポート確定（一括でstate更新し、Supabase書き込みを1回にまとめる）
  function handleCsvImport(rows: PreviewRow[]) {
    // CSV内の全yearMonthを収集し、最小月を planBaseMonth に自動セット
    const allYearMonths = rows.flatMap((r) => r.plans.map((p) => p.yearMonth)).filter((ym) => ym > 200000);
    const csvFirstMonth = allYearMonths.length > 0 ? Math.min(...allYearMonths) : null;

    useMasterStore.setState((s) => {
      const importKeys = new Set<string>();
      rows.forEach((row) => {
        if (!row.productId) return;
        row.plans.forEach(({ yearMonth }) => {
          importKeys.add(`${row.productId}:${yearMonth}`);
        });
      });

      const kept = s.salesPlanOverrides.filter(
        (o) => !importKeys.has(`${o.productId}:${o.yearMonth}`)
      );

      const added: typeof s.salesPlanOverrides = [];
      rows.forEach((row) => {
        if (!row.productId) return;
        row.plans.forEach(({ yearMonth, salesPlan }) => {
          if (salesPlan > 0) {
            added.push({ productId: row.productId, yearMonth, salesPlan });
          }
        });
      });

      return {
        salesPlanOverrides: [...kept, ...added],
        // CSVの先頭月が現在の計画開始月と異なる場合は自動更新
        ...(csvFirstMonth && csvFirstMonth !== s.planBaseMonth ? { planBaseMonth: csvFirstMonth } : {}),
      };
    });
  }

  const overrideCount = salesPlanOverrides.length;

  function clearMonth(ym: number) {
    useMasterStore.setState((s) => ({
      salesPlanOverrides: s.salesPlanOverrides.filter((o) => o.yearMonth !== ym),
    }));
  }

  return (
    <div className="space-y-4">
      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-700">
        品目ごとに<strong>先6ヶ月分の販売計画</strong>を入力します。
        CSVで一括取り込みするには「テンプレートDL」でファイルを取得し、値を編集してインポートしてください。
      </div>

      {/* CSVインポート */}
      <CsvImportSection
        planMonths={planMonths}
        onImport={handleCsvImport}
        productMasters={productMasters}
        salesPlanOverrides={salesPlanOverrides}
      />

      {/* 検索バー */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm bg-white border border-gray-200 rounded px-3 py-1.5">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="品目コード・製造器種名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm border-none outline-none bg-transparent"
          />
        </div>
        {overrideCount > 0 && (
          <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1">
            {overrideCount} セル入力中
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
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap sticky left-[120px] bg-gray-50 z-10">製造器種名</th>
                {displayMonths.map((ym) => (
                  <th key={ym} className={`px-2 py-2 text-right text-xs font-medium whitespace-nowrap min-w-[90px] ${planMonths.includes(ym) ? "text-blue-600" : "text-gray-400"}`}>
                    <div className="flex items-center justify-end gap-1">
                      <span>{formatYearMonth(ym)}</span>
                      <button
                        onClick={() => clearMonth(ym)}
                        title={`${formatYearMonth(ym)}の販売計画を全削除`}
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
                const modified = hasAnyOverride(id);
                return (
                  <tr key={id} className={`hover:bg-gray-50 ${modified ? "bg-blue-50/30" : ""}`}>
                    <td className="px-3 py-2 text-xs font-mono font-semibold text-gray-800 whitespace-nowrap sticky left-0 bg-inherit z-10">
                      {pm.code || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 font-mono whitespace-nowrap sticky left-[120px] bg-inherit z-10">
                      {pm.modelCode}
                    </td>
                    {displayMonths.map((ym) => {
                      const overrideVal = getOverride(id, ym);
                      const displayVal  = overrideVal ?? 0;
                      const changed     = overrideVal !== undefined && overrideVal !== 0;
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
                                ? "border-blue-400 bg-blue-50 text-blue-800 font-semibold"
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
                          title="この品目の変更をリセット"
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
