"use client";

import { useMemo, useState } from "react";
import { formatYearMonth, getPlanMonths, addMonths } from "@/lib/data";
import { useMasterStore } from "@/lib/masterStore";
import { useLeveledPlans } from "@/lib/useLeveledPlans";
import { LineMaster } from "@/lib/masterTypes";
import LineCard from "@/components/dashboard/LineCard";
import { ChevronDown, ChevronRight } from "lucide-react";

const PALETTE = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];
function getColor(index: number) { return PALETTE[index % PALETTE.length]; }

// ── 分類グループ（合計 + 詳細折りたたみ） ───────────────────────
function ClassificationGroup({
  factoryName,
  classification,
  lineNumbers,
  lines,
  color,
}: {
  factoryName: string;
  classification: string;
  lineNumbers: number[];
  lines: LineMaster[];
  color: string;
}) {
  const [open, setOpen] = useState(false);
  const isSingleLine = lineNumbers.length === 1;

  return (
    <div>
      {/* 分類ラベル */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
        <h3 className="text-sm font-semibold text-gray-600">{classification}</h3>
        <span className="text-xs text-gray-400">{lines.length} ライン</span>
      </div>

      {isSingleLine ? (
        /* ライン1本のみ → 合計カードをそのまま表示（詳細なし） */
        <LineCard
          lineNumbers={lineNumbers}
          title={lines[0]?.lineName || `ライン${lineNumbers[0]}`}
          subtitle={`${factoryName} | ${classification} | 日産 ${(lines[0]?.dailyCapacity ?? 0).toLocaleString()} 台`}
          color={color}
        />
      ) : (
        <>
          {/* 分類合計カード */}
          <LineCard
            lineNumbers={lineNumbers}
            title={`${classification} 合計`}
            subtitle={`${factoryName} | ${lines.map((l) => l.lineName || `ライン${l.lineNumber}`).join(" / ")}`}
            color={color}
            isGroupSummary
          />

          {/* ライン別詳細トグル */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium px-1 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            {open
              ? <ChevronDown className="w-3.5 h-3.5" />
              : <ChevronRight className="w-3.5 h-3.5" />
            }
            ライン別詳細
            <span className="text-gray-400">（{lines.length} ライン）</span>
          </button>

          {/* 個別ラインカード */}
          {open && (
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pl-2 border-l-2 border-gray-100">
              {lines.map((l) => (
                <LineCard
                  key={l.lineNumber}
                  lineNumbers={[l.lineNumber]}
                  title={l.lineName || `ライン${l.lineNumber}`}
                  subtitle={`${factoryName} | ${classification} | 日産 ${(l.dailyCapacity ?? 0).toLocaleString()} 台`}
                  color={color}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── ページ本体 ────────────────────────────────────────────────────
export default function DashboardPage() {
  const planBaseMonth   = useMasterStore((s) => s.planBaseMonth);
  const factoryMasters  = useMasterStore((s) => s.factoryMasters);
  const lineMasters     = useMasterStore((s) => s.lineMasters);
  const planMonths      = getPlanMonths(planBaseMonth);
  const leveledPlansMap = useLeveledPlans();

  // ── 全体KPI ──────────────────────────────────────────────────────
  const currentKPI = useMemo(() => {
    let salesPlan = 0, productionSchedule = 0, monthEndInventory = 0;
    leveledPlansMap.forEach((monthMap) => {
      const lp = monthMap.get(planBaseMonth);
      if (!lp) return;
      salesPlan          += lp.salesPlan;
      productionSchedule += lp.productionSchedule;
      monthEndInventory  += lp.monthEndInventory;
    });
    const inventoryMonths = salesPlan > 0 ? parseFloat((monthEndInventory / salesPlan).toFixed(2)) : 0;
    return { salesPlan, productionSchedule, monthEndInventory, inventoryMonths };
  }, [leveledPlansMap, planBaseMonth]);

  // ── 工場 → 分類 → ライン のグループ構造 ─────────────────────────
  const factoryGroups = useMemo(() => {
    return factoryMasters.map((factory) => {
      const factoryLines = lineMasters.filter((l) => l.factoryName === factory.factoryName);
      const classMap = new Map<string, number[]>();
      factoryLines.forEach((l) => {
        const cls = l.classification || "（未分類）";
        if (!classMap.has(cls)) classMap.set(cls, []);
        classMap.get(cls)!.push(l.lineNumber);
      });
      const classifications = Array.from(classMap.entries()).map(([cls, lineNumbers]) => ({
        classification: cls,
        lineNumbers,
        lines: lineNumbers.map((n) => lineMasters.find((l) => l.lineNumber === n)!).filter(Boolean),
      }));
      return { factory, classifications };
    });
  }, [factoryMasters, lineMasters]);

  // ── 孤立ライン ────────────────────────────────────────────────────
  const orphanLines = useMemo(() => {
    const registered = new Set(factoryMasters.map((f) => f.factoryName));
    return lineMasters.filter((l) => !registered.has(l.factoryName));
  }, [factoryMasters, lineMasters]);

  // 色割り当て用
  const allClassifications = useMemo(() => {
    const seen = new Set<string>();
    lineMasters.forEach((l) => seen.add(l.classification || "（未分類）"));
    return Array.from(seen);
  }, [lineMasters]);
  const classColor = (cls: string) => getColor(allClassifications.indexOf(cls));

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
          { label: `販売計画（${formatYearMonth(planBaseMonth)}）`,  value: currentKPI.salesPlan,          sub: "" },
          { label: `生産計画（${formatYearMonth(planBaseMonth)}）`,  value: currentKPI.productionSchedule, sub: "" },
          { label: `月末在庫（${formatYearMonth(planBaseMonth)}）`,  value: currentKPI.monthEndInventory,  sub: "" },
          { label: `在庫月数（${formatYearMonth(planBaseMonth)}）`,  value: `${currentKPI.inventoryMonths.toFixed(1)} ヶ月`, sub: "" },
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

      {/* 工場別セクション */}
      {factoryGroups.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
          工場マスターにデータがありません。マスター設定 → 工場マスター で登録してください。
        </div>
      ) : (
        <div className="space-y-10">
          {factoryGroups.map(({ factory, classifications }) => (
            <section key={factory.factoryName}>
              {/* 工場ヘッダー */}
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gray-200" />
                <h2 className="text-base font-bold text-gray-700 px-1">{factory.factoryName}</h2>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              {classifications.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">この工場にラインが登録されていません</p>
              ) : (
                <div className="space-y-8">
                  {classifications.map(({ classification, lineNumbers, lines }) => (
                    <ClassificationGroup
                      key={classification}
                      factoryName={factory.factoryName}
                      classification={classification}
                      lineNumbers={lineNumbers}
                      lines={lines}
                      color={classColor(classification)}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}

          {/* 工場未登録ライン */}
          {orphanLines.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1 bg-gray-200" />
                <h2 className="text-sm font-semibold text-gray-400">工場未登録ライン</h2>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {orphanLines.map((l, i) => (
                  <LineCard
                    key={l.lineNumber}
                    lineNumbers={[l.lineNumber]}
                    title={l.lineName || `ライン${l.lineNumber}`}
                    subtitle={l.factoryName ? `${l.factoryName}（未登録）` : undefined}
                    color={getColor(i)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
