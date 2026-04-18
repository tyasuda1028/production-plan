"use client";

import { useMemo } from "react";
import { LineSummary } from "@/lib/types";
import { products, addMonths, getPlanMonths, formatYearMonth, getLineColor } from "@/lib/data";
import { useMasterStore } from "@/lib/masterStore";
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
  line: LineSummary;
}

function formatYM(ym: number) {
  const s = String(ym);
  return `${s.slice(2, 4)}/${s.slice(4)}`;
}

export default function LineCard({ line }: Props) {
  const planBaseMonth   = useMasterStore((s) => s.planBaseMonth);
  const salesOverrides  = useMasterStore((s) => s.salesPlanOverrides);
  const masterOpDays    = useMasterStore((s) => s.operatingDays);
  const lineMasters     = useMasterStore((s) => s.lineMasters);

  const color = getLineColor(line.lineCode);

  // ラインマスター情報
  const firstLine      = line.lines[0];
  const lineMaster     = lineMasters.find((l) => l.lineNumber === firstLine);
  const classification = lineMaster?.classification ?? line.lineCode;
  const lineNames      = line.lines
    .map((n) => lineMasters.find((l) => l.lineNumber === n)?.lineName ?? `ライン${n}`)
    .join(" / ");
  const factoryName = lineMaster?.factoryName ?? `工場${line.factoryCode}`;
  // 日量能力: ラインマスターの合計（旧 localStorage データで undefined の場合は 0 として扱う）
  // なければ lineSummary のデフォルト値にフォールバック
  const dailyCapacity = useMemo(() => {
    const fromMasters = line.lines.reduce((sum, n) => {
      const lm = lineMasters.find((l) => l.lineNumber === n);
      const cap = typeof lm?.dailyCapacity === "number" ? lm.dailyCapacity : 0;
      return sum + cap;
    }, 0);
    return fromMasters > 0 ? fromMasters : (line.dailyCapacity ?? 0);
  }, [line.lines, line.dailyCapacity, lineMasters]);

  // 表示月: 前月 + 当月から先6ヶ月 = 計7ヶ月
  const displayMonths = useMemo(() =>
    [addMonths(planBaseMonth, -1), ...getPlanMonths(planBaseMonth)],
    [planBaseMonth]
  );

  // オーバーライドマップ
  const overrideMap = useMemo(() =>
    new Map(salesOverrides.map((o) => [`${o.productId}:${o.yearMonth}`, o.salesPlan])),
    [salesOverrides]
  );

  // このラインに属する品目を絞り込む
  const lineProducts = useMemo(() =>
    products.filter((p) => line.lines.includes(p.primaryLine)),
    [line.lines]
  );

  // 月別集計データを計算
  const chartData = useMemo(() =>
    displayMonths.map((ym) => {
      let totalSales    = 0;
      let totalEndInv   = 0;
      let totalSchedule = 0;

      lineProducts.forEach((p) => {
        const mp = p.monthlyPlans.find((m) => m.yearMonth === ym);
        if (!mp) return;
        const override = overrideMap.get(`${p.id}:${ym}`);
        totalSales    += override ?? mp.salesPlan;
        totalEndInv   += mp.monthEndInventory;
        totalSchedule += mp.productionSchedule;
      });

      const opDays     = masterOpDays.find((o) => o.yearMonth === ym)?.operatingDates.length ?? 20;
      const invMonths  = totalSales > 0 ? parseFloat((totalEndInv / totalSales).toFixed(2)) : 0;
      const dailyQty   = opDays > 0 ? Math.round(totalSchedule / opDays) : 0;

      return {
        month:                 formatYM(ym),
        yearMonth:             ym,
        salesPlan:             totalSales,
        monthEndInventory:     totalEndInv,
        monthEndInventoryMonths: invMonths,
        dailyQuantity:         dailyQty,
        operatingDays:         opDays,
        isCurrent:             ym === planBaseMonth,
      };
    }),
    [displayMonths, lineProducts, overrideMap, masterOpDays, planBaseMonth]
  );

  // 表示月（planBaseMonth）のKPI
  const currentData = chartData.find((d) => d.yearMonth === planBaseMonth) ?? chartData[1];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
            <h3 className="font-semibold text-gray-800">{classification}</h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {factoryName} | {lineNames} | 日産能力 {dailyCapacity.toLocaleString()} 台
          </p>
        </div>
        <div className="text-right text-xs text-gray-400">
          {formatYearMonth(planBaseMonth)}
        </div>
      </div>

      {/* KPIバッジ */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "販売計画",     value: currentData?.salesPlan,                 unit: "台" },
          { label: "月末在庫",     value: currentData?.monthEndInventory,          unit: "台" },
          { label: "在庫月数",     value: currentData?.monthEndInventoryMonths,    unit: "ヶ月", decimal: true },
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

      {/* ── Chart 1: 月末在庫(棒) + 販売計画(線) / 在庫月数(線・右軸) ── */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">在庫・販売計画推移</p>
        <ResponsiveContainer width="100%" height={170}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 28, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            {/* 左軸: 在庫・販売 */}
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
            {/* 右軸: 在庫月数 */}
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
            {/* 棒グラフ: 月末在庫（左軸） */}
            <Bar
              yAxisId="left"
              dataKey="monthEndInventory"
              name="月末在庫"
              fill={color}
              opacity={0.7}
              radius={[2, 2, 0, 0]}
            />
            {/* 折れ線: 販売計画（左軸） */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="salesPlan"
              name="販売計画"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            {/* 折れ線: 在庫月数（右軸） */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="monthEndInventoryMonths"
              name="在庫月数"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Chart 2: 日量推移 + 日産能力ライン ── */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">日量推移（稼働日ベース）</p>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData} margin={{ top: 4, right: 28, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            {/* domain を dailyCapacity まで伸ばして基準線が確実に見えるようにする */}
            <YAxis
              tick={{ fontSize: 10 }}
              domain={[0, (dataMax: number) => Math.ceil(Math.max(dataMax, dailyCapacity) * 1.15)]}
            />
            <Tooltip
              formatter={(v, name) => [
                typeof v === "number" ? v.toLocaleString() : v,
                name,
              ]}
              labelFormatter={(l) => `${l}月`}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {/* 折れ線: 日量 */}
            <Line
              type="monotone"
              dataKey="dailyQuantity"
              name="日量"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            {/* 基準線: 日産能力 */}
            <ReferenceLine
              y={dailyCapacity}
              stroke="#dc2626"
              strokeDasharray="4 2"
              label={{
                value: `能力 ${dailyCapacity.toLocaleString()}`,
                position: "insideTopRight",
                fontSize: 9,
                fill: "#dc2626",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
