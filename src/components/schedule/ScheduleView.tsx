"use client";

import { useState, useMemo } from "react";
import { products, formatYearMonth, getPlanMonths } from "@/lib/data";
import { useMasterStore } from "@/lib/masterStore";
import { Product } from "@/lib/types";
import { Download, Database } from "lucide-react";

const GROUP_COLORS = [
  { header: "bg-blue-600",   total: "bg-blue-50"   },
  { header: "bg-green-600",  total: "bg-green-50"  },
  { header: "bg-amber-500",  total: "bg-amber-50"  },
  { header: "bg-purple-600", total: "bg-purple-50" },
  { header: "bg-rose-600",   total: "bg-rose-50"   },
];

const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function buildMonthDays(ym: number) {
  const year = Math.floor(ym / 100);
  const month = ym % 100;
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dow = new Date(year, month - 1, d).getDay();
    return { day: d, dow };
  });
}

export default function ScheduleView() {
  const { planBaseMonth, operatingDays: masterOperatingDays, lineMasters, productMasters } = useMasterStore();
  const [search, setSearch] = useState("");
  const [selectedYM, setSelectedYM] = useState(planBaseMonth);

  useMemo(() => { setSelectedYM(planBaseMonth); }, [planBaseMonth]);

  const monthDays = useMemo(() => buildMonthDays(selectedYM), [selectedYM]);

  const operatingDayNums = useMemo(() => {
    const masterEntry = masterOperatingDays.find((o) => o.yearMonth === selectedYM);
    return masterEntry
      ? masterEntry.operatingDates
      : monthDays.filter((d) => d.dow !== 0 && d.dow !== 6).map((d) => d.day);
  }, [selectedYM, masterOperatingDays, monthDays]);

  const isOperating = (day: number) => operatingDayNums.includes(day);

  function getMonthPlanIdx(p: Product): number {
    return p.monthlyPlans.findIndex((mp) => mp.yearMonth === selectedYM);
  }

  function getDailyQty(p: Product): number {
    const idx = getMonthPlanIdx(p);
    const mp = idx >= 0 ? p.monthlyPlans[idx] : undefined;
    if (!mp || operatingDayNums.length === 0) return 0;
    return Math.round(mp.productionSchedule / operatingDayNums.length);
  }

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const y = Math.floor(planBaseMonth / 100) + Math.floor(((planBaseMonth % 100) - 1 + i) / 12);
      const m = ((planBaseMonth % 100) - 1 + i) % 12 + 1;
      return y * 100 + m;
    });
  }, [planBaseMonth]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.manufacturingItemCode.toLowerCase().includes(q) ||
        p.productName.toLowerCase().includes(q)
    );
  }, [search]);

  const lineGroups = useMemo(() => {
    return lineMasters
      .map((lm) => ({
        lineMaster: lm,
        lineProducts: filteredProducts.filter((p) => p.primaryLine === lm.lineNumber),
      }))
      .filter((g) => g.lineProducts.length > 0);
  }, [lineMasters, filteredProducts]);

  const totalFiltered = lineGroups.reduce((s, g) => s + g.lineProducts.length, 0);

  function handleCsvExport() {
    const exportMonths = getPlanMonths(planBaseMonth); // 先6ヶ月
    const allRows: string[][] = [];

    exportMonths.forEach((ym, monthIdx) => {
      const mDays = buildMonthDays(ym);

      // 稼働日取得
      const masterEntry = masterOperatingDays.find((o) => o.yearMonth === ym);
      const opNums = masterEntry
        ? masterEntry.operatingDates
        : mDays.filter((d) => d.dow !== 0 && d.dow !== 6).map((d) => d.day);
      const isOp = (day: number) => opNums.includes(day);

      // 月区切り
      if (monthIdx > 0) allRows.push([]);
      const ymStr = String(ym);
      allRows.push([`■ ${ymStr.slice(0, 4)}年${ymStr.slice(4)}月（稼働日 ${opNums.length}日）`]);

      // 列ヘッダー
      const dayHeaders = mDays.map(({ day, dow }) => `${day}(${DOW_LABELS[dow]})`);
      allRows.push(["ライン", "製造器種名", "月計画（台）", ...dayHeaders, "合計"]);

      // ライン別データ
      lineMasters.forEach((lm) => {
        const lps = products.filter((p) => p.primaryLine === lm.lineNumber);
        if (lps.length === 0) return;

        const lineDayTotals: number[] = mDays.map(() => 0);

        lps.forEach((p) => {
          const mp = p.monthlyPlans.find((m) => m.yearMonth === ym);
          const dq = mp && opNums.length > 0
            ? Math.round(mp.productionSchedule / opNums.length)
            : 0;
          const dayValues = mDays.map(({ day }, di) => {
            const v = isOp(day) ? dq : 0;
            lineDayTotals[di] += v;
            return v;
          });
          allRows.push([
            lm.lineName,
            p.manufacturingItemCode,
            mp ? String(mp.productionSchedule) : "0",
            ...dayValues.map(String),
            String(dayValues.reduce((s, v) => s + v, 0)),
          ]);
        });

        // ライン合計行
        allRows.push([
          `【${lm.lineName} 合計】`, "", "",
          ...lineDayTotals.map(String),
          String(lineDayTotals.reduce((s, v) => s + v, 0)),
        ]);
        allRows.push([]);
      });
    });

    const base = String(planBaseMonth);
    const csv = "\uFEFF" + allRows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `日割りスケジュール_${base.slice(0, 4)}年${base.slice(4)}月〜先6ヶ月.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 基幹システム用CSV: 製品コード × 月日（横軸）のワイドフォーマット
  function handleKikanCsvExport() {
    const exportMonths = getPlanMonths(planBaseMonth);

    // 全月の稼働日・日量を事前計算
    type MonthMeta = { ym: number; opNums: number[]; dqMap: Map<string, number> };
    const monthMetas: MonthMeta[] = exportMonths.map((ym) => {
      const mDays = buildMonthDays(ym);
      const masterEntry = masterOperatingDays.find((o) => o.yearMonth === ym);
      const opNums = masterEntry
        ? masterEntry.operatingDates
        : mDays.filter((d) => d.dow !== 0 && d.dow !== 6).map((d) => d.day);
      const dqMap = new Map<string, number>();
      products.forEach((p) => {
        const mp = p.monthlyPlans.find((m) => m.yearMonth === ym);
        const dq = mp && opNums.length > 0
          ? Math.round(mp.productionSchedule / opNums.length)
          : 0;
        dqMap.set(p.id, dq);
      });
      return { ym, opNums, dqMap };
    });

    // 横軸: 全月の全カレンダー日 → YYYY/MM/DD
    type DayCol = { ym: number; day: number; label: string };
    const dayCols: DayCol[] = [];
    monthMetas.forEach(({ ym }) => {
      const mDays = buildMonthDays(ym);
      const ymStr = String(ym);
      mDays.forEach(({ day }) => {
        const dd = String(day).padStart(2, "0");
        dayCols.push({ ym, day, label: `${ymStr.slice(0, 4)}/${ymStr.slice(4)}/${dd}` });
      });
    });

    // ヘッダー行
    const rows: string[][] = [
      ["製品コード", "製造器種名", "ライン", ...dayCols.map((c) => c.label)],
    ];

    // 製造器種名 → 製品コードのマップ（productMasters から引く）
    const codeMap = new Map(productMasters.map((pm) => [pm.modelCode, pm.code]));

    // データ行: 全品目（フィルタなし）
    products.forEach((p) => {
      const productCode = codeMap.get(p.manufacturingItemCode) || p.manufacturingItemCode;
      const dayValues = dayCols.map(({ ym, day }) => {
        const meta = monthMetas.find((m) => m.ym === ym)!;
        return meta.opNums.includes(day) ? String(meta.dqMap.get(p.id) ?? 0) : "0";
      });
      rows.push([productCode, p.manufacturingItemCode, String(p.primaryLine), ...dayValues]);
    });

    const base = String(planBaseMonth);
    const csv = "\uFEFF" + rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `基幹連携_日別生産計画_${base.slice(0, 4)}年${base.slice(4)}月〜先6ヶ月.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {/* ツールバー */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="製造器種名・品目名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm border border-gray-200 rounded px-3 py-1.5 flex-1 min-w-48"
        />
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
          <button
            onClick={handleCsvExport}
            className="flex items-center gap-1.5 text-xs bg-green-600 text-white rounded px-3 py-1.5 hover:bg-green-700 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            先6ヶ月 CSV出力
          </button>
          <button
            onClick={handleKikanCsvExport}
            className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white rounded px-3 py-1.5 hover:bg-indigo-700 whitespace-nowrap"
          >
            <Database className="w-3.5 h-3.5" />
            基幹連携 CSV
          </button>
        </div>
        <span className="text-xs text-gray-400">
          {totalFiltered} 件 | 稼働日 {operatingDayNums.length} 日
        </span>
      </div>

      {/* ライン別テーブル */}
      {lineGroups.map(({ lineMaster, lineProducts }, groupIdx) => {
        const color = GROUP_COLORS[groupIdx % GROUP_COLORS.length];

        const lineDailyTotals: Record<number, number> = {};
        lineProducts.forEach((p) => {
          const dq = getDailyQty(p);
          monthDays.forEach(({ day }) => {
            if (isOperating(day)) {
              lineDailyTotals[day] = (lineDailyTotals[day] ?? 0) + dq;
            }
          });
        });
        const lineMonthTotal = Object.values(lineDailyTotals).reduce((s, v) => s + v, 0);

        return (
          <div key={lineMaster.lineNumber} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* ライン ヘッダー */}
            <div className={`px-4 py-2.5 flex items-center gap-3 text-white ${color.header}`}>
              <span className="text-sm font-bold">{lineMaster.lineName}</span>
              <span className="text-xs opacity-80">{lineMaster.factoryName}</span>
              <span className="text-xs opacity-75">
                日量能力 {lineMaster.dailyCapacity.toLocaleString()} 台/日
              </span>
              <span className="ml-auto text-xs opacity-75">{lineProducts.length} 品目</span>
            </div>

            <div className="overflow-x-auto">
              <table className="text-xs border-collapse min-w-max">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap border-r border-gray-200 min-w-40">
                      製造器種名
                    </th>
                    <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap border-r border-gray-200 min-w-16">
                      月計画
                    </th>
                    {monthDays.map(({ day, dow }) => {
                      const op = isOperating(day);
                      return (
                        <th
                          key={day}
                          className={`px-1 py-2 text-center font-medium min-w-10 whitespace-nowrap ${
                            !op ? "bg-gray-100 text-gray-300" : "text-gray-600"
                          }`}
                        >
                          <div>{day}</div>
                          <div
                            className={`text-[10px] ${
                              dow === 0
                                ? "text-red-400"
                                : dow === 6
                                ? "text-blue-400"
                                : "text-gray-400"
                            }`}
                          >
                            {DOW_LABELS[dow]}
                          </div>
                        </th>
                      );
                    })}
                    <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap min-w-16">
                      合計
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineProducts.map((p) => {
                    const idx = getMonthPlanIdx(p);
                    const mp = idx >= 0 ? p.monthlyPlans[idx] : undefined;
                    const dq = getDailyQty(p);
                    const rowTotal = dq * operatingDayNums.length;

                    return (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="sticky left-0 z-10 bg-white px-3 py-2 whitespace-nowrap border-r border-gray-200">
                          <div className="font-medium text-gray-800 font-mono leading-tight">
                            {p.manufacturingItemCode}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-blue-700 border-r border-gray-200">
                          {mp ? mp.productionSchedule.toLocaleString() : "-"}
                        </td>
                        {monthDays.map(({ day }) => {
                          const op = isOperating(day);
                          if (!op) {
                            return (
                              <td key={day} className="px-1 py-2 bg-gray-50 text-center text-gray-200">
                                -
                              </td>
                            );
                          }
                          return (
                            <td key={day} className="px-1 py-2 text-center text-gray-700 hover:bg-blue-50">
                              {dq > 0 ? dq.toLocaleString() : <span className="text-gray-200">0</span>}
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
                  <tr className={`border-t-2 border-gray-300 ${color.total}`}>
                    <td
                      className={`sticky left-0 z-10 px-3 py-2 font-bold border-r border-gray-200 whitespace-nowrap ${color.total}`}
                    >
                      {lineMaster.lineName} 合計
                    </td>
                    <td className="px-2 py-2 border-r border-gray-200" />
                    {monthDays.map(({ day }) => (
                      <td
                        key={day}
                        className={`px-1 py-2 text-center font-semibold ${
                          isOperating(day) ? "text-gray-800" : "text-gray-200"
                        }`}
                      >
                        {isOperating(day) ? (lineDailyTotals[day] ?? 0).toLocaleString() : "-"}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right font-bold text-gray-900">
                      {lineMonthTotal.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {totalFiltered === 0 && (
        <div className="py-16 text-center text-gray-400 text-sm bg-white border border-gray-200 rounded-lg">
          該当する品目が見つかりません
        </div>
      )}

      <p className="text-xs text-gray-400">
        ※ 数量は月次生産計画を稼働日数で均等割付したものです
      </p>
    </div>
  );
}
