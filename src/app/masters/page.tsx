"use client";

import { useState } from "react";
import { Package, Calendar, Upload, Truck, Layers } from "lucide-react";
import ProductMasterTab from "@/components/masters/ProductMasterTab";
import OperatingDaysTab from "@/components/masters/OperatingDaysTab";
import InventoryImportTab from "@/components/masters/InventoryImportTab";
import TruckLoaderTab from "@/components/masters/TruckLoaderTab";
import LineSettingsTab from "@/components/masters/LineSettingsTab";

const TABS = [
  { id: "products",       label: "製品マスター",         icon: Package,  desc: "製品コード・パレット設定・ライン設定" },
  { id: "lines",          label: "ラインマスター",        icon: Layers,   desc: "分類・工場名・ライン名の設定" },
  { id: "operating-days", label: "稼働日マスター",       icon: Calendar, desc: "月別稼働日カレンダー設定" },
  { id: "inventory",      label: "在庫CSVインポート",    icon: Upload,   desc: "月末在庫数をCSVで一括更新" },
  { id: "truck-loader",   label: "Truck Loader 連携",   icon: Truck,    desc: "積載計画アプリへデータ連携" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function MastersPage() {
  const [activeTab, setActiveTab] = useState<TabId>("products");
  const current = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">マスター設定</h1>
        <p className="text-sm text-gray-500 mt-1">{current.desc}</p>
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
      {activeTab === "lines"          && <LineSettingsTab />}
      {activeTab === "operating-days" && <OperatingDaysTab />}
      {activeTab === "inventory"      && <InventoryImportTab />}
      {activeTab === "truck-loader"   && <TruckLoaderTab />}
    </div>
  );
}
