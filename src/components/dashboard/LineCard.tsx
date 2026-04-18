"use client";

import { LineSummary, LineMonthlySummary } from "@/lib/types";
import { formatYearMonth, getLineColor } from "@/lib/data";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useState } from "react";

interface Props {
  line: LineSummary;
}

type ChartMetric = "sales" | "production" | "inventory";

const metricLabels: Record<ChartMetric, string> = {
  sales: "販売計画",
  production: "生産計画",
  inventory: "月末在庫",
};

function formatYM(ym: number) {
  const s = String(ym);
  return `${s.slice(2, 4)}/${s.slice(4)}`;
}

function buildChartData(monthly: LineMonthlySummary[], metric: ChartMetric) {
  return monthly.map((m) => {
    if (metric === "sales") {
      return { month: formatYM(m.yearMonth), 前回: m.prevSalesPlan, 今回: m.currSalesPlan, 能力: m.productionCapacity };
    } else if (metric === "production") {
      return { month: formatYM(m.yearMonth), 前回: m.prevProductionPlan, 今回: m.currProductionPlan, 能力: m.productionCapacity };
    } else {
      return { month: formatYM(m.yearMonth), 前回: m.prevMonthEndInventory, 今回: m.currMonthEndInventory };
    }
  });
}

export default function LineCard({ line }: Props) {
  const [metric, setMetric] = useState<ChartMetric>("sales");
  const color = getLineColor(line.lineCode);
  const chartData = buildChartData(line.monthly, metric);

  const latest = line.monthly[line.monthly.length - 1];
  const salesDiff = latest.currSalesPlan - latest.prevSalesPlan;
  const prodDiff = latest.currProductionPlan - latest.prevProductionPlan;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ background: color }}
            />
            <h3 className="font-semibold text-gray-800">{line.lineCode}</h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            工場 {line.factoryCode} | ライン {line.lines.join("/")} | 日産 {line.dailyCapacity.toLocaleString()} 台
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">直近月 販売計画差</div>
          <div className={`text-sm font-medium ${salesDiff >= 0 ? "text-blue-600" : "text-red-600"}`}>
            {salesDiff >= 0 ? "+" : ""}{salesDiff.toLocaleString()} 台
          </div>
        </div>
      </div>

      {/* KPIバッジ */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "今回販売計画", value: latest.currSalesPlan },
          { label: "今回生産計画", value: latest.currProductionPlan },
          { label: "月末在庫", value: latest.currMonthEndInventory },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-gray-50 rounded p-2 text-center">
            <div className="text-xs text-gray-500">{kpi.label}</div>
            <div className="text-sm font-semibold text-gray-800 mt-0.5">
              {kpi.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* チャート種別切替 */}
      <div className="flex gap-1 mb-3">
        {(Object.keys(metricLabels) as ChartMetric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`text-xs px-2.5 py-1 rounded transition-colors ${
              metric === m
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {metricLabels[m]}
          </button>
        ))}
      </div>

      {/* チャート */}
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(v) => (typeof v === "number" ? v.toLocaleString() : String(v))}
            labelFormatter={(l) => `${l}月`}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="前回" fill="#94a3b8" radius={[2, 2, 0, 0]} />
          <Bar dataKey="今回" fill={color} radius={[2, 2, 0, 0]} />
          {metric !== "inventory" && (
            <ReferenceLine y={chartData[0]?.能力} stroke="#f59e0b" strokeDasharray="4 2" />
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* 在庫月数 */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span>在庫月数：前回 <strong className="text-gray-700">{latest.prevInventoryMonths}ヶ月</strong></span>
        <span>今回 <strong className="text-gray-700">{latest.currInventoryMonths}ヶ月</strong></span>
      </div>
    </div>
  );
}
