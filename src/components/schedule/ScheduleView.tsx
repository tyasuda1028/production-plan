"use client";

import { useState, useMemo } from "react";
import { formatYearMonth, getPlanMonths } from "@/lib/data";
import { useMasterStore } from "@/lib/masterStore";
import { ProductMaster, pmKey } from "@/lib/masterTypes";
import { useLeveledPlans } from "@/lib/useLeveledPlans";
import { Download, Database } from "lucide-react";

// 分類ごとのカラー（インデックスで循環）
const CLASSIFICATION_COLORS = [
  { header: "bg-blue-600",   total: "bg-blue-50",   border: "border-blue-300"   },
  { header: "bg-emerald-600",total: "bg-emerald-50", border: "border-emerald-300"},
  { header: "bg-amber-500",  total: "bg-amber-50",  border: "border-amber-300"  },
  { header: "bg-purple-600", total: "bg-purple-50", border: "border-purple-300" },
  { header: "bg-rose-600",   total: "bg-rose-50",   border: "border-rose-300"   },
  { header: "bg-cyan-600",   total: "bg-cyan-50",   border: "border-cyan-300"   },
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
  const {
    planBaseMonth,
    operatingDays: masterOperatingDays,
    lineMasters,
    factoryMasters,
    productMasters,
  } = useMasterStore();

  const [search, setSearch] = useState("");
  const [selectedYM, setSelectedYM] = useState(planBaseMonth);

  const leveledPlansMap = useLeveledPlans();

  useMemo(() => { setSelectedYM(planBaseMonth); }, [planBaseMonth]);

  const monthDays = useMemo(() => buildMonthDays(selectedYM), [selectedYM]);

  const operatingDayNums = useMemo(() => {
    const masterEntry = masterOperatingDays.find((o) => o.yearMonth === selectedYM);
    return masterEntry
      ? masterEntry.operatingDates
      : monthDays.filter((d) => d.dow !== 0 && d.dow !== 6).map((d) => d.day);
  }, [selectedYM, masterOperatingDays, monthDays]);

  const isOperating = (day: number) => operatingDayNums.includes(day);

  function getDailyQty(pm: ProductMaster): number {
    const leveled = leveledPlansMap.get(pmKey(pm))?.get(selectedYM);
    return leveled?.dailyQuantity ?? 0;
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
    const active = productMasters.filter((pm) => pm.active !== false);
    if (!q) return active;
    return active.filter(
      (pm) =>
        pm.modelCode.toLowerCase().includes(q) ||
        pm.code.toLowerCase().includes(q)
    );
  }, [search, productMasters]);

  // ── 工場 → 分類 → ライン の階層グループ ────────────────────────
  const factoryGroups = useMemo(() => {
    // 全分類リスト（色割り当て用）
    const allClassifications: string[] = [];
    lineMasters.forEach((l) => {
      const cls = l.classification || "（未分類）";
      if (!allClassifications.includes(cls)) allClassifications.push(cls);
    });

    const groups = factoryMasters.map((factory) => {
      const factoryLines = lineMasters
        .filter((l) => l.factoryName === factory.factoryName)
        .sort((a, b) => a.lineNumber - b.lineNumber);

      // 分類ごとにグループ化
      const classMap = new Map<string, typeof factoryLines>();
      factoryLines.forEach((l) => {
        const cls = l.classification || "（未分類）";
        if (!classMap.has(cls)) classMap.set(cls, []);
        classMap.get(cls)!.push(l);
      });

      const classifications = Array.from(classMap.entries()).map(([cls, lines]) => {
        const colorIdx = allClassifications.indexOf(cls);
        const color = CLASSIFICATION_COLORS[colorIdx % CLASSIFICATION_COLORS.length];
        const lineGroups = lines.map((lm) => ({
          lineMaster: lm,
          lineProducts: filteredProducts.filter((pm) => pm.primaryLine === lm.lineNumber),
        })).filter((g) => g.lineProducts.length > 0);

        return { classification: cls, lines, lineGroups, color };
      }).filter((c) => c.lineGroups.length > 0);

      return { factory, classifications };
    });

    // 工場未登録ライン（孤立ライン）
    const registeredFactoryNames = new Set(factoryMasters.map((f) => f.factoryName));
    const orphanLines = lineMasters
      .filter((l) => !registeredFactoryNames.has(l.factoryName))
      .sort((a, b) => a.lineNumber - b.lineNumber);
    const orphanGroups = orphanLines.map((lm) => ({
      lineMaster: lm,
      lineProducts: filteredProducts.filter((pm) => pm.primaryLine === lm.lineNumber),
    })).filter((g) => g.lineProducts.length > 0);

    return { groups, orphanGroups };
  }, [factoryMasters, lineMasters, filteredProducts]);

  const totalFiltered = useMemo(() => {
    let count = 0;
    factoryGroups.groups.forEach((fg) =>
      fg.classifications.forEach((cg) =>
        cg.lineGroups.forEach((lg) => { count += lg.lineProducts.length; })
      )
    );
    factoryGroups.orphanGroups.forEach((og) => { count += og.lineProducts.length; });
    return count;
  }, [factoryGroups]);

  // ── ライン別スケジュールテーブル ──────────────────────────────
  function renderLineTable(
    lineMaster: typeof lineMasters[number],
    lineProducts: ProductMaster[],
    color: typeof CLASSIFICATION_COLORS[number]
  ) {
    // 計画ゼロを除外 → 月計画の多い順にソート
    const sortedProducts = [...lineProducts]
      .filter((p) => getDailyQty(p) > 0)
      .sort((a, b) => getDailyQty(b) - getDailyQty(a));

    if (sortedProducts.length === 0) return null;

    const lineDailyTotals: Record<number, number> = {};
    sortedProducts.forEach((p) => {
      const dq = getDailyQty(p);
      monthDays.forEach(({ day }) => {
        if (isOperating(day)) {
          lineDailyTotals[day] = (lineDailyTotals[day] ?? 0) + dq;
        }
      });
    });
    const lineMonthTotal = Object.values(lineDailyTotals).reduce((s, v) => s + v, 0);

    const ymStr = String(selectedYM);
    const monthLabel = `${ymStr.slice(0, 4)}年${ymStr.slice(4)}月`;

    return (
      <div key={lineMaster.lineNumber} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* ライン ヘッダー */}
        <div className={`px-4 py-2 flex items-center gap-3 text-white ${color.header}`}>
          <span className="text-sm font-bold">{lineMaster.lineName}</span>
          <span className="text-xs opacity-80 font-mono">ライン {lineMaster.lineNumber}</span>
          <span className="text-xs opacity-75">
            日量能力 {(lineMaster.dailyCapacity ?? 0).toLocaleString()} 台/日
          </span>
          <span className="text-xs opacity-90 font-semibold ml-2">{monthLabel}</span>
          <span className="text-xs opacity-75">稼働 {operatingDayNums.length} 日</span>
          <span className="ml-auto text-xs opacity-75">{sortedProducts.length} 品目</span>
        </div>

        <div className="overflow-x-auto">
          <table className="text-xs border-collapse min-w-max">
            <thead>
              {/* 年月ヘッダー行 */}
              <tr className="border-b border-gray-200">
                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-1.5 text-left text-gray-500 font-medium whitespace-nowrap border-r border-gray-200 min-w-40">
                  製造器種名
                </th>
                <th className="px-2 py-1.5 text-right text-gray-500 font-medium whitespace-nowrap border-r border-gray-200 min-w-16 bg-gray-50">
                  月計画
                </th>
                <th
                  colSpan={monthDays.length}
                  className="px-3 py-1.5 text-center text-blue-700 font-bold bg-blue-50 border-r border-gray-200"
                >
                  {monthLabel}（稼働日 {operatingDayNums.length}日）
                </th>
                <th className="px-2 py-1.5 text-right text-gray-500 font-medium whitespace-nowrap min-w-16 bg-gray-50">合計</th>
              </tr>
              {/* 日付ヘッダー行 */}
              <tr className="bg-gray-50 border-b-2 border-gray-300">
                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap border-r border-gray-200 min-w-40" />
                <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap border-r border-gray-200 min-w-16" />
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
                      <div className={`text-[10px] ${dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-gray-400"}`}>
                        {DOW_LABELS[dow]}
                      </div>
                    </th>
                  );
                })}
                <th className="px-2 py-2 text-right text-gray-500 font-medium whitespace-nowrap min-w-16" />
              </tr>
            </thead>
            <tbody>
              {/* ── ライン合計行（上部） ── */}
              <tr className={`border-b-2 border-gray-300 ${color.total}`}>
                <td className={`sticky left-0 z-10 px-3 py-2.5 font-bold border-r border-gray-200 whitespace-nowrap ${color.total}`}>
                  {lineMaster.lineName} 合計
                </td>
                <td className="px-2 py-2.5 text-right font-bold text-gray-800 border-r border-gray-200">
                  {lineMonthTotal.toLocaleString()}
                </td>
                {monthDays.map(({ day }) => (
                  <td key={day} className={`px-1 py-2.5 text-center font-bold ${isOperating(day) ? "text-gray-900" : "text-gray-200"}`}>
                    {isOperating(day) ? (lineDailyTotals[day] ?? 0).toLocaleString() : "-"}
                  </td>
                ))}
                <td className="px-2 py-2.5 text-right font-bold text-gray-900">
                  {lineMonthTotal.toLocaleString()}
                </td>
              </tr>

              {/* ── 製品別詳細行 ── */}
              {sortedProducts.map((p) => {
                const leveled = leveledPlansMap.get(pmKey(p))?.get(selectedYM);
                const productionSchedule = leveled?.productionSchedule;
                const dq = getDailyQty(p);
                const rowTotal = dq * operatingDayNums.length;

                return (
                  <tr key={pmKey(p)} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 whitespace-nowrap border-r border-gray-200">
                      <div className="font-medium text-gray-700 font-mono leading-tight">
                        {p.modelCode}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right font-medium text-blue-700 border-r border-gray-200">
                      {productionSchedule != null ? productionSchedule.toLocaleString() : "-"}
                    </td>
                    {monthDays.map(({ day }) => {
                      const op = isOperating(day);
                      if (!op) return (
                        <td key={day} className="px-1 py-1.5 bg-gray-50 text-center text-gray-200">-</td>
                      );
                      return (
                        <td key={day} className="px-1 py-1.5 text-center text-gray-600 hover:bg-blue-50">
                          {dq.toLocaleString()}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-right font-semibold text-gray-700">
                      {rowTotal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── CSV エクスポート（工場 → 分類 → ライン順） ────────────────
  function handleCsvExport() {
    const exportMonths = getPlanMonths(planBaseMonth);
    const allRows: string[][] = [];

    // 工場 → 分類 → ライン の順序でラインリストを構築
    const orderedLines: typeof lineMasters = [];
    factoryMasters.forEach((factory) => {
      const factoryLines = lineMasters.filter((l) => l.factoryName === factory.factoryName);
      const clsMap = new Map<string, typeof lineMasters>();
      factoryLines.forEach((l) => {
        const cls = l.classification || "（未分類）";
        if (!clsMap.has(cls)) clsMap.set(cls, []);
        clsMap.get(cls)!.push(l);
      });
      clsMap.forEach((lines) => lines.sort((a, b) => a.lineNumber - b.lineNumber).forEach((l) => orderedLines.push(l)));
    });
    // 孤立ライン
    const registeredFactoryNames = new Set(factoryMasters.map((f) => f.factoryName));
    lineMasters.filter((l) => !registeredFactoryNames.has(l.factoryName))
      .sort((a, b) => a.lineNumber - b.lineNumber)
      .forEach((l) => orderedLines.push(l));

    exportMonths.forEach((ym, monthIdx) => {
      const mDays = buildMonthDays(ym);
      const masterEntry = masterOperatingDays.find((o) => o.yearMonth === ym);
      const opNums = masterEntry
        ? masterEntry.operatingDates
        : mDays.filter((d) => d.dow !== 0 && d.dow !== 6).map((d) => d.day);
      const isOp = (day: number) => opNums.includes(day);

      if (monthIdx > 0) allRows.push([]);
      const ymStr = String(ym);
      allRows.push([`■ ${ymStr.slice(0, 4)}年${ymStr.slice(4)}月（稼働日 ${opNums.length}日）`]);

      const dayHeaders = mDays.map(({ day, dow }) => `${day}(${DOW_LABELS[dow]})`);
      allRows.push(["工場", "分類", "ライン", "製造器種名", "月計画（台）", ...dayHeaders, "合計"]);

      orderedLines.forEach((lm) => {
        const lps = productMasters.filter((pm) => pm.active !== false && pm.primaryLine === lm.lineNumber);
        if (lps.length === 0) return;

        const lineDayTotals: number[] = mDays.map(() => 0);

        lps.forEach((pm) => {
          const leveled = leveledPlansMap.get(pmKey(pm))?.get(ym);
          const prodSchedule = leveled?.productionSchedule ?? 0;
          const dq = leveled?.dailyQuantity ?? 0;
          const dayValues = mDays.map(({ day }, di) => {
            const v = isOp(day) ? dq : 0;
            lineDayTotals[di] += v;
            return v;
          });
          allRows.push([
            lm.factoryName,
            lm.classification,
            lm.lineName,
            pm.modelCode,
            String(prodSchedule),
            ...dayValues.map(String),
            String(dayValues.reduce((s, v) => s + v, 0)),
          ]);
        });

        allRows.push([
          lm.factoryName, lm.classification, `【${lm.lineName} 合計】`, "", "",
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

  // 基幹システム用CSV
  function handleKikanCsvExport() {
    const exportMonths = getPlanMonths(planBaseMonth);

    type MonthMeta = { ym: number; opNums: number[]; dqMap: Map<string, number> };
    const monthMetas: MonthMeta[] = exportMonths.map((ym) => {
      const mDays = buildMonthDays(ym);
      const masterEntry = masterOperatingDays.find((o) => o.yearMonth === ym);
      const opNums = masterEntry
        ? masterEntry.operatingDates
        : mDays.filter((d) => d.dow !== 0 && d.dow !== 6).map((d) => d.day);
      const dqMap = new Map<string, number>();
      productMasters.filter((pm) => pm.active !== false).forEach((pm) => {
        const key = pmKey(pm);
        const leveled = leveledPlansMap.get(key)?.get(ym);
        dqMap.set(key, leveled?.dailyQuantity ?? 0);
      });
      return { ym, opNums, dqMap };
    });

    type DayCol = { ym: number; day: number; label: string };
    const dayCols: DayCol[] = [];
    monthMetas.forEach(({ ym }) => {
      const ymStr = String(ym);
      buildMonthDays(ym).forEach(({ day }) => {
        const dd = String(day).padStart(2, "0");
        dayCols.push({ ym, day, label: `${ymStr.slice(0, 4)}/${ymStr.slice(4)}/${dd}` });
      });
    });

    const rows: string[][] = [
      ["製品コード", "製造器種名", "ライン", ...dayCols.map((c) => c.label)],
    ];

    productMasters.filter((pm) => pm.active !== false).forEach((pm) => {
      const key = pmKey(pm);
      const dayValues = dayCols.map(({ ym, day }) => {
        const meta = monthMetas.find((m) => m.ym === ym)!;
        return meta.opNums.includes(day) ? String(meta.dqMap.get(key) ?? 0) : "0";
      });
      rows.push([pm.code, pm.modelCode, String(pm.primaryLine), ...dayValues]);
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

      {/* 工場 → 分類 → ライン の階層 */}
      {factoryGroups.groups.map(({ factory, classifications }) => {
        if (classifications.length === 0) return null;
        return (
          <div key={factory.factoryName} className="space-y-4">
            {/* 工場ヘッダー */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">工場</span>
                <span className="text-sm font-bold text-gray-700">{factory.factoryName}</span>
                {factory.factoryNumber && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                    #{factory.factoryNumber}
                  </span>
                )}
              </div>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* 分類ごと */}
            {classifications.map(({ classification, lineGroups, color }) => (
              <div key={classification} className="space-y-3">
                {/* 分類ラベル */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded border-l-4 bg-gray-50 ${color.border}`}>
                  <span className="text-sm font-semibold text-gray-700">{classification}</span>
                  <span className="text-xs text-gray-400">{lineGroups.length} ライン</span>
                </div>

                {/* ライン別テーブル */}
                <div className="space-y-3 pl-3">
                  {lineGroups.map(({ lineMaster, lineProducts }) =>
                    renderLineTable(lineMaster, lineProducts, color)
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {/* 工場未登録ライン */}
      {factoryGroups.orphanGroups.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold text-gray-400">工場未登録ライン</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          {factoryGroups.orphanGroups.map(({ lineMaster, lineProducts }, i) =>
            renderLineTable(lineMaster, lineProducts, CLASSIFICATION_COLORS[i % CLASSIFICATION_COLORS.length])
          )}
        </div>
      )}

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
