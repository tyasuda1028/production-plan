"use client";

import { useState } from "react";
import { useMasterStore } from "@/lib/masterStore";
import { products, planMonths, formatYearMonth } from "@/lib/data";
import { TruckLoaderExportData } from "@/lib/masterTypes";
import { ExternalLink, Download, Copy, Check, RefreshCw } from "lucide-react";

const TRUCK_LOADER_URL = "https://tyasuda1028-truck-loader.vercel.app";
const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

export default function TruckLoaderTab() {
  const { productMasters, getInventory } = useMasterStore();
  const [selectedYM, setSelectedYM] = useState(planMonths[0]);
  const [copied, setCopied] = useState(false);

  // truck-loaderへ渡すデータを組み立て
  function buildExportData(): TruckLoaderExportData {
    const inventory = getInventory(selectedYM);

    const exportProducts = productMasters
      .filter((pm) => pm.active)
      .map((pm) => ({
        code: pm.code,
        name: pm.name,
        capacityPerPallet: pm.capacityPerPallet,
        palletType: pm.palletType,
        factoryCode: "F001",
      }));

    // 生産計画：製品コードをキーにした月次計画数
    const productionPlan: Record<string, number> = {};
    productMasters.filter((pm) => pm.active).forEach((pm) => {
      const p = products.find((x) => x.manufacturingItemCode === pm.code);
      const mp = p?.monthlyPlans.find((m) => m.yearMonth === selectedYM);
      if (mp) productionPlan[pm.code] = mp.productionSchedule;
    });

    // 在庫：インポートされたデータ優先、なければdata.tsの値
    const inventoryStock: Record<string, number> = {};
    productMasters.filter((pm) => pm.active).forEach((pm) => {
      if (inventory[pm.code] !== undefined) {
        inventoryStock[pm.code] = inventory[pm.code];
      } else {
        const p = products.find((x) => x.manufacturingItemCode === pm.code);
        if (p) inventoryStock[pm.code] = p.totalInventory;
      }
    });

    return {
      exportedAt: new Date().toISOString(),
      sourceApp: "production-plan",
      products: exportProducts,
      productionPlan,
      inventoryStock,
    };
  }

  // JSON コピー
  async function copyJSON() {
    const data = buildExportData();
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // 製品マスターCSV（truck-loader形式）ダウンロード
  function downloadProductCSV() {
    const data = buildExportData();
    const header = "製品コード,製品名,個/枚,パレット型,カラー(hex)";
    const rows = data.products.map((p) =>
      [p.code, p.name, p.capacityPerPallet, p.palletType, "#3b82f6"].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `truck_loader_products_${selectedYM}.csv`;
    a.click();
  }

  // 生産計画CSV（truck-loader形式）ダウンロード
  function downloadProductionCSV() {
    const data = buildExportData();
    // truck-loaderの生産計画CSV形式: 製品コード, YYYY-MM-DD 列
    const year = Math.floor(selectedYM / 100);
    const month = selectedYM % 100;
    const daysInMonth = new Date(year, month, 0).getDate();
    const dates = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    });
    const header = ["製品コード", ...dates].join(",");
    const rows = Object.entries(data.productionPlan).map(([code, total]) => {
      const perDay = Math.floor(total / 20); // 稼働日20日で均等割
      const vals = dates.map(() => perDay);
      return [code, ...vals].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `truck_loader_production_${selectedYM}.csv`;
    a.click();
  }

  // 在庫CSVダウンロード（truck-loader形式）
  function downloadInventoryCSV() {
    const data = buildExportData();
    const header = "製品コード,在庫数";
    const rows = Object.entries(data.inventoryStock).map(([code, qty]) => `${code},${qty}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `truck_loader_inventory_${selectedYM}.csv`;
    a.click();
  }

  const previewData = buildExportData();

  return (
    <div className="space-y-5">
      {/* 連携先情報 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-4">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
          <RefreshCw className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800 text-sm">Truck Loader 連携</h3>
            <a href={TRUCK_LOADER_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <ExternalLink className="w-3 h-3" />アプリを開く
            </a>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            生産計画・在庫データをCSVでエクスポートし、Truck Loaderにインポートすることで
            トラック積載計画へ反映できます。製品コードが共通キーです。
          </p>
        </div>
      </div>

      {/* 対象月選択 */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">対象月：</label>
        <select value={selectedYM} onChange={(e) => setSelectedYM(+e.target.value)}
          className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white font-medium">
          {planMonths.map((m) => <option key={m} value={m}>{formatYearMonth(m)}</option>)}
        </select>
      </div>

      {/* APIエンドポイント */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">REST API（CORS対応）</h3>
        <p className="text-xs text-gray-500">Truck Loaderから以下のエンドポイントを直接呼び出せます：</p>
        <div className="space-y-2">
          {[
            { label: "製品マスター + 生産計画 + 在庫", path: `/api/truck-loader?ym=${selectedYM}` },
            { label: "製品マスターのみ", path: `/api/truck-loader/products` },
          ].map(({ label, path }) => (
            <div key={path} className="flex items-center gap-2">
              <span className="text-[10px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded">GET</span>
              <code className="text-xs bg-white border border-gray-200 px-2 py-1 rounded flex-1 font-mono text-gray-700">
                {API_BASE}{path}
              </code>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded p-2">
          ⚠️ このアプリのデータはlocalStorageに保存されています。APIはビルド時のデフォルトデータを返します。
          CSVエクスポートを使用することを推奨します。
        </div>
      </div>

      {/* エクスポートボタン群 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">CSVエクスポート（推奨）</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="text-xs font-medium text-gray-700">① 製品マスター</div>
            <div className="text-xs text-gray-500">Truck Loader の設定 → 製品マスターにインポート</div>
            <button onClick={downloadProductCSV}
              className="w-full flex items-center justify-center gap-1.5 text-xs bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700">
              <Download className="w-3.5 h-3.5" />products.csv
            </button>
          </div>
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="text-xs font-medium text-gray-700">② 生産計画</div>
            <div className="text-xs text-gray-500">Truck Loader の生産 → CSVインポートにインポート</div>
            <button onClick={downloadProductionCSV}
              className="w-full flex items-center justify-center gap-1.5 text-xs bg-green-600 text-white rounded px-3 py-2 hover:bg-green-700">
              <Download className="w-3.5 h-3.5" />production.csv
            </button>
          </div>
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="text-xs font-medium text-gray-700">③ 在庫データ</div>
            <div className="text-xs text-gray-500">Truck Loader の生産 → 在庫入力にインポート</div>
            <button onClick={downloadInventoryCSV}
              className="w-full flex items-center justify-center gap-1.5 text-xs bg-amber-600 text-white rounded px-3 py-2 hover:bg-amber-700">
              <Download className="w-3.5 h-3.5" />inventory.csv
            </button>
          </div>
        </div>
      </div>

      {/* データプレビュー */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">エクスポートデータプレビュー</h3>
          <button onClick={copyJSON}
            className="flex items-center gap-1.5 text-xs border border-gray-200 rounded px-2.5 py-1.5 hover:bg-gray-50">
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "コピー済み" : "JSONコピー"}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="bg-blue-50 rounded p-2 text-center">
            <div className="text-xl font-bold text-blue-700">{previewData.products.length}</div>
            <div className="text-xs text-gray-500">製品</div>
          </div>
          <div className="bg-green-50 rounded p-2 text-center">
            <div className="text-xl font-bold text-green-700">{Object.keys(previewData.productionPlan).length}</div>
            <div className="text-xs text-gray-500">生産計画</div>
          </div>
          <div className="bg-amber-50 rounded p-2 text-center">
            <div className="text-xl font-bold text-amber-700">{Object.keys(previewData.inventoryStock).length}</div>
            <div className="text-xs text-gray-500">在庫データ</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left font-medium text-gray-500">製品コード</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">製品名</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">個/パレット</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500">パレット型</th>
                <th className="px-3 py-2 text-right font-medium text-blue-600">生産計画数</th>
                <th className="px-3 py-2 text-right font-medium text-green-600">在庫数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {previewData.products.map((p) => (
                <tr key={p.code} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-gray-600">{p.code}</td>
                  <td className="px-3 py-2 text-gray-800">{p.name}</td>
                  <td className="px-3 py-2 text-right">{p.capacityPerPallet}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded">{p.palletType}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-blue-700">
                    {(previewData.productionPlan[p.code] ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-green-700">
                    {(previewData.inventoryStock[p.code] ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
