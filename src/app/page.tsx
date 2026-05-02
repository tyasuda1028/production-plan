"use client";

import { useMemo, useState } from "react";
import { formatYearMonth, getPlanMonths } from "@/lib/data";
import { useMasterStore } from "@/lib/masterStore";
import { useLeveledPlans } from "@/lib/useLeveledPlans";
import { LineMaster } from "@/lib/masterTypes";
import LineCard from "@/components/dashboard/LineCard";
import { ChevronDown, ChevronRight } from "lucide-react";

const PALETTE = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16",
];
function getColor(index: number) { return PALETTE[index % PALETTE.length]; }

// ── 分類グループ ─────────────────────────────────────────────────
function ClassificationGroup({
  factoryName, classification, lineNumbers, lines, color, filterLine,
}: {
  factoryName: string;
  classification: string;
  lineNumbers: number[];
  lines: LineMaster[];
  color: string;
  filterLine: string;
}) {
  const [open, setOpen] = useState(false);

  const visibleLines = filterLine === "all"
    ? lines
    : lines.filter((l) => String(l.lineNumber) === filterLine);
  const visibleLineNumbers = visibleLines.map((l) => l.lineNumber);

  if (visibleLines.length === 0) return null;

  const isSingleLine = visibleLines.length === 1;
  const isFiltered   = filterLine !== "all";

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
        <h3 className="text-sm font-semibold text-gray-600">{classification}</h3>
        <span className="text-xs text-gray-400">{visibleLines.length} ライン</span>
      </div>

      {isSingleLine || isFiltered ? (
        /* 1ライン or フィルター中 → 各ラインカードを直接表示 */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleLines.map((l) => (
            <LineCard
              key={l.lineNumber}
              lineNumbers={[l.lineNumber]}
              title={l.lineName || `ライン${l.lineNumber}`}
              subtitle={`${factoryName} | ${classification} | 日産 ${(l.dailyCapacity ?? 0).toLocaleString()} 台`}
              color={color}
            />
          ))}
        </div>
      ) : (
        <>
          {/* 分類合計カード */}
          <LineCard
            lineNumbers={visibleLineNumbers}
            title={`${classification} 合計`}
            subtitle={`${factoryName} | ${visibleLines.map((l) => l.lineName || `ライン${l.lineNumber}`).join(" / ")}`}
            color={color}
            isGroupSummary
          />

          {/* ライン別詳細トグル */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium px-1 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            ライン別詳細
            <span className="text-gray-400">（{visibleLines.length} ライン）</span>
          </button>

          {open && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-2 border-l-2 border-gray-100">
              {visibleLines.map((l) => (
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

  const [activeFactory, setActiveFactory] = useState<string>("all");
  const [filterLine,    setFilterLine]    = useState<string>("all");

  // 工場タブ切り替え時にラインフィルターをリセット
  function handleFactoryChange(f: string) {
    setActiveFactory(f);
    setFilterLine("all");
  }

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

  // 色割り当て
  const allClassifications = useMemo(() => {
    const seen = new Set<string>();
    lineMasters.forEach((l) => seen.add(l.classification || "（未分類）"));
    return Array.from(seen);
  }, [lineMasters]);
  const classColor = (cls: string) => getColor(allClassifications.indexOf(cls));

  // アクティブ工場のライン一覧（ラインフィルター用）
  const activeFactoryLines = useMemo(() => {
    if (activeFactory === "all") return [];
    return lineMasters.filter((l) => l.factoryName === activeFactory)
      .sort((a, b) => a.lineNumber - b.lineNumber);
  }, [activeFactory, lineMasters]);

  // 表示する工場グループ
  const visibleGroups = useMemo(() => {
    if (activeFactory === "all") return factoryGroups;
    return factoryGroups.filter((g) => g.factory.factoryName === activeFactory);
  }, [activeFactory, factoryGroups]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ページヘッダー */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-1">
          表示月：{formatYearMonth(planBaseMonth)}（計画期間 {formatYearMonth(planMonths[0])} 〜 {formatYearMonth(planMonths[planMonths.length - 1])}）
        </p>
      </div>

      {/* 全体サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: `販売計画（${formatYearMonth(planBaseMonth)}）`, value: currentKPI.salesPlan },
          { label: `生産計画（${formatYearMonth(planBaseMonth)}）`, value: currentKPI.productionSchedule },
          { label: `月末在庫（${formatYearMonth(planBaseMonth)}）`, value: currentKPI.monthEndInventory },
          { label: `在庫月数（${formatYearMonth(planBaseMonth)}）`, value: `${currentKPI.inventoryMonths.toFixed(1)} ヶ月` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">{kpi.label}</div>
            <div className="text-2xl font-bold text-gray-800">
              {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* 工場タブ + ラインフィルター */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6">
        {/* 工場タブ */}
        <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => handleFactoryChange("all")}
            className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px
              ${activeFactory === "all"
                ? "border-blue-600 text-blue-700 bg-blue-50/50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
          >
            全工場
          </button>
          {factoryGroups.map(({ factory }) => (
            <button
              key={factory.factoryName}
              onClick={() => handleFactoryChange(factory.factoryName)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px
                ${activeFactory === factory.factoryName
                  ? "border-blue-600 text-blue-700 bg-blue-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
            >
              {factory.factoryName}
            </button>
          ))}
          {orphanLines.length > 0 && (
            <button
              onClick={() => handleFactoryChange("__orphan__")}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px
                ${activeFactory === "__orphan__"
                  ? "border-blue-600 text-blue-700 bg-blue-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
            >
              その他
            </button>
          )}
        </div>

        {/* ラインフィルター（工場タブ選択時のみ） */}
        {activeFactory !== "all" && activeFactory !== "__orphan__" && activeFactoryLines.length > 1 && (
          <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap border-b border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-500 font-medium">ライン：</span>
            <button
              onClick={() => setFilterLine("all")}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filterLine === "all"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
              }`}
            >
              全ライン
            </button>
            {activeFactoryLines.map((l) => (
              <button
                key={l.lineNumber}
                onClick={() => setFilterLine(String(l.lineNumber))}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  filterLine === String(l.lineNumber)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                }`}
              >
                {l.lineName || `ライン${l.lineNumber}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* コンテンツ */}
      {factoryGroups.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
          工場マスターにデータがありません。マスター設定 → 工場マスター で登録してください。
        </div>
      ) : (
        <div className="space-y-10">
          {visibleGroups.map(({ factory, classifications }) => (
            <section key={factory.factoryName}>
              {/* 工場ヘッダー（全工場表示時のみ） */}
              {activeFactory === "all" && (
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1 bg-gray-200" />
                  <h2 className="text-base font-bold text-gray-700 px-1">{factory.factoryName}</h2>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
              )}

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
                      filterLine={filterLine}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}

          {/* 工場未登録ライン */}
          {(activeFactory === "all" || activeFactory === "__orphan__") && orphanLines.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1 bg-gray-200" />
                <h2 className="text-sm font-semibold text-gray-400">工場未登録ライン</h2>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
