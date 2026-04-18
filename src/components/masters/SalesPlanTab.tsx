"use client";

import { useState, useMemo, useCallback } from "react";
import { products } from "@/lib/data";
import { useMasterStore } from "@/lib/masterStore";
import { getPlanMonths, formatYearMonth } from "@/lib/data";
import { Search, RotateCcw } from "lucide-react";

export default function SalesPlanTab() {
  const planBaseMonth = useMasterStore((s) => s.planBaseMonth);
  const salesPlanOverrides = useMasterStore((s) => s.salesPlanOverrides);
  const setSalesPlanOverride = useMasterStore((s) => s.setSalesPlanOverride);
  const clearSalesPlanOverride = useMasterStore((s) => s.clearSalesPlanOverride);

  const planMonths = getPlanMonths(planBaseMonth);

  const [search, setSearch] = useState("");

  const filtered = useMemo(() =>
    products.filter((p) => {
      const q = search.toLowerCase();
      return !q || p.productName.toLowerCase().includes(q) || p.manufacturingItemCode.toLowerCase().includes(q);
    }),
    [search]
  );

  const getOverride = useCallback(
    (productId: string, ym: number) =>
      salesPlanOverrides.find((o) => o.productId === productId && o.yearMonth === ym)?.salesPlan,
    [salesPlanOverrides]
  );

  const getDisplayValue = (productId: string, ym: number, fallback: number) =>
    getOverride(productId, ym) ?? fallback;

  function handleBlur(productId: string, ym: number, rawValue: string, fallback: number) {
    const num = parseInt(rawValue.replace(/,/g, ""), 10);
    if (isNaN(num) || num < 0) return;
    if (num === fallback) {
      clearSalesPlanOverride(productId, ym);
    } else {
      setSalesPlanOverride(productId, ym, num);
    }
  }

  function hasAnyOverride(productId: string) {
    return planMonths.some((ym) => getOverride(productId, ym) !== undefined);
  }

  function clearProduct(productId: string) {
    planMonths.forEach((ym) => clearSalesPlanOverride(productId, ym));
  }

  const overrideCount = salesPlanOverrides.filter((o) =>
    planMonths.includes(o.yearMonth)
  ).length;

  return (
    <div className="space-y-4">
      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-700">
        品目ごとに<strong>先6ヶ月分の販売計画</strong>を入力します。
        入力した値は生産計画表の販売計画・生産必要数・過不足に即時反映されます。
        元の計画値に戻すには各行の <strong>↩</strong> ボタンを使います。
      </div>

      {/* 検索バー */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm bg-white border border-gray-200 rounded px-3 py-1.5">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="品目名・コードで検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm border-none outline-none bg-transparent"
          />
        </div>
        {overrideCount > 0 && (
          <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1">
            {overrideCount} セル変更中
          </span>
        )}
      </div>

      {/* グリッドテーブル */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap sticky left-0 bg-gray-50 z-10">品目名</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap sticky left-[180px] bg-gray-50 z-10">製造器種名</th>
                {planMonths.map((ym) => (
                  <th key={ym} className="px-3 py-3 text-right text-xs font-medium text-blue-600 whitespace-nowrap min-w-[90px]">
                    {formatYearMonth(ym)}
                  </th>
                ))}
                <th className="px-3 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => {
                const modified = hasAnyOverride(p.id);
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 ${modified ? "bg-blue-50/30" : ""}`}>
                    <td className="px-3 py-2 text-xs font-medium text-gray-800 whitespace-nowrap sticky left-0 bg-inherit z-10 max-w-[175px] truncate">
                      {p.productName}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 font-mono whitespace-nowrap sticky left-[180px] bg-inherit z-10">
                      {p.manufacturingItemCode}
                    </td>
                    {planMonths.map((ym) => {
                      const basePlan = p.monthlyPlans.find((m) => m.yearMonth === ym);
                      const fallback = basePlan?.salesPlan ?? 0;
                      const overrideVal = getOverride(p.id, ym);
                      const displayVal = overrideVal ?? fallback;
                      const changed = overrideVal !== undefined && overrideVal !== fallback;
                      return (
                        <td key={ym} className="px-2 py-1.5 text-right">
                          <input
                            type="number"
                            defaultValue={displayVal}
                            key={`${p.id}-${ym}-${displayVal}`}
                            min={0}
                            onBlur={(e) => handleBlur(p.id, ym, e.target.value, fallback)}
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
                          onClick={() => clearProduct(p.id)}
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
            <div className="py-12 text-center text-gray-400 text-sm">該当する品目が見つかりません</div>
          )}
        </div>
      </div>
    </div>
  );
}
