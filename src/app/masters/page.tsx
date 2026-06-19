"use client";

import { useState, useMemo } from "react";
import { Package, Calendar, Layers, Building2, Trash2, Puzzle, ListTree } from "lucide-react";
import ProductMasterTab from "@/components/masters/ProductMasterTab";
import OperatingDaysTab from "@/components/masters/OperatingDaysTab";
import LineSettingsTab from "@/components/masters/LineSettingsTab";
import FactoryMasterTab from "@/components/masters/FactoryMasterTab";
import MaterialMasterTab from "@/components/masters/MaterialMasterTab";
import BomTab from "@/components/masters/BomTab";
import { useMasterStore } from "@/lib/masterStore";
import { useUiStore } from "@/lib/uiStore";

// 設定の推奨順（番号付き）。販売計画・在庫は「月次入力」ページへ分離（⑦⑧）。
const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];
const TABS = [
  { id: "factories",      label: "工場マスター",       icon: Building2,  desc: "工場名・分類の管理" },
  { id: "lines",          label: "ラインマスター",     icon: Layers,     desc: "ライン番号・工場・日量能力の設定" },
  { id: "products",       label: "製品マスター",      icon: Package,    desc: "製品コード・パレット設定・ライン設定" },
  { id: "materials",      label: "部材マスター",      icon: Puzzle,     desc: "部材（購入部品・原材料）と現在庫の管理" },
  { id: "bom",            label: "BOM（部品構成）",   icon: ListTree,   desc: "製品1台あたりの部材使用量（員数）を登録" },
  { id: "operating-days", label: "稼働日マスター",    icon: Calendar,   desc: "月別稼働日カレンダー設定" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function MastersPage() {
  const [activeTab, setActiveTab] = useState<TabId>("factories");
  const current = TABS.find((t) => t.id === activeTab)!;
  const { clearYearData, resetAll, salesPlanOverrides, inventorySnapshots, simMonthOverrides, operatingDays, productMasters, factoryMasters, lineMasters } = useMasterStore();

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

  const requestConfirm = useUiStore((s) => s.requestConfirm);
  const addToast = useUiStore((s) => s.addToast);

  async function handleClearYear(year: number) {
    const ok = await requestConfirm(
      `${year}年のデータ（販売計画・在庫・シミュレーション・稼働日）を全て削除します。よろしいですか？`,
      { danger: true, okLabel: "削除する" }
    );
    if (!ok) return;
    clearYearData(year);
    addToast("success", `${year}年のデータを削除しました`);
  }

  // 全データ削除（このユーザーの保存データを初期状態に戻す）
  const hasAnyData =
    productMasters.length > 0 ||
    factoryMasters.length > 0 ||
    lineMasters.length > 0 ||
    salesPlanOverrides.length > 0 ||
    inventorySnapshots.length > 0 ||
    simMonthOverrides.length > 0;

  async function handleResetAll() {
    const ok = await requestConfirm(
      "全てのデータ（製品・工場・ライン・販売計画・在庫・シミュレーション・稼働日）を削除し、初期状態に戻します。\nこの操作は取り消せません。本当に削除しますか？",
      { danger: true, okLabel: "全データを削除する" }
    );
    if (!ok) return;
    resetAll();
    addToast("success", "全データを削除しました");
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">マスター設定</h1>
          <p className="text-sm text-gray-500 mt-1">{current.desc}</p>
        </div>
        {(registeredYears.length > 0 || hasAnyData) && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {registeredYears.length > 0 && (
              <>
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
              </>
            )}
            {hasAnyData && (
              <button
                onClick={handleResetAll}
                className="flex items-center gap-1 text-xs border border-red-300 bg-red-500 text-white hover:bg-red-600 rounded px-2.5 py-1 font-medium"
              >
                <Trash2 className="w-3 h-3" />全データ削除
              </button>
            )}
          </div>
        )}
      </div>

      {/* 設定の流れ */}
      <p className="text-xs text-gray-400 mb-2">①〜⑥の順に設定してください。毎月変動する販売計画・在庫数は「月次入力」ページ（⑦⑧）で入力します。</p>

      {/* タブナビ */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }, i) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px
              ${activeTab === id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            <span className="text-gray-400">{CIRCLED[i]}</span>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      {activeTab === "products"       && <ProductMasterTab />}
      {activeTab === "factories"      && <FactoryMasterTab />}
      {activeTab === "lines"          && <LineSettingsTab />}
      {activeTab === "materials"      && <MaterialMasterTab />}
      {activeTab === "bom"            && <BomTab />}
      {activeTab === "operating-days" && <OperatingDaysTab />}
    </div>
  );
}
