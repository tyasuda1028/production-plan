"use client";

import { useMemo } from "react";
import { lineSummaries, products, formatYearMonth, getPlanMonths, addMonths } from "@/lib/data";
import { useMasterStore } from "@/lib/masterStore";
import { useLeveledPlans } from "@/lib/useLeveledPlans";
import LineCard from "@/components/dashboard/LineCard";

export default function DashboardPage() {
  const planBaseMonth  = useMasterStore((s) => s.planBaseMonth);
  const planMonths     = getPlanMonths(planBaseMonth);
  const prevMonth      = addMonths(planBaseMonth, -1);
  const leveledPlansMap = useLeveledPlans();

  // 表示月の全品目合計（均等日量計画ベース）
  const currentKPI = useMemo(() => {
    let salesPlan = 0, productionSchedule = 0, monthEndInventory = 0;
    products.forEach((p) => {
      const lp = leveledPlansMap.get(p.id)?.get(planBaseMonth);
      if (!lp) return;
      salesPlan          += lp.salesPlan;
      productionSchedule += lp.productionSchedule;
      monthEndInventory  += lp.monthEndInventory;
    });
    const inventoryMonths = salesPlan > 0
      ? parseFloat((monthEndInventory / salesPlan).toFixed(2))
      : 0;
    return { salesPlan, productionSchedule, monthEndInventory, inventoryMonths };
  }, [leveledPlansMap, planBaseMonth]);

  // 前月の全品目合計（静的データ）
  const prevKPI = useMemo(() => {
    let salesPlan = 0, productionSchedule = 0, monthEndInventory = 0;
    products.forEach((p) => {
      const mp = p.monthlyPlans.find((m) => m.yearMonth === prevMonth);
      if (!mp) return;
      salesPlan          += mp.salesPlan;
      productionSchedule += mp.productionSchedule;
      monthEndInventory  += mp.monthEndInventory;
    });
    const inventoryMonths = salesPlan > 0
      ? parseFloat((monthEndInventory / salesPlan).toFixed(2))
      : 0;
    return { salesPlan, productionSchedule, monthEndInventory, inventoryMonths };
  }, [prevMonth]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ページヘッダー */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-1">
          表示月：{formatYearMonth(planBaseMonth)}（計画期間 {formatYearMonth(planMonths[0])} 〜 {formatYearMonth(planMonths[planMonths.length - 1])}）
        </p>
      </div>

      {/* 全体サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: `販売計画（${formatYearMonth(planBaseMonth)}）`,
            value: currentKPI.salesPlan,
            sub: `前月 ${prevKPI.salesPlan.toLocaleString()} 台`,
          },
          {
            label: `生産計画（${formatYearMonth(planBaseMonth)}）`,
            value: currentKPI.productionSchedule,
            sub: `前月 ${prevKPI.productionSchedule.toLocaleString()} 台`,
          },
          {
            label: `月末在庫（${formatYearMonth(planBaseMonth)}）`,
            value: currentKPI.monthEndInventory,
            sub: `前月 ${prevKPI.monthEndInventory.toLocaleString()} 台`,
          },
          {
            label: `在庫月数（${formatYearMonth(planBaseMonth)}）`,
            value: `${currentKPI.inventoryMonths.toFixed(1)} ヶ月`,
            sub: `前月 ${prevKPI.inventoryMonths.toFixed(1)} ヶ月`,
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">{kpi.label}</div>
            <div className="text-2xl font-bold text-gray-800">
              {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
            </div>
            <div className="text-xs text-gray-400 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ライン別カード */}
      <h2 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
        ライン別サマリー
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {lineSummaries.map((line) => (
          <LineCard key={line.lineCode} line={line} />
        ))}
      </div>
    </div>
  );
}
