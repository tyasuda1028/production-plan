import { lineSummaries, formatYearMonth } from "@/lib/data";
import LineCard from "@/components/dashboard/LineCard";

export default function DashboardPage() {
  const months = lineSummaries[0].monthly.map((m) => m.yearMonth);

  // ブライツ全体の直近合計
  const total = lineSummaries[0].monthly[lineSummaries[0].monthly.length - 1];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ページヘッダー */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-1">
          対象期間：{formatYearMonth(months[0])} 〜 {formatYearMonth(months[months.length - 1])}
        </p>
      </div>

      {/* 全体サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "今回販売計画（直近月）", value: total.currSalesPlan, sub: `前回 ${total.prevSalesPlan.toLocaleString()}` },
          { label: "今回生産計画（直近月）", value: total.currProductionPlan, sub: `前回 ${total.prevProductionPlan.toLocaleString()}` },
          { label: "月末在庫（直近月）", value: total.currMonthEndInventory, sub: `前回 ${total.prevMonthEndInventory.toLocaleString()}` },
          { label: "在庫月数（直近月）", value: `${total.currInventoryMonths}ヶ月`, sub: `前回 ${total.prevInventoryMonths}ヶ月` },
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
