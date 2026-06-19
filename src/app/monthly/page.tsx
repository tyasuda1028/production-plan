"use client";

import { useState } from "react";
import { TrendingUp, Boxes } from "lucide-react";
import SalesPlanTab from "@/components/masters/SalesPlanTab";
import InventoryImportTab from "@/components/masters/InventoryImportTab";

// 月次入力（毎月変動する入力）。番号はマスター設定①〜⑥の続き。
const TABS = [
  { id: "sales-plan", num: "⑦", label: "販売計画", icon: TrendingUp, desc: "品目ごとに先6ヶ月分の販売計画を入力" },
  { id: "inventory",  num: "⑧", label: "在庫数",   icon: Boxes,      desc: "品目ごとの在庫数を入力（手入力・CSV両対応）" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function MonthlyPage() {
  const [activeTab, setActiveTab] = useState<TabId>("sales-plan");
  const current = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">月次入力</h1>
        <p className="text-sm text-gray-500 mt-1">{current.desc}</p>
        <p className="text-xs text-gray-400 mt-1">毎月変動する入力です（マスター設定①〜⑥の後、⑦⑧の順に入力）。</p>
      </div>

      {/* タブナビ */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 flex-wrap">
        {TABS.map(({ id, num, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px
              ${activeTab === id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            <span className="text-gray-400">{num}</span>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      {activeTab === "sales-plan" && <SalesPlanTab />}
      {activeTab === "inventory"  && <InventoryImportTab />}
    </div>
  );
}
