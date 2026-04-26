"use client";

import { useState, useMemo } from "react";
import { Package, Calendar, Upload, Layers, TrendingUp, Building2, Trash2 } from "lucide-react";
import ProductMasterTab from "@/components/masters/ProductMasterTab";
import OperatingDaysTab from "@/components/masters/OperatingDaysTab";
import InventoryImportTab from "@/components/masters/InventoryImportTab";
import LineSettingsTab from "@/components/masters/LineSettingsTab";
import SalesPlanTab from "@/components/masters/SalesPlanTab";
import FactoryMasterTab from "@/components/masters/FactoryMasterTab";
import { useMasterStore } from "@/lib/masterStore";

const TABS = [
  { id: "products",       label: "製品マスター",      icon: Package,    desc: "製品コード・パレット設定・ライン設定" },
  { id: "factories",      label: "工場マスター",       icon: Building2,  desc: "工場名・分類の管理" },
  { id: "lines",          label: "ラインマスター",     icon: Layers,     desc: "ライン番号・工場・日量能力の設定" },
  { id: "sales-plan",     label: "販売計画入力",      icon: TrendingUp, desc: "品目ごとに先6ヶ月分の販売計画を入力" },
  { id: "operating-days", label: "稼働日マスター",    icon: Calendar,   desc: "月別稼働日カレンダー設定" },
  { id: "inventory",      label: "在庫CSVインポート", icon: Upload,     desc: "月末在庫数をCSVで一括更新" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function MastersPage() {
  const [activeTab, setActiveTab] = useState<TabId>("products");
  const current = TABS.find((t) => t.id === activeTab)!;
  const { clearYearData, salesPlanOverrides, inventorySnapshots, simMonthOverrides, operatingDays } = useMasterStore();

  // 登録済み年の一覧
  const registeredYears = useMemo(() => {
    const all = [
      ...salesPlanOverrides.map((o) => Math.floor(o.yearMonth / 100)),
      ...inventorySnapshots.map((o) => Math.floor(o.yearMonth / 100)),
      ...simMonthOverrides.map((o) => Math.floor(o.yearMonth / 100)),
      ...operatingDays.map((o) => Math.floor(o.yearMonth / 100)),
    ];
    return Array.from(new Set(all)).sort();
  }, [salesPlanOverrides, inventorySnapshots, simMonthOverrides, operatingDays]);

  function handleClearYear(year: number) {
    if (!confirm(`${year}年のデータ（販売計画・在庫・シミュレーション・稼働日）を全て削除します。よろしいですか？`)) return;
    clearYearData(year);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">マスター設定</h1>
          <p className="text-sm text-gray-500 mt-1">{current.desc}</p>
        </div>
        {registeredYears.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="text-xs text-gray-400">年別データ削除：</span>
            {registeredYears.map((year) => (
              <button
                key={year}
                onClick={() => handleClearYear(year)}
                className="flex items-center gap-1 text-xs border border-red-200 text-red-500 hover:bg-red-50 rounded px-2 py-1"
              >
                <Trash2 className="w-3 h-3" />{year}年
              </button>
            ))}
          </div>
        )}
      </div>

      {/* タブナビ */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px
              ${activeTab === id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      {activeTab === "products"       && <ProductMasterTab />}
      {activeTab === "factories"      && <FactoryMasterTab />}
      {activeTab === "lines"          && <LineSettingsTab />}
      {activeTab === "sales-plan"     && <SalesPlanTab />}
      {activeTab === "operating-days" && <OperatingDaysTab />}
      {activeTab === "inventory"      && <InventoryImportTab />}
    </div>
  );
}
