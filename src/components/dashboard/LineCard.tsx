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
  /** ライン番号リスト（合計カードは複数、個別カードは単一） */
  lineNumbers: number[];
  /** カードタイトル（例: "ブライツ 合計", "ライン2"） */
  title: string;
  /** サブタイトル（例: "ライン2 / ライン3 / ..."） */
  subtitle?: string;
  /** グラフ色 */
  color: string;
  /** 合計カード(グループ)のスタイリングフラグ */
  isGroupSummary?: boolean;
}

function formatYM(ym: number) {
  const s = String(ym);
  return `${s.slice(2, 4)}/${s.slice(4)}`;
}

export default function LineCard({ lineNumbers, title, subtitle, color, isGroupSummary }: Props) {
  const planBaseMonth  = useMasterStore((s) => s.planBaseMonth);
  const masterOpDays   = useMasterStore((s) => s.operatingDays);
  const lineMasters    = useMasterStore((s) => s.lineMasters);
  const productMasters = useMasterStore((s) => s.productMasters);

  const leveledPlansMap = useLeveledPlans();

  // 日産能力: 対象ライン合計
  const dailyCapacity = useMemo(() =>
    lineNumbers.reduce((sum, n) => {
      const lm = lineMasters.find((l) => l.lineNumber === n);
      return sum + (lm?.dailyCapacity ?? 0);
    }, 0),
    [lineNumbers, lineMasters]
  );

  // 表示月: 前月 + 当月から先6ヶ月 = 計7ヶ月
  const displayMonths = useMemo(() =>
    [addMonths(planBaseMonth, -1), ...getPlanMonths(planBaseMonth)],
    [planBaseMonth]
  );

  // このカードに属する品目（productMasters から）
  const lineProducts = useMemo(() =>
    productMasters.filter((pm) => pm.active !== false && lineNumbers.includes(pm.primaryLine)),
    [lineNumbers, productMasters]
  );

  // 月別集計
  const chartData = useMemo(() =>
    displayMonths.map((ym) => {
      let totalSales    = 0;
      let totalEndInv   = 0;
      let totalSchedule = 0;

      lineProducts.forEach((pm) => {
        const leveled = leveledPlansMap.get(pmKey(pm))?.get(ym);
        if (leveled) {
          totalSales    += leveled.salesPlan;
          totalEndInv   += leveled.monthEndInventory;
          totalSchedule += leveled.productionSchedule;
        }
      });

      const opDays    = masterOpDays.find((o) => o.yearMonth === ym)?.operatingDates.length ?? 20;
      const invMonths = totalSales > 0 ? parseFloat((totalEndInv / totalSales).toFixed(2)) : 0;
      const dailyQty  = opDays > 0 ? Math.round(totalSchedule / opDays) : 0;

      return {
        month:                   formatYM(ym),
        yearMonth:               ym,
        salesPlan:               totalSales,
        monthEndInventory:       totalEndInv,
        monthEndInventoryMonths: invMonths,
        dailyQuantity:           dailyQty,
        operatingDays:           opDays,
        isCurrent:               ym === planBaseMonth,
      };
    }),
    [displayMonths, lineProducts, leveledPlansMap, masterOpDays, planBaseMonth]
  );

  const currentData = chartData.find((d) => d.yearMonth === planBaseMonth) ?? chartData[1];

  const cardCls = isGroupSummary
    ? "bg-white rounded-lg border-2 border-blue-200 p-5 space-y-4 shadow-sm"
    : "bg-white rounded-lg border border-gray-200 p-5 space-y-4";

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
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="text-right text-xs text-gray-400">{formatYearMonth(planBaseMonth)}</div>
      </div>

      {/* KPIバッジ */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "販売計画",  value: currentData?.salesPlan,              unit: "台"  },
          { label: "月末在庫",  value: currentData?.monthEndInventory,       unit: "台"  },
          { label: "在庫月数",  value: currentData?.monthEndInventoryMonths, unit: "ヶ月", decimal: true },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-gray-50 rounded p-2 text-center">
            <div className="text-xs text-gray-500">{kpi.label}</div>
            <div className="text-sm font-semibold text-gray-800 mt-0.5">
              {kpi.decimal
                ? kpi.value?.toFixed(1)
                : kpi.value?.toLocaleString()}{" "}
              <span className="text-[10px] font-normal text-gray-400">{kpi.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart 1: 月末在庫(棒) + 販売計画(線) + 在庫月数(右軸) */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">在庫・販売計画推移</p>
        <ResponsiveContainer width="100%" height={170}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 28, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: "#f59e0b" }}
              width={28}
              domain={[0, "auto"]}
            />
            <Tooltip
              formatter={(v, name) => {
                if (name === "在庫月数") return [`${Number(v).toFixed(1)} ヶ月`, name];
                return [typeof v === "number" ? v.toLocaleString() : v, name];
              }}
              labelFormatter={(l) => `${l}月`}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar yAxisId="left" dataKey="monthEndInventory" name="月末在庫" fill={color} opacity={0.7} radius={[2, 2, 0, 0]} />
            <Line yAxisId="left" type="monotone" dataKey="salesPlan" name="販売計画" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="monthEndInventoryMonths" name="在庫月数" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} />
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
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData} margin={{ top: 4, right: 28, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              domain={[0, (dataMax: number) => Math.ceil(Math.max(dataMax, dailyCapacity) * 1.15)]}
            />
            <Tooltip
              formatter={(v, name) => [typeof v === "number" ? v.toLocaleString() : v, name]}
              labelFormatter={(l) => `${l}月`}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="dailyQuantity" name="日量" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
            {dailyCapacity > 0 && (
              <ReferenceLine
                y={dailyCapacity}
                stroke="#dc2626"
                strokeDasharray="4 2"
                label={{ value: `能力 ${dailyCapacity.toLocaleString()}`, position: "insideTopRight", fontSize: 9, fill: "#dc2626" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
