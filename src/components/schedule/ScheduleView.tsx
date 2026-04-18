"use client";

import { useState, useMemo } from "react";
import { products, formatYearMonth } from "@/lib/data";
import { useMasterStore } from "@/lib/masterStore";
import { Product } from "@/lib/types";

const LINE_COLORS: Record<number, string> = {
  2: "bg-blue-100 text-blue-800",
  3: "bg-green-100 text-green-800",
  4: "bg-amber-100 text-amber-800",
  7: "bg-purple-100 text-purple-800",
};

const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function buildMonthDays(ym: number) {
  const year = Math.floor(ym / 100);
  const month = ym % 100;
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dow = new Date(year, month - 1, d).getDay();
    return { day: d, dow, isOperating: dow !== 0 && dow !== 6 };
  });
}

function qty(p: Product, day: number, monthPlanIdx: number, opDayCount: number) {
  const mp = p.monthlyPlans[monthPlanIdx];
  if (!mp || mp.productionSchedule === 0) return 0;
  return Math.round(mp.productionSchedule / opDayCount);
}

export default function ScheduleView() {
  const { planBaseMonth, operatingDays: masterOperatingDays } = useMasterStore();
  const [filterLine, setFilterLine] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedYM, setSelectedYM] = useState(planBaseMonth);

  // planBaseMonth が変わったら選択月もリセット
  useMemo(() => { setSelectedYM(planBaseMonth); }, [planBaseMonth]);

  // 表示月の日付情報
  const monthDays = useMemo(() => buildMonthDays(selectedYM), [selectedYM]);

  // 稼働日: マスター設定 or 土日除外デフォルト
  const operatingDayNums = useMemo(() => {
    const masterEntry = masterOperatingDays.find((o) => o.yearMonth === selectedYM);
    return masterEntry ? masterEntry.operatingDates : monthDays.filter((d) => d.isOperating).map((d) => d.day);
  }, [selectedYM, masterOperatingDays, monthDays]);

  const isOperating = (day: number) => operatingDayNums.includes(day);

  // 対応する monthlyPlans のインデックスを探す
  function getMonthPlanIdx(p: Product): number {
    return p.monthlyPlans.findIndex((mp) => mp.yearMonth === selectedYM);
  }

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
      const idx = getMonthPlanIdx(p);
      if (idx < 0) return;
      monthDays.forEach(({ day }) => {
        if (isOperating(day)) {
          const q = Math.round((p.monthlyPlans[idx]?.productionSchedule ?? 0) / operatingDayNums.length);
          totals[lk][day] = (totals[lk][day] ?? 0) + q;
        }
      });
    });
    return totals;
  }, [filtered, selectedYM, operatingDayNums, monthDays]);

  // 選択月の選択肢（planBaseMonth から12ヶ月）
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const y = Math.floor(planBaseMonth / 100) + Math.floor(((planBaseMonth % 100) - 1 + i) / 12);
      const m = ((planBaseMonth % 100) - 1 + i) % 12 + 1;
      return y * 100 + m;
    });
  }, [planBaseMonth]);

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
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-500">表示月：</span>
          <select
            value={selectedYM}
            onChange={(e) => setSelectedYM(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white font-medium"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>{formatYearMonth(m)}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-gray-400">{filtered.length} 件 | 稼働日 {operatingDayNums.length} 日</span>
      </div>

      {/* スケジュールグリッド */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse min-w-max">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap border-r border-gray-200 min-w-40">品目名</th>
                <th className="px-2 py-2 text-center text-gray-500 font-medium whitespace-nowrap border-r border-gray-100 min-w-12">L</th>
                <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap border-r border-gray-200 min-w-16">月計画</th>
                {monthDays.map(({ day, dow }) => {
                  const weekend = dow === 0 || dow === 6;
                  const op = isOperating(day);
                  return (
                    <th
                      key={day}
                      className={`px-1 py-2 text-center font-medium min-w-10 whitespace-nowrap ${
                        !op ? "bg-gray-100 text-gray-300" : "text-gray-600"
                      }`}
                    >
                      <div>{day}</div>
                      <div className={`text-[10px] ${dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-gray-400"}`}>
                        {DOW_LABELS[dow]}
                      </div>
                    </th>
                  );
                })}
                <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap min-w-16">合計</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const idx = getMonthPlanIdx(p);
                const mp = idx >= 0 ? p.monthlyPlans[idx] : undefined;
                const rowTotal = operatingDayNums.reduce((s) => s + (mp ? Math.round(mp.productionSchedule / operatingDayNums.length) : 0), 0);
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
                    {monthDays.map(({ day }) => {
                      const op = isOperating(day);
                      if (!op) {
                        return (
                          <td key={day} className="px-1 py-2 bg-gray-50 text-center text-gray-200">-</td>
                        );
                      }
                      const q = mp ? Math.round(mp.productionSchedule / operatingDayNums.length) : 0;
                      return (
                        <td key={day} className="px-1 py-2 text-center text-gray-700 hover:bg-blue-50 cursor-default">
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
                      <tr key={`total-${line}`} className="border-t-2 border-gray-300 bg-gray-50">
                        <td className="sticky left-0 z-10 px-3 py-2 font-semibold border-r border-gray-200 bg-gray-50">
                          ライン {line} 合計
                        </td>
                        <td className="px-2 py-2 border-r border-gray-100" />
                        <td className="px-2 py-2 border-r border-gray-200" />
                        {monthDays.map(({ day }) => (
                          <td key={day} className={`px-1 py-2 text-center font-medium ${isOperating(day) ? "text-gray-700" : "text-gray-200"}`}>
                            {isOperating(day) ? (tots[day] ?? 0).toLocaleString() : "-"}
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
        <span className="ml-4 text-gray-400">※ 数量は月次生産計画を稼働日数で均等割付したもの</span>
      </div>
    </div>
  );
}
