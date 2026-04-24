"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { formatYearMonth, addMonths, getPlanMonths } from "@/lib/data";
import { useMasterStore } from "@/lib/masterStore";
import { useVirtualProducts } from "@/lib/useLeveledPlans";
import { calcSimulation, buildDefaultInputs, MonthInput } from "@/lib/simulation";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, RotateCcw, AlertTriangle, Download } from "lucide-react";

// 在庫月数の色分け
function invColor(v: number) {
  if (v < 1.0) return "text-red-600 font-bold";
  if (v > 2.5) return "text-amber-500 font-semibold";
  return "text-emerald-600 font-semibold";
}

// 数値入力セル（販売計画等）
function NumCell({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      min={0}
      step={10}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      className="w-20 text-right text-xs border border-blue-300 rounded px-1.5 py-0.5 bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
  );
}

// 在庫月数目標入力セル
function StepCell({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState(value.toFixed(2));
  useEffect(() => { setDraft(value.toFixed(2)); }, [value]);
  const commit = (s: string) => {
    const v = parseFloat(s);
    if (!isNaN(v)) {
      const c = parseFloat(Math.min(6, Math.max(0, v)).toFixed(2));
      onChange(c); setDraft(c.toFixed(2));
    } else {
      setDraft(value.toFixed(2));
    }
  };
  return (
    <input
      type="number" value={draft} min={0} max={6} step={0.05}
      onChange={(e) => {
        setDraft(e.target.value);
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && e.target.value !== "" && !e.target.value.endsWith("."))
          onChange(Math.min(6, Math.max(0, parseFloat(v.toFixed(2)))));
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") commit((e.target as HTMLInputElement).value); }}
      className="w-16 text-center text-xs font-semibold text-indigo-700 border border-indigo-200 rounded px-1 py-0.5 bg-indigo-50 focus:outline-none focus:ring-1 focus:ring-indigo-400"
    />
  );
}

type ProductState = { inputs: MonthInput[]; initialInventory: number };

export default function SimulationView() {
  const { planBaseMonth, setPlanBaseMonth, lineMasters, simMonthOverrides, setSimMonthInputs, salesPlanOverrides } = useMasterStore();
  const [search, setSearch] = useState("");
  const [filterFactory, setFilterFactory] = useState("all");
  const [filterLine, setFilterLine] = useState("all");
  const [defaultTargetMonths, setDefaultTargetMonths] = useState(1.5);

  const planMonths = useMemo(() => getPlanMonths(planBaseMonth), [planBaseMonth]);
  const virtualProducts = useVirtualProducts();

  // 工場一覧（lineMastersから重複除去）
  const factories = useMemo(() => {
    const seen = new Set<string>();
    return lineMasters.filter((l) => { if (seen.has(l.factoryName)) return false; seen.add(l.factoryName); return true; });
  }, [lineMasters]);

  // 工場絞り込み時のライン一覧
  const filteredLineMasters = useMemo(() =>
    filterFactory === "all" ? lineMasters : lineMasters.filter((l) => l.factoryName === filterFactory),
    [lineMasters, filterFactory]
  );

  // ライン→工場名マップ
  const lineToFactory = useMemo(() => {
    const m = new Map<number, string>();
    lineMasters.forEach((l) => m.set(l.lineNumber, l.factoryName));
    return m;
  }, [lineMasters]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return virtualProducts
      .filter((p) => {
        const matchFactory = filterFactory === "all" || lineToFactory.get(p.primaryLine) === filterFactory;
        const matchLine = filterLine === "all" || String(p.primaryLine) === filterLine;
        const matchSearch = !q || p.manufacturingItemCode.toLowerCase().includes(q) || p.inventoryItemCode.toLowerCase().includes(q);
        // 販売計画がゼロの製品は非表示
        const totalSales = salesPlanOverrides
          .filter((o) => o.productId === p.id && planMonths.includes(o.yearMonth))
          .reduce((s, o) => s + o.salesPlan, 0);
        return matchFactory && matchLine && matchSearch && totalSales > 0;
      })
      .sort((a, b) => {
        // 計画開始月の販売計画の多い順
        const firstMonth = planMonths[0];
        const planA = salesPlanOverrides.find((o) => o.productId === a.id && o.yearMonth === firstMonth)?.salesPlan ?? 0;
        const planB = salesPlanOverrides.find((o) => o.productId === b.id && o.yearMonth === firstMonth)?.salesPlan ?? 0;
        return planB - planA;
      });
  }, [search, filterFactory, filterLine, virtualProducts, salesPlanOverrides, planMonths, lineToFactory]);

  // 品目ごとの編集状態
  const [states, setStates] = useState<Map<string, ProductState>>(() => new Map());

  // 品目が変わったり planBaseMonth が変わったら状態を初期化
  // planBaseMonth 変更時は initialInventory を前月スナップショット値に連動させる
  useEffect(() => {
    setStates((prev) => {
      const next = new Map<string, ProductState>();
      filtered.forEach((p) => {
        if (prev.has(p.id)) {
          // 既存 state の inputs は維持しつつ、前月末在庫は常に最新スナップショットに連動
          next.set(p.id, { ...prev.get(p.id)!, initialInventory: p.lastMonthInventory });
          return;
        }
        // simMonthOverrides から復元
        const stored = simMonthOverrides
          .filter((o) => o.productId === p.id)
          .sort((a, b) => a.yearMonth - b.yearMonth);
        const inputs = stored.length === 6
          ? stored.map(({ yearMonth, salesPlan, targetInventoryMonths }) => ({ yearMonth, salesPlan, targetInventoryMonths }))
          : buildDefaultInputs(planBaseMonth, planMonths.map((ym) => {
              const ov = salesPlanOverrides.find((o) => o.productId === p.id && o.yearMonth === ym);
              return ov?.salesPlan ?? 0;
            }), defaultTargetMonths);
        next.set(p.id, { inputs, initialInventory: p.lastMonthInventory });
      });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, planBaseMonth]);

  const getState = useCallback((id: string): ProductState => {
    return states.get(id) ?? {
      inputs: buildDefaultInputs(planBaseMonth, planMonths.map(() => 0), defaultTargetMonths),
      initialInventory: 0,
    };
  }, [states, planBaseMonth, planMonths, defaultTargetMonths]);

  const updateInput = useCallback((id: string, monthIdx: number, field: keyof MonthInput, value: number) => {
    setStates((prev) => {
      const cur = prev.get(id);
      if (!cur) return prev;
      // 在庫月数目標の計画開始月(0)変更時は翌月以降も連動
      const inputs = cur.inputs.map((inp, i) => {
        if (i === monthIdx) return { ...inp, [field]: value };
        if (field === "targetInventoryMonths" && monthIdx === 0 && i > 0) return { ...inp, targetInventoryMonths: value };
        return inp;
      });
      const next = new Map(prev);
      next.set(id, { ...cur, inputs });
      setSimMonthInputs(id, inputs);
      return next;
    });
  }, [setSimMonthInputs]);

  const updateInventory = useCallback((id: string, value: number) => {
    setStates((prev) => {
      const cur = prev.get(id);
      if (!cur) return prev;
      const next = new Map(prev);
      next.set(id, { ...cur, initialInventory: value });
      return next;
    });
  }, []);

  const resetProduct = useCallback((id: string, product: typeof filtered[number]) => {
    const inputs = buildDefaultInputs(planBaseMonth, planMonths.map((ym) => {
      const ov = salesPlanOverrides.find((o) => o.productId === id && o.yearMonth === ym);
      return ov?.salesPlan ?? 0;
    }), defaultTargetMonths);
    setStates((prev) => {
      const next = new Map(prev);
      next.set(id, { inputs, initialInventory: product.lastMonthInventory });
      setSimMonthInputs(id, inputs);
      return next;
    });
  }, [planBaseMonth, planMonths, defaultTargetMonths, salesPlanOverrides, setSimMonthInputs]);

  // CSV出力
  function handleCsvExport() {
    const header = ["品目コード", "製造器種名", "ライン", "項目", ...planMonths.map((m) => formatYearMonth(m))];
    const rows: string[][] = [header];
    filtered.forEach((p) => {
      const { inputs, initialInventory } = getState(p.id);
      const results = calcSimulation({ productId: p.id, initialInventory, inputs, nextSalesPlan: 0 });
      const labels = ["販売計画", "在庫月数目標", "生産必要数", "月末在庫数", "月末在庫月数"];
      const dataRows = [
        inputs.map((inp) => String(inp.salesPlan)),
        inputs.map((inp) => inp.targetInventoryMonths.toFixed(2)),
        results.map((r) => String(r.requiredProduction)),
        results.map((r) => String(r.monthEndInventory)),
        results.map((r) => r.monthEndInventoryMonths.toFixed(1)),
      ];
      labels.forEach((label, li) => {
        rows.push([p.inventoryItemCode, p.manufacturingItemCode, String(p.primaryLine), label, ...dataRows[li]]);
      });
    });
    const csv = "\uFEFF" + rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `生産計画シミュレーション_${planBaseMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const METRIC_ROWS = [
    { key: "salesPlan",             label: "販売計画",    type: "edit-sales",  bg: "bg-blue-50/40" },
    { key: "targetInventoryMonths", label: "在庫月数目標", type: "edit-inv",    bg: "bg-indigo-50/40" },
    { key: "requiredProduction",    label: "生産必要数",   type: "result",      bg: "bg-orange-50/50" },
    { key: "monthEndInventory",     label: "月末在庫数",   type: "result",      bg: "" },
    { key: "monthEndInventoryMonths", label: "月末在庫月数", type: "result-months", bg: "bg-gray-50" },
  ] as const;

  return (
    <div className="space-y-4">
      {/* コントロールバー */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap gap-3 items-center">
        {/* 計画開始月 */}
        <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded px-2 py-1">
          <span className="text-xs text-blue-600 font-medium whitespace-nowrap">計画開始月:</span>
          <button onClick={() => setPlanBaseMonth(addMonths(planBaseMonth, -1))} className="p-0.5 rounded hover:bg-blue-200 text-blue-500">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm font-bold text-blue-700 min-w-20 text-center">{formatYearMonth(planBaseMonth)}</span>
          <button onClick={() => setPlanBaseMonth(addMonths(planBaseMonth, 1))} className="p-0.5 rounded hover:bg-blue-200 text-blue-500">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-40 bg-white border border-gray-200 rounded px-2 py-1">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input type="text" placeholder="品目コード・製造器種名で絞り込み..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs border-none outline-none bg-transparent" />
        </div>

        <select value={filterFactory} onChange={(e) => { setFilterFactory(e.target.value); setFilterLine("all"); }}
          className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white">
          <option value="all">全工場</option>
          {factories.map((f) => (
            <option key={f.factoryName} value={f.factoryName}>{f.factoryName}</option>
          ))}
        </select>

        <select value={filterLine} onChange={(e) => setFilterLine(e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white">
          <option value="all">全ライン</option>
          {filteredLineMasters.map((l) => (
            <option key={l.lineNumber} value={String(l.lineNumber)}>{l.lineName}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500 whitespace-nowrap">初期在庫月数目標:</span>
          <input type="range" min={0.5} max={4} step={0.5} value={defaultTargetMonths}
            onChange={(e) => setDefaultTargetMonths(Number(e.target.value))} className="w-20" />
          <span className="text-xs font-semibold text-indigo-700 w-8">{defaultTargetMonths.toFixed(1)}</span>
        </div>

        <button onClick={handleCsvExport}
          className="flex items-center gap-1.5 text-xs bg-gray-700 text-white rounded px-3 py-1.5 hover:bg-gray-800">
          <Download className="w-3.5 h-3.5" />CSV出力
        </button>

        <span className="text-xs text-gray-400">{filtered.length} 品目</span>
      </div>

      {/* 一覧テーブル */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
          該当する品目が見つかりません
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-300">
                  <th className="sticky left-0 z-20 bg-gray-50 px-3 py-2.5 text-left text-gray-600 font-semibold whitespace-nowrap border-r border-gray-200 min-w-44">
                    製造器種名
                  </th>
                  <th className="sticky left-44 z-20 bg-gray-50 px-3 py-2.5 text-left text-gray-500 font-medium whitespace-nowrap border-r border-gray-200 min-w-28">
                    項目
                  </th>
                  {planMonths.map((ym) => (
                    <th key={ym} className="px-3 py-2.5 text-right text-blue-600 font-semibold whitespace-nowrap min-w-24">
                      {formatYearMonth(ym)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const st = getState(p.id);
                  const results = calcSimulation({
                    productId: p.id,
                    initialInventory: st.initialInventory,
                    inputs: st.inputs,
                    nextSalesPlan: 0,
                  });
                  const hasShortage = results.some((r) => r.isShortage);

                  return (
                    <>
                      {/* 品目ヘッダー行 */}
                      <tr key={`${p.id}-header`} className={`border-t-2 ${hasShortage ? "border-red-300 bg-red-50/30" : "border-gray-200 bg-gray-50/60"}`}>
                        <td colSpan={2} className="sticky left-0 z-10 px-3 py-2 border-r border-gray-200">
                          <div className="flex items-center gap-3 flex-wrap">
                            {hasShortage && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            <span className={`font-semibold font-mono ${hasShortage ? "text-red-700" : "text-gray-800"}`}>
                              {p.manufacturingItemCode}
                            </span>
                            {p.inventoryItemCode && p.inventoryItemCode !== p.manufacturingItemCode && (
                              <span className="text-gray-400 text-[10px]">{p.inventoryItemCode}</span>
                            )}
                            <span className="text-gray-400 text-[10px]">ライン{p.primaryLine}</span>
                            {/* 初期在庫 */}
                            <div className="flex items-center gap-1 ml-auto">
                              <span className="text-gray-400 whitespace-nowrap">前月末在庫:</span>
                              <input type="number" value={st.initialInventory} min={0} step={10}
                                onChange={(e) => updateInventory(p.id, Math.max(0, Number(e.target.value)))}
                                className="w-20 text-right text-xs border border-gray-300 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                              <span className="text-gray-400">台</span>
                              <button onClick={() => resetProduct(p.id, p)}
                                className="ml-1 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded"
                                title="リセット">
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                        {planMonths.map((ym) => <td key={ym} className="px-3 py-2" />)}
                      </tr>

                      {/* 販売計画（編集） */}
                      <tr key={`${p.id}-sales`} className="bg-blue-50/40 hover:bg-blue-50/70">
                        <td className="sticky left-0 z-10 bg-blue-50/40 px-3 py-1.5 border-r border-gray-200" />
                        <td className="sticky left-44 z-10 bg-blue-50/40 px-3 py-1.5 text-blue-700 font-medium whitespace-nowrap border-r border-gray-200">
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1.5" />販売計画
                        </td>
                        {st.inputs.map((inp, i) => (
                          <td key={inp.yearMonth} className="px-2 py-1">
                            <NumCell value={inp.salesPlan} onChange={(v) => updateInput(p.id, i, "salesPlan", v)} />
                          </td>
                        ))}
                      </tr>

                      {/* 在庫月数目標（編集） */}
                      <tr key={`${p.id}-invmonths`} className="bg-indigo-50/40 hover:bg-indigo-50/70">
                        <td className="sticky left-0 z-10 bg-indigo-50/40 px-3 py-1.5 border-r border-gray-200" />
                        <td className="sticky left-44 z-10 bg-indigo-50/40 px-3 py-1.5 text-indigo-700 font-medium whitespace-nowrap border-r border-gray-200">
                          <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 mr-1.5" />在庫月数目標
                        </td>
                        {st.inputs.map((inp, i) => (
                          <td key={inp.yearMonth} className="px-2 py-1 text-center">
                            <StepCell value={inp.targetInventoryMonths} onChange={(v) => updateInput(p.id, i, "targetInventoryMonths", v)} />
                          </td>
                        ))}
                      </tr>

                      {/* 生産必要数（算出） */}
                      <tr key={`${p.id}-req`} className="bg-orange-50/50 hover:bg-orange-50/80">
                        <td className="sticky left-0 z-10 bg-orange-50/50 px-3 py-1.5 border-r border-gray-200" />
                        <td className="sticky left-44 z-10 bg-orange-50/50 px-3 py-1.5 text-orange-700 font-semibold whitespace-nowrap border-r border-gray-200">
                          <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1.5" />生産必要数
                        </td>
                        {results.map((r) => (
                          <td key={r.yearMonth} className="px-3 py-1.5 text-right font-bold text-orange-700">
                            {r.requiredProduction > 0 ? r.requiredProduction.toLocaleString() : <span className="text-gray-300 font-normal">0</span>}
                          </td>
                        ))}
                      </tr>

                      {/* 月末在庫数（算出） */}
                      <tr key={`${p.id}-endinv`} className="hover:bg-gray-50">
                        <td className="sticky left-0 z-10 bg-white px-3 py-1.5 border-r border-gray-200" />
                        <td className="sticky left-44 z-10 bg-white px-3 py-1.5 text-gray-500 whitespace-nowrap border-r border-gray-200">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />月末在庫数
                        </td>
                        {results.map((r) => (
                          <td key={r.yearMonth} className={`px-3 py-1.5 text-right font-medium ${r.isShortage ? "text-red-600" : "text-emerald-700"}`}>
                            {r.isShortage && <AlertTriangle className="w-3 h-3 inline mr-0.5 text-red-500" />}
                            {r.monthEndInventory.toLocaleString()}
                          </td>
                        ))}
                      </tr>

                      {/* 月末在庫月数（算出） */}
                      <tr key={`${p.id}-months`} className="bg-gray-50/80 hover:bg-gray-100/60">
                        <td className="sticky left-0 z-10 bg-gray-50 px-3 py-1.5 border-r border-gray-200" />
                        <td className="sticky left-44 z-10 bg-gray-50 px-3 py-1.5 text-gray-600 font-medium whitespace-nowrap border-r border-gray-200">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 mr-1.5" />月末在庫月数
                        </td>
                        {results.map((r) => (
                          <td key={r.yearMonth} className={`px-3 py-1.5 text-right ${invColor(r.monthEndInventoryMonths)}`}>
                            {r.monthEndInventoryMonths.toFixed(1)}ヶ月
                          </td>
                        ))}
                      </tr>
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
