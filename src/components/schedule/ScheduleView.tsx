"use client";

import { useState, useMemo } from "react";
import { products } from "@/lib/data";
import { Product } from "@/lib/types";

// 2026年5月の稼働日（土日除く）
const MAY_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MAY_DOW: number[] = MAY_DAYS.map((d) => new Date(2026, 4, d).getDay()); // 0=日, 6=土

function isOperating(day: number) {
  const dow = MAY_DOW[day - 1];
  return dow !== 0 && dow !== 6;
}

const operatingDays = MAY_DAYS.filter(isOperating);

function dayLabel(d: number) {
  const dow = ["日", "月", "火", "水", "木", "金", "土"][MAY_DOW[d - 1]];
  const weekend = MAY_DOW[d - 1] === 0 || MAY_DOW[d - 1] === 6;
  return { day: d, dow, weekend };
}

function qty(p: Product, day: number) {
  if (!isOperating(day)) return null;
  const totalOp = operatingDays.length;
  const monthPlan = p.monthlyPlans[2]; // 5月
  if (!monthPlan) return 0;
  return Math.round(monthPlan.productionSchedule / totalOp);
}

const LINE_COLORS: Record<number, string> = {
  2: "bg-blue-100 text-blue-800",
  3: "bg-green-100 text-green-800",
  4: "bg-amber-100 text-amber-800",
  7: "bg-purple-100 text-purple-800",
};

export default function ScheduleView() {
  const [filterLine, setFilterLine] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchLine = filterLine === "all" || String(p.primaryLine) === filterLine;
      const q = search.toLowerCase();
      const matchSearch = !q || p.productName.toLowerCase().includes(q) || p.manufacturingItemCode.toLowerCase().includes(q);
      return matchLine && matchSearch;
    });
  }, [filterLine, search]);

  // ライン別日次合計
  const lineDailyTotals = useMemo(() => {
    const totals: Record<string, Record<number, number>> = {};
    filtered.forEach((p) => {
      const lk = String(p.primaryLine);
      if (!totals[lk]) totals[lk] = {};
      MAY_DAYS.forEach((d) => {
        if (isOperating(d)) {
          totals[lk][d] = (totals[lk][d] ?? 0) + (qty(p, d) ?? 0);
        }
      });
    });
    return totals;
  }, [filtered]);

  return (
    <div className="space-y-5">
      {/* フィルター */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="品目名・コードで検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm border border-gray-200 rounded px-3 py-1.5 flex-1 min-w-48"
        />
        <select
          value={filterLine}
          onChange={(e) => setFilterLine(e.target.value)}
          className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
        >
          <option value="all">全ライン</option>
          {[2, 3, 4, 7].map((l) => (
            <option key={l} value={String(l)}>ライン {l}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">{filtered.length} 件 | 稼働日 {operatingDays.length} 日</span>
      </div>

      {/* スケジュールグリッド */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse min-w-max">
            <thead>
              {/* 日付ヘッダー */}
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap border-r border-gray-200 min-w-40">品目名</th>
                <th className="px-2 py-2 text-center text-gray-500 font-medium whitespace-nowrap border-r border-gray-100 min-w-12">L</th>
                <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap border-r border-gray-200 min-w-16">月計画</th>
                {MAY_DAYS.map((d) => {
                  const { dow, weekend } = dayLabel(d);
                  return (
                    <th
                      key={d}
                      className={`px-1 py-2 text-center font-medium min-w-10 whitespace-nowrap ${
                        weekend ? "bg-gray-100 text-gray-300" : "text-gray-600"
                      }`}
                    >
                      <div>{d}</div>
                      <div className={`text-[10px] ${dow === "日" ? "text-red-400" : dow === "土" ? "text-blue-400" : "text-gray-400"}`}>{dow}</div>
                    </th>
                  );
                })}
                <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap min-w-16">合計</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const mp = p.monthlyPlans[2]; // 5月
                const rowTotal = operatingDays.reduce((s, d) => s + (qty(p, d) ?? 0), 0);
                return (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 whitespace-nowrap border-r border-gray-200">
                      <div className="font-medium text-gray-800 text-xs leading-tight">{p.productName}</div>
                      <div className="text-gray-400 font-mono text-[10px]">{p.manufacturingItemCode}</div>
                    </td>
                    <td className="px-2 py-2 text-center border-r border-gray-100">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${LINE_COLORS[p.primaryLine] ?? "bg-gray-100 text-gray-600"}`}>
                        {p.primaryLine}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-blue-700 border-r border-gray-200">
                      {mp ? mp.productionSchedule.toLocaleString() : "-"}
                    </td>
                    {MAY_DAYS.map((d) => {
                      const q = qty(p, d);
                      if (q === null) {
                        return (
                          <td key={d} className="px-1 py-2 bg-gray-50 text-center text-gray-200">
                            -
                          </td>
                        );
                      }
                      return (
                        <td key={d} className="px-1 py-2 text-center text-gray-700 hover:bg-blue-50 cursor-default">
                          {q > 0 ? q.toLocaleString() : <span className="text-gray-200">0</span>}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-right font-semibold text-gray-800">
                      {rowTotal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}

              {/* ライン合計行 */}
              {Object.entries(lineDailyTotals).length > 0 && filterLine === "all" && (
                <>
                  {[2, 3, 4, 7].map((line) => {
                    const tots = lineDailyTotals[String(line)];
                    if (!tots) return null;
                    const lineTotal = Object.values(tots).reduce((s, v) => s + v, 0);
                    return (
                      <tr key={`total-${line}`} className={`border-t-2 border-gray-300 ${LINE_COLORS[line]?.replace("text", "text").replace("bg-", "bg-").replace("-100", "-50") ?? ""}`}>
                        <td className="sticky left-0 z-10 px-3 py-2 font-semibold border-r border-gray-200 bg-gray-50">
                          ライン {line} 合計
                        </td>
                        <td className="px-2 py-2 border-r border-gray-100 bg-gray-50" />
                        <td className="px-2 py-2 border-r border-gray-200 bg-gray-50" />
                        {MAY_DAYS.map((d) => (
                          <td key={d} className={`px-1 py-2 text-center font-medium ${isOperating(d) ? "text-gray-700" : "text-gray-200 bg-gray-50"}`}>
                            {isOperating(d) ? (tots[d] ?? 0).toLocaleString() : "-"}
                          </td>
                        ))}
                        <td className="px-2 py-2 text-right font-bold text-gray-800">
                          {lineTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-400 text-sm">
              該当する品目が見つかりません
            </div>
          )}
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex gap-4 text-xs text-gray-500">
        {[2, 3, 4, 7].map((l) => (
          <div key={l} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded ${LINE_COLORS[l]?.split(" ")[0]}`} />
            <span>ライン {l}</span>
          </div>
        ))}
        <span className="ml-4 text-gray-400">※ 数量は月次計画をoperating days均等割付したもの</span>
      </div>
    </div>
  );
}
