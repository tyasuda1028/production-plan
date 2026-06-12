"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useMasterStore } from "@/lib/masterStore";
import { useMrp } from "@/lib/useMrp";
import { formatYearMonth } from "@/lib/data";
import EmptyState from "@/components/EmptyState";
import { Search, Download } from "lucide-react";

export default function MrpPage() {
  const planBaseMonth = useMasterStore((s) => s.planBaseMonth);
  const bomLines = useMasterStore((s) => s.bomLines);
  const { months, rows } = useMrp();
  const [search, setSearch] = useState("");

  const now = new Date();
  const nowYM = now.getFullYear() * 100 + (now.getMonth() + 1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.material.code.toLowerCase().includes(q) ||
        r.material.name.toLowerCase().includes(q)
    );
  }, [rows, search]);

  // 月別合計（正味所要量がある部材数）
  const shortageCount = useMemo(
    () => rows.filter((r) => months.some((m) => (r.net.get(m) ?? 0) > 0)).length,
    [rows, months]
  );

  function exportCsv() {
    const header = ["部材コード", "部材名", "単位", "現在庫", ...months.flatMap((m) => [`${formatYearMonth(m)} 総所要量`, `${formatYearMonth(m)} 正味所要量`])].join(",");
    const lines = rows.map((r) =>
      [
        r.material.code,
        r.material.name,
        r.material.unit,
        r.startStock,
        ...months.flatMap((m) => [r.gross.get(m) ?? 0, r.net.get(m) ?? 0]),
      ].join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `所要量計算_${planBaseMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ページヘッダー */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800">所要量計算（MRP）</h1>
        <p className="text-sm text-gray-500 mt-1">
          生産計画 × BOM員数から部材の月別所要量を算出します（{formatYearMonth(months[0])} 〜 {formatYearMonth(months[months.length - 1])}）
        </p>
      </div>

      {bomLines.length === 0 ? (
        <EmptyState
          message={"BOM（部品構成）が登録されていません。\nマスター設定で部材とBOMを登録すると、生産計画から部材の所要量を自動計算します。"}
          showSetup={false}
        />
      ) : (
        <div className="space-y-4">
          {/* ツールバー */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 max-w-sm bg-white border border-gray-200 rounded px-3 py-1.5">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="部材コード・部材名で検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm border-none outline-none bg-transparent"
              />
            </div>
            {shortageCount > 0 && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                発注が必要な部材：{shortageCount} 件
              </span>
            )}
            <button onClick={exportCsv}
              className="flex items-center gap-1.5 text-xs bg-gray-700 text-white rounded px-3 py-1.5 hover:bg-gray-800 ml-auto">
              <Download className="w-3.5 h-3.5" />CSV出力
            </button>
          </div>

          {/* 凡例 */}
          <div className="text-xs text-gray-400">
            セル上段＝<strong className="text-amber-700">正味所要量（発注すべき量）</strong>、下段＝総所要量。在庫は月順に引き当てます。
          </div>

          {/* テーブル */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-max">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-700 whitespace-nowrap sticky left-0 bg-gray-50 z-10">部材コード</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-700 whitespace-nowrap">部材名</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">単位</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-700 whitespace-nowrap">現在庫</th>
                    {months.map((ym) => (
                      <th key={ym} className="px-3 py-2.5 text-right text-xs font-medium text-blue-600 whitespace-nowrap min-w-[100px]">
                        <div className="flex items-center justify-end gap-1">
                          {ym === nowYM && (
                            <span className="text-[9px] bg-blue-600 text-white px-1 py-0.5 rounded font-medium">今月</span>
                          )}
                          {formatYearMonth(ym)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((r) => (
                    <tr key={r.material.code} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs font-mono font-semibold text-gray-800 whitespace-nowrap sticky left-0 bg-inherit z-10">
                        {r.material.code}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">{r.material.name}</td>
                      <td className="px-3 py-2 text-xs text-gray-400">{r.material.unit}</td>
                      <td className="px-3 py-2 text-right text-xs text-gray-600">{r.startStock.toLocaleString()}</td>
                      {months.map((ym) => {
                        const net = r.net.get(ym) ?? 0;
                        const gross = r.gross.get(ym) ?? 0;
                        return (
                          <td key={ym} className={`px-3 py-1.5 text-right ${net > 0 ? "bg-amber-50" : ""}`}>
                            <div className={`text-xs font-semibold ${net > 0 ? "text-amber-700" : "text-gray-300"}`}>
                              {net > 0 ? net.toLocaleString() : "0"}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              総 {gross.toLocaleString()}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">
                  {rows.length === 0 ? "対象部材がありません" : "該当する部材が見つかりません"}
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-400">
            ※ 生産計画（<Link href="/plan" className="text-blue-500 hover:underline">生産計画表</Link>）の生産数 × BOM員数で計算しています。
            リードタイム・発注ロットの考慮は今後追加予定です。
          </p>
        </div>
      )}
    </div>
  );
}
