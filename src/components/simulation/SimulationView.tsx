"use client";

import { useState, useMemo } from "react";
import { products, planMonths } from "@/lib/data";
import ProductSimCard from "./ProductSimCard";
import { Info, Search, SlidersHorizontal } from "lucide-react";

const START_YEAR_MONTH = planMonths[0]; // 202603

export default function SimulationView() {
  const [search, setSearch] = useState("");
  const [filterLine, setFilterLine] = useState("all");
  const [defaultTargetMonths, setDefaultTargetMonths] = useState(1.5);
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase();
      const matchLine = filterLine === "all" || String(p.primaryLine) === filterLine;
      const matchSearch =
        !q ||
        p.productName.toLowerCase().includes(q) ||
        p.manufacturingItemCode.toLowerCase().includes(q) ||
        p.responsible.toLowerCase().includes(q);
      return matchLine && matchSearch;
    });
  }, [search, filterLine]);

  const displayedProducts = showAll ? filtered : filtered.slice(0, 4);

  return (
    <div className="space-y-5">
      {/* 説明パネル */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-700 space-y-1">
          <p className="font-medium">計算ロジック（月次連鎖）</p>
          <p>
            <strong>月末在庫目標</strong> ＝ 在庫月数目標 × <em>翌月の販売計画</em>
          </p>
          <p>
            <strong>生産必要数</strong> ＝ 月末在庫目標 ＋ 当月販売計画 － 前月末在庫
          </p>
          <p>
            <strong>月末在庫</strong> ＝ 前月末在庫 ＋ 生産必要数 － 当月販売計画
          </p>
          <p className="text-blue-600 mt-1">
            ▶ <strong>在庫月数目標</strong>（▲▼ボタン）を変えると生産必要数が即時連鎖更新されます。
            販売計画も直接編集できます。
          </p>
        </div>
      </div>

      {/* コントロールバー */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="品目名・コード・担当者で絞り込み..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm border-none outline-none bg-transparent"
          />
        </div>

        <select
          value={filterLine}
          onChange={(e) => setFilterLine(e.target.value)}
          className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
        >
          <option value="all">全ライン</option>
          {[2, 3, 4, 7].map((l) => (
            <option key={l} value={String(l)}>ライン {l}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500 whitespace-nowrap">初期在庫月数目標:</span>
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.5}
            value={defaultTargetMonths}
            onChange={(e) => setDefaultTargetMonths(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-xs font-semibold text-indigo-700 w-8">{defaultTargetMonths.toFixed(1)}</span>
        </div>

        <span className="text-xs text-gray-400">{filtered.length} 品目</span>
      </div>

      {/* 品目別シミュレーションカード */}
      <div className="space-y-6">
        {displayedProducts.map((p) => (
          <ProductSimCard
            key={`${p.id}-${defaultTargetMonths}`}
            product={p}
            startYearMonth={START_YEAR_MONTH}
            defaultTargetMonths={defaultTargetMonths}
          />
        ))}
      </div>

      {/* もっと表示 */}
      {filtered.length > 4 && (
        <div className="text-center">
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-sm text-blue-600 hover:text-blue-800 px-4 py-2 border border-blue-200 rounded-lg"
          >
            {showAll
              ? "▲ 折りたたむ"
              : `▼ 残り ${filtered.length - 4} 品目を表示する`}
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="py-16 text-center text-gray-400 text-sm">
          該当する品目が見つかりません
        </div>
      )}
    </div>
  );
}
