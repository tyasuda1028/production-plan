"use client";

import { useState, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  calcSimulation,
  buildDefaultInputs,
  formatYM,
  formatYMShort,
  MonthInput,
  ProductSimState,
} from "@/lib/simulation";
import { Product } from "@/lib/types";
import { RotateCcw, AlertTriangle } from "lucide-react";

interface Props {
  product: Product;
  startYearMonth: number;
  defaultTargetMonths?: number;
}

function NumInput({
  value,
  onChange,
  min,
  max,
  step,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-full text-right border border-blue-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-blue-50 ${className ?? ""}`}
    />
  );
}

function StepperInput({
  value,
  onChange,
  min = 0,
  max = 6,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(Math.min(max, Math.max(min, parseFloat(v.toFixed(2)))));
      }}
      min={min}
      max={max}
      step={0.05}
      className="w-16 text-xs font-semibold text-indigo-700 text-center tabular-nums border border-indigo-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
    />
  );
}

export default function ProductSimCard({
  product,
  startYearMonth,
  defaultTargetMonths = 1.5,
}: Props) {
  // startYearMonth に対応する月次計画の開始インデックスを検索
  const startIdx = useMemo(() => {
    const idx = product.monthlyPlans.findIndex((m) => m.yearMonth === startYearMonth);
    return idx >= 0 ? idx : 0;
  }, [product, startYearMonth]);

  // 6ヶ月分の販売計画（startYearMonth 起点）
  const baseSalesPlans = useMemo(
    () => product.monthlyPlans.slice(startIdx, startIdx + 6).map((m) => m.salesPlan),
    [product, startIdx]
  );

  // 7ヶ月目の販売計画（最終月の在庫月数計算用）
  const month7Sales = useMemo(
    () =>
      product.monthlyPlans[startIdx + 6]?.salesPlan ??
      product.monthlyPlans[product.monthlyPlans.length - 1]?.salesPlan ??
      0,
    [product, startIdx]
  );

  const [initialInventory, setInitialInventory] = useState(
    product.lastMonthInventory
  );
  const [inputs, setInputs] = useState<MonthInput[]>(() =>
    buildDefaultInputs(startYearMonth, baseSalesPlans, defaultTargetMonths)
  );
  const [showChart, setShowChart] = useState(true);

  const state: ProductSimState = useMemo(
    () => ({
      productId: product.id,
      initialInventory,
      inputs,
      nextSalesPlan: month7Sales,
    }),
    [product.id, initialInventory, inputs, month7Sales]
  );

  const results = useMemo(() => calcSimulation(state), [state]);

  const updateInput = useCallback(
    (idx: number, field: keyof MonthInput, value: number) => {
      setInputs((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: value };
        return next;
      });
    },
    []
  );

  const reset = () => {
    setInitialInventory(product.lastMonthInventory);
    setInputs(
      buildDefaultInputs(startYearMonth, baseSalesPlans, defaultTargetMonths)
    );
  };

  const hasShortage = results.some((r) => r.isShortage);

  // チャートデータ
  const chartData = results.map((r) => ({
    month: formatYMShort(r.yearMonth),
    月末在庫: r.monthEndInventory,
    在庫目標: r.targetInventoryQty,
    生産必要数: r.requiredProduction,
    販売計画: r.salesPlan,
  }));

  const invMonthsColor = (v: number) => {
    if (v < 1.0) return "text-red-600 font-bold";
    if (v > 2.5) return "text-amber-500 font-semibold";
    return "text-emerald-600 font-semibold";
  };

  return (
    <div className={`bg-white rounded-lg border ${hasShortage ? "border-red-300" : "border-gray-200"} overflow-hidden`}>
      {/* ヘッダー */}
      <div className="flex items-start justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            {hasShortage && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
            <span className="font-semibold text-gray-800 text-sm font-mono">{product.manufacturingItemCode}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">ライン {product.primaryLine}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChart((v) => !v)}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-200 rounded"
          >
            {showChart ? "グラフ非表示" : "グラフ表示"}
          </button>
          <button
            onClick={reset}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-200 rounded flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> リセット
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 計画開始時点の在庫 */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 whitespace-nowrap">計画開始時点の在庫（前月末）:</span>
          <div className="w-28">
            <NumInput
              value={initialInventory}
              onChange={setInitialInventory}
              min={0}
              step={10}
            />
          </div>
          <span className="text-xs text-gray-400">台</span>
          <span className="text-xs text-gray-400 ml-2">
            ロット: {product.planLot} | 発注点: {product.reorderPoint}
          </span>
        </div>

        {/* 計画テーブル */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 pr-3 text-gray-500 font-medium whitespace-nowrap w-36">項目</th>
                {results.map((r) => (
                  <th
                    key={r.yearMonth}
                    className="text-center py-2 px-2 text-gray-600 font-semibold whitespace-nowrap min-w-24"
                  >
                    {formatYM(r.yearMonth)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">

              {/* 販売計画（編集可） */}
              <tr className="hover:bg-gray-50">
                <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1.5" />
                  販売計画
                </td>
                {inputs.map((inp, i) => (
                  <td key={inp.yearMonth} className="px-2 py-1.5">
                    <NumInput
                      value={inp.salesPlan}
                      onChange={(v) => updateInput(i, "salesPlan", v)}
                      min={0}
                      step={10}
                    />
                  </td>
                ))}
              </tr>

              {/* 在庫月数目標（編集可、ステッパー） */}
              <tr className="bg-indigo-50/30 hover:bg-indigo-50/60">
                <td className="py-2 pr-3 whitespace-nowrap">
                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 mr-1.5" />
                  <span className="text-indigo-700 font-medium">在庫月数目標</span>
                  <span className="text-gray-400 ml-1">（翌月比）</span>
                </td>
                {inputs.map((inp, i) => (
                  <td key={inp.yearMonth} className="px-2 py-1.5 text-center">
                    <StepperInput
                      value={inp.targetInventoryMonths}
                      onChange={(v) => updateInput(i, "targetInventoryMonths", v)}
                    />
                  </td>
                ))}
              </tr>

              {/* 月末在庫目標数量（算出） */}
              <tr className="hover:bg-gray-50">
                <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-300 mr-1.5" />
                  月末在庫目標数
                </td>
                {results.map((r) => (
                  <td key={r.yearMonth} className="px-2 py-2 text-right text-gray-600">
                    {r.targetInventoryQty.toLocaleString()}
                  </td>
                ))}
              </tr>

              {/* 前月末在庫（参照） */}
              <tr className="hover:bg-gray-50">
                <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                  <span className="inline-block w-2 h-2 rounded-full bg-gray-300 mr-1.5" />
                  前月末在庫
                </td>
                {results.map((r) => (
                  <td key={r.yearMonth} className="px-2 py-2 text-right text-gray-500">
                    {r.prevInventory.toLocaleString()}
                  </td>
                ))}
              </tr>

              {/* 生産必要数（算出・強調） */}
              <tr className="bg-orange-50/40 hover:bg-orange-50/70">
                <td className="py-2 pr-3 whitespace-nowrap">
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1.5" />
                  <span className="text-orange-700 font-semibold">生産必要数</span>
                </td>
                {results.map((r) => (
                  <td key={r.yearMonth} className="px-2 py-2 text-right font-semibold text-orange-700">
                    {r.requiredProduction > 0
                      ? r.requiredProduction.toLocaleString()
                      : <span className="text-gray-300">0</span>}
                  </td>
                ))}
              </tr>

              {/* ロット換算 */}
              <tr className="hover:bg-gray-50">
                <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-200 mr-1.5" />
                  ロット換算（{product.planLot}台/lot）
                </td>
                {results.map((r) => (
                  <td key={r.yearMonth} className="px-2 py-2 text-right text-gray-500">
                    {r.requiredProduction > 0
                      ? `${Math.ceil(r.requiredProduction / product.planLot)}lot`
                      : <span className="text-gray-300">-</span>}
                  </td>
                ))}
              </tr>

              {/* 月末在庫（算出） */}
              <tr className="hover:bg-gray-50">
                <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                  月末在庫数
                </td>
                {results.map((r) => (
                  <td
                    key={r.yearMonth}
                    className={`px-2 py-2 text-right font-medium ${r.isShortage ? "text-red-600" : "text-emerald-700"}`}
                  >
                    {r.isShortage && <AlertTriangle className="w-3 h-3 inline mr-0.5 text-red-500" />}
                    {r.monthEndInventory.toLocaleString()}
                  </td>
                ))}
              </tr>

              {/* 月末在庫月数（算出・色分け） */}
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="py-2 pr-3 whitespace-nowrap">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 mr-1.5" />
                  <span className="text-gray-700 font-medium">月末在庫月数</span>
                  <span className="text-gray-400 ml-1">（翌月比）</span>
                </td>
                {results.map((r) => (
                  <td key={r.yearMonth} className={`px-2 py-2 text-right ${invMonthsColor(r.monthEndInventoryMonths)}`}>
                    {r.monthEndInventoryMonths.toFixed(1)}ヶ月
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* チャート */}
        {showChart && (
          <div>
            <p className="text-xs text-gray-500 mb-2">在庫推移グラフ</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v) => typeof v === "number" ? v.toLocaleString() : String(v)}
                  labelFormatter={(l) => `${l}月`}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="月末在庫"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="在庫目標"
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="生産必要数"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="販売計画"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  dot={false}
                />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-3 mt-1 text-xs text-gray-400">
              <span className="text-emerald-600">■ 月末在庫</span>
              <span className="text-indigo-500">-- 在庫目標</span>
              <span className="text-orange-500">■ 生産必要数</span>
              <span className="text-blue-500">-- 販売計画</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
