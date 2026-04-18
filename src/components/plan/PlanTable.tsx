"use client";

import { useState, useMemo, useEffect } from "react";
import { products, getPlanMonths, formatYearMonth } from "@/lib/data";
import { useMasterStore } from "@/lib/masterStore";
import { Product, MonthlyPlan } from "@/lib/types";
import { ChevronDown, ChevronRight, Search, Filter } from "lucide-react";

type ExpandedRows = Record<string, boolean>;
type LeveledPlan = MonthlyPlan & { dailyQuantity: number };

function SurplusCell({ value }: { value: number }) {
  if (value > 0) return <span className="text-blue-600 font-medium">+{value.toLocaleString()}</span>;
  if (value < 0) return <span className="text-red-600 font-medium">{value.toLocaleString()}</span>;
  return <span className="text-gray-400">0</span>;
}

function InvMonthsCell({ value }: { value: number }) {
  const color = value < 1.0 ? "text-red-600" : value > 2.5 ? "text-amber-600" : "text-green-600";
  return <span className={`font-medium ${color}`}>{value.toFixed(1)}</span>;
}

const METHOD_COLORS: Record<string, string> = {
  "B:在庫製品": "bg-blue-50 text-blue-700",
  "D:受注生産": "bg-purple-50 text-purple-700",
};

/**
 * 均等日量計画を算出する。
 * planMonths（6ヶ月）を前半3ヶ月・後半3ヶ月に分け、
 * 各グループの合計生産必要数を合計稼働日数で割った日量を基に
 * 月別生産予定数を決定する。在庫は前月末在庫から累積計算。
 */
function buildLeveledPlan(
  p: Product,
  planMonths: number[],
  opDaysCount: Map<number, number>,
  overrideMap: Map<string, number>
): Map<number, LeveledPlan> {
  const DEFAULT_OP_DAYS = 20;

  // 販売計画オーバーライドを適用したベース計画
  const basePlans: MonthlyPlan[] = planMonths.map((ym) => {
    const mp = p.monthlyPlans.find((m) => m.yearMonth === ym) ?? {
      yearMonth: ym, salesPlan: 0, targetInventoryMonths: 1.5,
      productionSchedule: 0, requiredProduction: 0, surplusDeficit: 0,
      planAdjustment: 0, monthEndInventory: 0, monthEndInventoryMonths: 0,
    };
    const override = overrideMap.get(`${p.id}:${ym}`);
    if (override !== undefined) {
      const salesPlan = override;
      const requiredProduction = Math.round(salesPlan * 1.05);
      return { ...mp, salesPlan, requiredProduction };
    }
    return mp;
  });

  const opDays = planMonths.map((ym) => opDaysCount.get(ym) ?? DEFAULT_OP_DAYS);

  // 前半3ヶ月の均等日量レート
  const req1  = basePlans.slice(0, 3).reduce((s, m) => s + m.requiredProduction, 0);
  const days1 = opDays.slice(0, 3).reduce((s, d) => s + d, 0);
  const rate1 = days1 > 0 ? req1 / days1 : 0;

  // 後半3ヶ月の均等日量レート
  const req2  = basePlans.slice(3).reduce((s, m) => s + m.requiredProduction, 0);
  const days2 = opDays.slice(3).reduce((s, d) => s + d, 0);
  const rate2 = days2 > 0 ? req2 / days2 : 0;

  const rates = [rate1, rate1, rate1, rate2, rate2, rate2];

  const result = new Map<number, LeveledPlan>();
  let prevInv = p.lastMonthInventory;

  basePlans.forEach((mp, i) => {
    const productionSchedule      = Math.round(rates[i] * opDays[i]);
    const surplusDeficit          = productionSchedule - mp.requiredProduction;
    const planAdjustment          = surplusDeficit < 0 ? Math.abs(surplusDeficit) : 0;
    const monthEndInventory       = prevInv + productionSchedule - mp.salesPlan;
    const monthEndInventoryMonths = mp.salesPlan > 0
      ? parseFloat((monthEndInventory / mp.salesPlan).toFixed(1))
      : 0;
    const dailyQuantity = opDays[i] > 0 ? Math.round(productionSchedule / opDays[i]) : 0;

    result.set(mp.yearMonth, {
      ...mp,
      productionSchedule,
      surplusDeficit,
      planAdjustment,
      monthEndInventory,
      monthEndInventoryMonths,
      dailyQuantity,
    });

    prevInv = monthEndInventory;
  });

  return result;
}

export default function PlanTable() {
  const planBaseMonth       = useMasterStore((s) => s.planBaseMonth);
  const lineMasters         = useMasterStore((s) => s.lineMasters);
  const salesPlanOverrides  = useMasterStore((s) => s.salesPlanOverrides);
  const masterOperatingDays = useMasterStore((s) => s.operatingDays);
  const planMonths = getPlanMonths(planBaseMonth);

  const overrideMap = useMemo(() =>
    new Map(salesPlanOverrides.map((o) => [`${o.productId}:${o.yearMonth}`, o.salesPlan])),
    [salesPlanOverrides]
  );

  // 稼働日数マップ (yearMonth → 稼働日数)
  const opDaysCount = useMemo(() => {
    const map = new Map<number, number>();
    masterOperatingDays.forEach((o) => map.set(o.yearMonth, o.operatingDates.length));
    return map;
  }, [masterOperatingDays]);

  // 全品目の均等日量計画を計算
  const leveledPlansMap = useMemo(() => {
    const result = new Map<string, Map<number, LeveledPlan>>();
    products.forEach((p) => {
      result.set(p.id, buildLeveledPlan(p, planMonths, opDaysCount, overrideMap));
    });
    return result;
  }, [planMonths, opDaysCount, overrideMap]);

  const [search, setSearch] = useState("");
  const [filterClassification, setFilterClassification] = useState("all");
  const [filterFactory, setFilterFactory] = useState("all");
  const [filterLineName, setFilterLineName] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [expandedRows, setExpandedRows] = useState<ExpandedRows>({});
  const [selectedMonth, setSelectedMonth] = useState<number>(planBaseMonth);

  useEffect(() => { setSelectedMonth(planBaseMonth); }, [planBaseMonth]);

  const classifications = useMemo(() =>
    [...new Set(lineMasters.map((l) => l.classification))], [lineMasters]);
  const factories = useMemo(() =>
    [...new Set(lineMasters.map((l) => l.factoryName))], [lineMasters]);
  const lineNames = useMemo(() =>
    lineMasters.map((l) => ({ lineNumber: l.lineNumber, lineName: l.lineName })), [lineMasters]);

  const lineMap = useMemo(() =>
    new Map(lineMasters.map((l) => [l.lineNumber, l])), [lineMasters]);

  const methods = ["all", "B:在庫製品", "D:受注生産"];

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.productName.toLowerCase().includes(q) ||
        p.manufacturingItemCode.toLowerCase().includes(q) ||
        p.planCategory1.toLowerCase().includes(q);

      const lm = lineMap.get(p.primaryLine);
      const matchClass   = filterClassification === "all" || lm?.classification === filterClassification;
      const matchFactory = filterFactory === "all"        || lm?.factoryName === filterFactory;
      const matchLine    = filterLineName === "all"       || lm?.lineName === filterLineName;
      const matchMethod  = filterMethod === "all"         || p.productionMethod === filterMethod;

      return matchSearch && matchClass && matchFactory && matchLine && matchMethod;
    });
  }, [search, filterClassification, filterFactory, filterLineName, filterMethod, lineMap]);

  function toggleRow(id: string) {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const planFor = (p: Product, ym: number): LeveledPlan | undefined =>
    leveledPlansMap.get(p.id)?.get(ym);

  type DetailRow = { label: string; key: keyof LeveledPlan; highlight?: boolean };
  const detailRows: DetailRow[] = [
    { label: "販売計画",     key: "salesPlan" },
    { label: "生産必要数",   key: "requiredProduction" },
    { label: "生産予定数",   key: "productionSchedule" },
    { label: "日量（台/日）", key: "dailyQuantity", highlight: true },
    { label: "過不足",       key: "surplusDeficit" },
    { label: "月末在庫",     key: "monthEndInventory" },
    { label: "在庫月数",     key: "monthEndInventoryMonths" },
  ];

  return (
    <div className="space-y-4">
      {/* 算出方式説明 */}
      <div className="bg-indigo-50 border border-indigo-100 rounded p-2.5 text-xs text-indigo-700">
        生産予定数は<strong>前半3ヶ月・後半3ヶ月</strong>の2グループで日量を均等化して算出しています。
        各グループの合計生産必要数 ÷ 合計稼働日数 = 日量レートで各月の生産数を決定します。
      </div>

      {/* フィルター */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="品目名・コードで検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm border-none outline-none bg-transparent"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select value={filterClassification} onChange={(e) => setFilterClassification(e.target.value)}
            className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white">
            <option value="all">全分類</option>
            {classifications.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterFactory} onChange={(e) => setFilterFactory(e.target.value)}
            className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white">
            <option value="all">全工場</option>
            {factories.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={filterLineName} onChange={(e) => setFilterLineName(e.target.value)}
            className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white">
            <option value="all">全ライン</option>
            {lineNames.map(({ lineNumber, lineName }) => (
              <option key={lineNumber} value={lineName}>{lineName}</option>
            ))}
          </select>
          <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}
            className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white">
            <option value="all">全生産方式</option>
            {methods.slice(1).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-500">表示月：</span>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white font-medium">
            {planMonths.map((m) => (
              <option key={m} value={m}>{formatYearMonth(m)}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-gray-400">{filtered.length} 件</span>
      </div>

      {/* テーブル */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-8 px-2 py-3" />
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">分類</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">工場名</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">ライン名</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">区分</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">コード</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">方式</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 whitespace-nowrap">在庫</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-blue-600 whitespace-nowrap">販売計画</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 whitespace-nowrap">生産必要数</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 whitespace-nowrap">生産予定数</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-indigo-500 whitespace-nowrap">日量</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 whitespace-nowrap">過不足</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 whitespace-nowrap">月末在庫</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 whitespace-nowrap">在庫月数</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const mp = planFor(p, selectedMonth);
                const expanded = expandedRows[p.id];
                const lm = lineMap.get(p.primaryLine);
                return (
                  <>
                    <tr
                      key={p.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleRow(p.id)}
                    >
                      <td className="px-2 py-2.5 text-center text-gray-400">
                        {expanded ? <ChevronDown className="w-3.5 h-3.5 mx-auto" /> : <ChevronRight className="w-3.5 h-3.5 mx-auto" />}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">{lm?.classification ?? "-"}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{lm?.factoryName ?? "-"}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{lm?.lineName ?? `ライン${p.primaryLine}`}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{p.planCategory1}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="text-xs text-gray-500 font-mono">{p.manufacturingItemCode}</div>
                        {p.comment && <div className="text-xs text-amber-600 mt-0.5">{p.comment}</div>}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${METHOD_COLORS[p.productionMethod] ?? "bg-gray-100 text-gray-600"}`}>
                          {p.productionMethod.split(":")[0]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs">{p.totalInventory.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-medium text-blue-700">
                        {mp ? mp.salesPlan.toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs">
                        {mp ? mp.requiredProduction.toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs">
                        {mp ? mp.productionSchedule.toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-medium text-indigo-600">
                        {mp ? mp.dailyQuantity.toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs">
                        {mp ? <SurplusCell value={mp.surplusDeficit} /> : "-"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs">
                        {mp ? mp.monthEndInventory.toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs">
                        {mp ? <InvMonthsCell value={mp.monthEndInventoryMonths} /> : "-"}
                      </td>
                    </tr>

                    {/* 展開行：月次詳細 */}
                    {expanded && (
                      <tr key={`${p.id}-detail`} className="bg-blue-50/40 border-b border-blue-100">
                        <td colSpan={15} className="px-6 py-3">
                          <div className="overflow-x-auto">
                            <table className="text-xs w-full">
                              <thead>
                                {/* グループ行 */}
                                <tr>
                                  <th className="text-left text-gray-400 pr-4 pb-0.5 font-normal text-[10px]" />
                                  {planMonths.map((m, i) => (
                                    <th key={m} className={`text-center pr-4 pb-0.5 font-semibold text-[10px] ${i < 3 ? "text-indigo-500" : "text-teal-500"}`}>
                                      {i === 0 ? "前半 G1" : i === 3 ? "後半 G2" : ""}
                                    </th>
                                  ))}
                                </tr>
                                <tr>
                                  <th className="text-left text-gray-500 pr-4 pb-1 font-medium whitespace-nowrap">項目</th>
                                  {planMonths.map((m, i) => (
                                    <th key={m} className={`text-right pr-4 pb-1 font-medium whitespace-nowrap ${
                                      m === selectedMonth ? "text-blue-700" :
                                      i < 3 ? "text-indigo-600" : "text-teal-600"
                                    }`}>
                                      {formatYearMonth(m)}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-blue-100/50">
                                {detailRows.map(({ label, key, highlight }) => (
                                  <tr key={label}>
                                    <td className={`pr-4 py-1 whitespace-nowrap ${highlight ? "text-indigo-600 font-semibold" : "text-gray-500"}`}>
                                      {label}
                                    </td>
                                    {planMonths.map((m, i) => {
                                      const mplan = leveledPlansMap.get(p.id)?.get(m);
                                      const val = mplan ? mplan[key] : null;
                                      return (
                                        <td key={m} className={`text-right pr-4 py-1 whitespace-nowrap ${
                                          m === selectedMonth ? "font-semibold text-blue-800" :
                                          highlight ? (i < 3 ? "text-indigo-600 font-medium" : "text-teal-600 font-medium") :
                                          "text-gray-700"
                                        }`}>
                                          {val !== null && val !== undefined
                                            ? key === "monthEndInventoryMonths"
                                              ? Number(val).toFixed(1)
                                              : key === "surplusDeficit"
                                              ? (Number(val) >= 0 ? `+${Number(val).toLocaleString()}` : Number(val).toLocaleString())
                                              : Number(val).toLocaleString()
                                            : "-"}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* 在庫情報 */}
                          <div className="mt-3 flex gap-6 text-xs text-gray-500">
                            <span>工場在庫: <strong className="text-gray-700">{p.factoryInventory.toLocaleString()}</strong></span>
                            <span>拠点在庫: <strong className="text-gray-700">{p.branchInventory.toLocaleString()}</strong></span>
                            <span>前月末在庫: <strong className="text-gray-700">{p.lastMonthInventory.toLocaleString()}</strong></span>
                            <span>発注点: <strong className="text-gray-700">{p.reorderPoint.toLocaleString()}</strong></span>
                            <span>ロット: <strong className="text-gray-700">{p.planLot.toLocaleString()}</strong></span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-400 text-sm">
              該当する品目が見つかりません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
