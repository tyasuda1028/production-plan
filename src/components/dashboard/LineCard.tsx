"use client";

import { useMemo } from "react";
import { addMonths, getPlanMonths, formatYearMonth } from "@/lib/data";
import { useMasterStore } from "@/lib/masterStore";
import { useLeveledPlans } from "@/lib/useLeveledPlans";
import { pmKey } from "@/lib/masterTypes";
import {
  ComposedChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

interface Props {
  lineNumbers: number[];
  title: string;
  subtitle?: string;
  color: string;
  isGroupSummary?: boolean;
}

function formatYM(ym: number) {
  const s = String(ym);
  return `${s.slice(2, 4)}/${s.slice(4)}`;
}

// X軸カスタムtick：月 + 稼働日数
function XAxisTick({
  x, y, payload, chartData,
}: {
  x?: number | string;
  y?: number | string;
  payload?: { value: string };
  chartData: { month: string; operatingDays: number }[];
}) {
  const d = chartData.find((c) => c.month === payload?.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#6b7280" fontSize={9}>
        {payload?.value}
      </text>
      {d && (
        <text x={0} y={0} dy={23} textAnchor="middle" fill="#9ca3af" fontSize={8}>
          {d.operatingDays}日
        </text>
      )}
    </g>
  );
}

export default function LineCard({ lineNumbers, title, subtitle, color, isGroupSummary }: Props) {
  const planBaseMonth      = useMasterStore((s) => s.planBaseMonth);
  const masterOpDays       = useMasterStore((s) => s.operatingDays);
  const lineMasters        = useMasterStore((s) => s.lineMasters);
  const productMasters     = useMasterStore((s) => s.productMasters);
  const inventorySnapshots = useMasterStore((s) => s.inventorySnapshots);
  const salesPlanOverrides = useMasterStore((s) => s.salesPlanOverrides);

  const leveledPlansMap = useLeveledPlans();

  const dailyCapacity = useMemo(() =>
    lineNumbers.reduce((sum, n) => {
      const lm = lineMasters.find((l) => l.lineNumber === n);
      return sum + (lm?.dailyCapacity ?? 0);
    }, 0),
    [lineNumbers, lineMasters]
  );

  // 前月 + 当月～+5 = 計7ヶ月
  const displayMonths = useMemo(() =>
    [addMonths(planBaseMonth, -1), ...getPlanMonths(planBaseMonth)],
    [planBaseMonth]
  );

  const lineProducts = useMemo(() =>
    productMasters.filter((pm) => pm.active !== false && lineNumbers.includes(pm.primaryLine)),
    [lineNumbers, productMasters]
  );

  const chartData = useMemo(() =>
    displayMonths.map((ym) => {
      let totalSales       = 0;
      let totalEndInv      = 0;
      let totalSchedule    = 0;
      const isPrevMonth    = ym === addMonths(planBaseMonth, -1);

      lineProducts.forEach((pm) => {
        const key = pmKey(pm);
        if (isPrevMonth) {
          const snap = inventorySnapshots.find((s) => s.yearMonth === ym && s.productCode === key);
          const ov   = salesPlanOverrides.find((o) => o.productId === key && o.yearMonth === ym);
          totalEndInv += snap?.quantity ?? 0;
          totalSales  += ov?.salesPlan ?? 0;
        } else {
          const leveled = leveledPlansMap.get(key)?.get(ym);
          if (leveled) {
            totalSales    += leveled.salesPlan;
            totalEndInv   += leveled.monthEndInventory;
            totalSchedule += leveled.productionSchedule;
          }
        }
      });

      const opDays    = masterOpDays.find((o) => o.yearMonth === ym)?.operatingDates.length ?? 20;
      const invMonths = totalSales > 0 ? parseFloat((totalEndInv / totalSales).toFixed(2)) : 0;
      const dailyQty  = opDays > 0 ? Math.round(totalSchedule / opDays) : 0;

      return {
        month:                   formatYM(ym),
        yearMonth:               ym,
        salesPlan:               totalSales,
        productionSchedule:      totalSchedule,
        monthEndInventory:       totalEndInv,
        monthEndInventoryMonths: invMonths,
        dailyQuantity:           dailyQty,
        operatingDays:           opDays,
        isCurrent:               ym === planBaseMonth,
      };
    }),
    [displayMonths, lineProducts, leveledPlansMap, masterOpDays, planBaseMonth, inventorySnapshots, salesPlanOverrides]
  );

  const currentData = chartData.find((d) => d.yearMonth === planBaseMonth) ?? chartData[1];

  const cardCls = isGroupSummary
    ? "bg-white rounded-lg border-2 border-blue-200 p-4 space-y-3 shadow-sm"
    : "bg-white rounded-lg border border-gray-200 p-4 space-y-3";

  // テーブル行定義
  const tableRows: { label: string; key: keyof typeof chartData[0]; unit: string; decimal?: boolean }[] = [
    { label: "販売計画",  key: "salesPlan",               unit: "台"   },
    { label: "生産計画",  key: "productionSchedule",       unit: "台"   },
    { label: "月末在庫",  key: "monthEndInventory",        unit: "台"   },
    { label: "在庫月数",  key: "monthEndInventoryMonths",  unit: "ヶ月", decimal: true },
    { label: "日量",      key: "dailyQuantity",            unit: "台"   },
    { label: "稼働日",    key: "operatingDays",            unit: "日"   },
  ];

  return (
    <div className={cardCls}>
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
            <h3 className={`font-semibold text-gray-800 ${isGroupSummary ? "text-base" : "text-sm"}`}>
              {title}
            </h3>
            {isGroupSummary && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">合計</span>
            )}
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="text-right text-xs text-gray-400">{formatYearMonth(planBaseMonth)}</div>
      </div>

      {/* KPIバッジ */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "販売計画", value: currentData?.salesPlan,              unit: "台",   decimal: false },
          { label: "月末在庫", value: currentData?.monthEndInventory,       unit: "台",   decimal: false },
          { label: "在庫月数", value: currentData?.monthEndInventoryMonths, unit: "ヶ月", decimal: true  },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-gray-50 rounded p-2 text-center">
            <div className="text-xs text-gray-500">{kpi.label}</div>
            <div className="text-sm font-semibold text-gray-800 mt-0.5">
              {kpi.decimal ? kpi.value?.toFixed(1) : kpi.value?.toLocaleString()}{" "}
              <span className="text-[10px] font-normal text-gray-400">{kpi.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart 1: 月末在庫(棒) + 販売計画(線) + 在庫月数(右軸) */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">在庫・販売計画推移</p>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 28, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              interval={0}
              tick={(props) => <XAxisTick {...props} chartData={chartData} />}
              height={36}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 9 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 9, fill: "#f59e0b" }}
              width={26}
              domain={[0, "auto"]}
            />
            <Tooltip
              formatter={(v, name) => {
                if (name === "在庫月数") return [`${Number(v).toFixed(1)} ヶ月`, name];
                return [typeof v === "number" ? v.toLocaleString() : v, name];
              }}
              labelFormatter={(l) => `${l}月`}
            />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            <Bar yAxisId="left" dataKey="monthEndInventory"        name="月末在庫" fill={color}    opacity={0.7} radius={[2, 2, 0, 0]} />
            <Line yAxisId="left"  type="monotone" dataKey="salesPlan"               name="販売計画" stroke="#16a34a" strokeWidth={2} dot={{ r: 2 }} />
            <Line yAxisId="right" type="monotone" dataKey="monthEndInventoryMonths" name="在庫月数" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: 日量推移 + 日産能力ライン */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">
          日量推移（稼働日ベース）
          {dailyCapacity > 0 && (
            <span className="ml-2 text-gray-500">日産能力 {dailyCapacity.toLocaleString()} 台</span>
          )}
        </p>
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={chartData} margin={{ top: 4, right: 28, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              interval={0}
              tick={(props) => <XAxisTick {...props} chartData={chartData} />}
              height={36}
            />
            <YAxis
              tick={{ fontSize: 9 }}
              domain={[0, (dataMax: number) => Math.ceil(Math.max(dataMax, dailyCapacity) * 1.15)]}
            />
            <Tooltip
              formatter={(v, name) => [typeof v === "number" ? v.toLocaleString() : v, name]}
              labelFormatter={(l) => `${l}月`}
            />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            <Line type="monotone" dataKey="dailyQuantity" name="日量" stroke={color} strokeWidth={2} dot={{ r: 2 }} />
            {dailyCapacity > 0 && (
              <ReferenceLine
                y={dailyCapacity}
                stroke="#dc2626"
                strokeDasharray="4 2"
                label={{ value: `能力 ${dailyCapacity.toLocaleString()}`, position: "insideTopRight", fontSize: 8, fill: "#dc2626" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* データテーブル */}
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr>
              <th className="text-left py-1 px-1.5 text-gray-400 font-medium whitespace-nowrap bg-gray-50 border border-gray-100 sticky left-0 z-10">
                項目
              </th>
              {chartData.map((d) => (
                <th
                  key={d.yearMonth}
                  className={`py-1 px-1 text-center font-medium whitespace-nowrap border border-gray-100 min-w-[44px] ${
                    d.isCurrent
                      ? "bg-blue-50 text-blue-700"
                      : d.yearMonth < planBaseMonth
                      ? "bg-gray-50 text-gray-400"
                      : "bg-gray-50 text-gray-600"
                  }`}
                >
                  {d.month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row.key} className="hover:bg-gray-50/50">
                <td className="py-1 px-1.5 text-gray-500 whitespace-nowrap bg-white border border-gray-100 sticky left-0 z-10 font-medium">
                  {row.label}
                  <span className="text-gray-300 ml-0.5">{row.unit}</span>
                </td>
                {chartData.map((d) => {
                  const val = d[row.key] as number;
                  const isEmpty = !val && val !== 0;
                  return (
                    <td
                      key={d.yearMonth}
                      className={`py-1 px-1 text-right tabular-nums border border-gray-100 ${
                        d.isCurrent
                          ? "bg-blue-50/60 text-blue-800 font-semibold"
                          : d.yearMonth < planBaseMonth
                          ? "text-gray-400"
                          : "text-gray-700"
                      }`}
                    >
                      {isEmpty ? "—" : row.decimal ? val.toFixed(1) : val.toLocaleString()}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
