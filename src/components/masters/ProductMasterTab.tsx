"use client";

import { useState } from "react";
import { useMasterStore } from "@/lib/masterStore";
import { ProductMaster, PALLET_TYPES } from "@/lib/masterTypes";
import { Plus, Pencil, Trash2, Upload, Download, Check, X } from "lucide-react";

const PALLET_OPTIONS = ["P01", "P02", "P03"] as const;
const METHOD_OPTIONS = ["B:在庫製品", "D:受注生産", "C:計画生産"];
const LINE_OPTIONS = [2, 3, 4, 7];

const emptyProduct = (): ProductMaster => ({
  code: "",
  name: "",
  primaryLine: 2,
  planLot: 10,
  reorderPoint: 50,
  capacityPerPallet: 20,
  palletType: "P01",
  productionMethod: "B:在庫製品",
  active: true,
});

function CsvExportButton({ products }: { products: ProductMaster[] }) {
  const handle = () => {
    const header = "製品コード,製品名,個/枚,パレット型,ライン,ロット,発注点,生産方式";
    const rows = products.map((p) =>
      [p.code, p.name, p.capacityPerPallet, p.palletType, p.primaryLine, p.planLot, p.reorderPoint, p.productionMethod].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "製品マスター.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button onClick={handle} className="flex items-center gap-1.5 text-xs border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50">
      <Download className="w-3.5 h-3.5" />CSVエクスポート
    </button>
  );
}

export default function ProductMasterTab() {
  const { productMasters, addProduct, updateProduct, deleteProduct, importProducts } = useMasterStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState<ProductMaster>(emptyProduct());
  const [adding, setAdding] = useState(false);
  const [newBuf, setNewBuf] = useState<ProductMaster>(emptyProduct());
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  function startEdit(p: ProductMaster) {
    setEditing(p.code);
    setEditBuf({ ...p });
  }

  function saveEdit() {
    if (editing) {
      updateProduct(editing, editBuf);
      setEditing(null);
    }
  }

  function saveNew() {
    if (!newBuf.code.trim() || !newBuf.name.trim()) return;
    addProduct(newBuf);
    setAdding(false);
    setNewBuf(emptyProduct());
  }

  function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = (ev.target?.result as string).replace(/^\uFEFF/, "");
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        const rows: ProductMaster[] = [];
        for (let i = 1; i < lines.length; i++) {
          const [code, name, cap, pallet, line, lot, reorder, method] = lines[i].split(",").map((s) => s.trim());
          if (!code || !name) continue;
          rows.push({
            code,
            name,
            capacityPerPallet: parseInt(cap) || 20,
            palletType: (["P01","P02","P03"].includes(pallet) ? pallet : "P01") as ProductMaster["palletType"],
            primaryLine: parseInt(line) || 2,
            planLot: parseInt(lot) || 10,
            reorderPoint: parseInt(reorder) || 50,
            productionMethod: method || "B:在庫製品",
            active: true,
          });
        }
        importProducts(rows);
        setImportSuccess(`${rows.length}件をインポートしました`);
        setImportError("");
        setTimeout(() => setImportSuccess(""), 3000);
      } catch {
        setImportError("CSVの形式が正しくありません");
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  function EditRow({ p, buf, setBuf, onSave, onCancel }: {
    p?: ProductMaster; buf: ProductMaster; setBuf: (v: ProductMaster) => void;
    onSave: () => void; onCancel: () => void;
  }) {
    return (
      <tr className="bg-blue-50/60">
        <td className="px-3 py-2">
          <input value={buf.code} onChange={(e) => setBuf({ ...buf, code: e.target.value })}
            className="w-full text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="製品コード" disabled={!!p} />
        </td>
        <td className="px-3 py-2">
          <input value={buf.name} onChange={(e) => setBuf({ ...buf, name: e.target.value })}
            className="w-full text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="製品名" />
        </td>
        <td className="px-3 py-2">
          <select value={buf.primaryLine} onChange={(e) => setBuf({ ...buf, primaryLine: +e.target.value })}
            className="text-xs border border-blue-300 rounded px-1.5 py-1 bg-white w-full">
            {LINE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </td>
        <td className="px-3 py-2">
          <input type="number" value={buf.capacityPerPallet} min={1}
            onChange={(e) => setBuf({ ...buf, capacityPerPallet: +e.target.value })}
            className="w-16 text-xs border border-blue-300 rounded px-2 py-1 text-right" />
        </td>
        <td className="px-3 py-2">
          <select value={buf.palletType} onChange={(e) => setBuf({ ...buf, palletType: e.target.value as ProductMaster["palletType"] })}
            className="text-xs border border-blue-300 rounded px-1.5 py-1 bg-white w-full">
            {PALLET_OPTIONS.map((pt) => (
              <option key={pt} value={pt}>{pt} ({PALLET_TYPES[pt].size})</option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <input type="number" value={buf.planLot} min={1}
            onChange={(e) => setBuf({ ...buf, planLot: +e.target.value })}
            className="w-16 text-xs border border-blue-300 rounded px-2 py-1 text-right" />
        </td>
        <td className="px-3 py-2">
          <input type="number" value={buf.reorderPoint} min={0}
            onChange={(e) => setBuf({ ...buf, reorderPoint: +e.target.value })}
            className="w-16 text-xs border border-blue-300 rounded px-2 py-1 text-right" />
        </td>
        <td className="px-3 py-2">
          <select value={buf.productionMethod} onChange={(e) => setBuf({ ...buf, productionMethod: e.target.value })}
            className="text-xs border border-blue-300 rounded px-1.5 py-1 bg-white w-full">
            {METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <button onClick={onSave} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={onCancel} className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-4">
      {/* ツールバー */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => { setAdding(true); setNewBuf(emptyProduct()); }}
          className="flex items-center gap-1.5 text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700">
          <Plus className="w-3.5 h-3.5" />製品追加
        </button>
        <label className="flex items-center gap-1.5 text-xs border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
          <Upload className="w-3.5 h-3.5" />CSVインポート
          <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
        </label>
        <CsvExportButton products={productMasters} />
        {importSuccess && <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">{importSuccess}</span>}
        {importError && <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{importError}</span>}
        <span className="ml-auto text-xs text-gray-400">{productMasters.length} 品目</span>
      </div>

      {/* CSV仕様メモ */}
      <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-700">
        <strong>CSV形式：</strong> 製品コード, 製品名, 個/枚, パレット型(P01/P02/P03), ライン, ロット, 発注点, 生産方式
      </div>

      {/* テーブル */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-max">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["製品コード","製品名","ライン","個/パレット","パレット型","ロット","発注点","生産方式",""].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {adding && (
                <EditRow buf={newBuf} setBuf={setNewBuf}
                  onSave={saveNew}
                  onCancel={() => setAdding(false)} />
              )}
              {productMasters.map((p) =>
                editing === p.code ? (
                  <EditRow key={p.code} p={p} buf={editBuf} setBuf={setEditBuf}
                    onSave={saveEdit}
                    onCancel={() => setEditing(null)} />
                ) : (
                  <tr key={p.code} className={`hover:bg-gray-50 ${!p.active ? "opacity-40" : ""}`}>
                    <td className="px-3 py-2.5 text-xs font-mono text-gray-600 whitespace-nowrap">{p.code}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-800 whitespace-nowrap">{p.name}</td>
                    <td className="px-3 py-2.5 text-xs text-center">{p.primaryLine}</td>
                    <td className="px-3 py-2.5 text-xs text-right">{p.capacityPerPallet}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">{p.palletType}</span>
                      <span className="ml-1 text-gray-400">{PALLET_TYPES[p.palletType]?.size}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-right">{p.planLot}</td>
                    <td className="px-3 py-2.5 text-xs text-right">{p.reorderPoint}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{p.productionMethod}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteProduct(p.code)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
