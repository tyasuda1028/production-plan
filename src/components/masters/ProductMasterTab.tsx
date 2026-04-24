"use client";

import { useState } from "react";
import { useMasterStore } from "@/lib/masterStore";
import { ProductMaster, PALLET_TYPES } from "@/lib/masterTypes";
import { Plus, Pencil, Trash2, Upload, Download, Check, X } from "lucide-react";

const PALLET_OPTIONS = ["P01", "P02", "P03"] as const;
const METHOD_OPTIONS = ["A:主力製品", "B:在庫製品", "C:計画生産", "D:受注生産"];

// 生産方式の正規化（"B" や文字化け → "B:在庫製品" など）
const METHOD_PREFIX_MAP: Record<string, string> = {
  A: "A:主力製品",
  B: "B:在庫製品",
  C: "C:計画生産",
  D: "D:受注生産",
};
function normalizeMethod(m: string): string {
  if (METHOD_OPTIONS.includes(m)) return m;           // 既に正しい形式
  const key = (m ?? "").charAt(0).toUpperCase();
  return METHOD_PREFIX_MAP[key] ?? "B:在庫製品";       // 先頭文字で判定、不明は B
}

const emptyProduct = (): ProductMaster => ({
  code: "",
  modelCode: "",
  gasType: "",
  primaryLine: 2,
  capacityPerPallet: 20,
  palletType: "P01",
  productionMethod: "B:在庫製品",
  active: true,
});

function CsvExportButton({ products }: { products: ProductMaster[] }) {
  const handle = () => {
    const header = "品目コード,製造器種名,ガス種,個/枚,パレット型,ライン,生産方式";
    const rows = products.map((p) =>
      [p.code, p.modelCode, p.gasType ?? "", p.capacityPerPallet, p.palletType, p.primaryLine, p.productionMethod].join(",")
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

function EditableCell({ value, onChange, placeholder, className }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white ${className ?? ""}`}
    />
  );
}

export default function ProductMasterTab() {
  const { productMasters, addProduct, updateProduct, deleteProduct, importProducts, lineMasters, factoryMasters } = useMasterStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState<ProductMaster>(emptyProduct());
  const [adding, setAdding] = useState(false);
  const [newBuf, setNewBuf] = useState<ProductMaster>(emptyProduct());
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  // ライン番号 → 工場名
  function factoryNameForLine(lineNumber: number): string {
    const lm = lineMasters.find((l) => l.lineNumber === lineNumber);
    if (!lm) return "—";
    return lm.factoryName || "—";
  }

  const rowKey = (p: ProductMaster) => p.modelCode || p.code || Math.random().toString();

  function startEdit(p: ProductMaster) {
    setEditing(rowKey(p));
    setEditBuf({ ...p, productionMethod: normalizeMethod(p.productionMethod) });
  }

  // 生産方式を一括正規化
  function fixAllMethods() {
    useMasterStore.setState((s) => ({
      productMasters: s.productMasters.map((p) => ({
        ...p,
        productionMethod: normalizeMethod(p.productionMethod),
      })),
    }));
    setImportSuccess("生産方式を一括修正しました");
    setTimeout(() => setImportSuccess(""), 3000);
  }

  function saveEdit() {
    if (editing) {
      useMasterStore.setState((s) => ({
        productMasters: s.productMasters.map((p) =>
          rowKey(p) === editing ? { ...editBuf } : p
        ),
      }));
      setEditing(null);
    }
  }

  function saveNew() {
    if (!newBuf.modelCode.trim()) return;
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
        if (lines.length < 2) { setImportError("データが不足しています"); return; }

        // ヘッダー行で列位置を動的に判定
        const headers = lines[0].split(",").map((s) => s.trim().toLowerCase());
        const hasGasType = headers.some((h) => h.includes("ガス") || h === "gas");

        const rows: ProductMaster[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((s) => s.trim());
          // ガス種列あり: [code, modelCode, gasType, cap, pallet, line, method]
          // ガス種列なし: [code, modelCode, cap, pallet, line, method]
          const code      = cols[0] ?? "";
          const modelCode = cols[1] ?? "";
          if (!modelCode) continue;

          let gasType = "", cap: string, pallet: string, line: string, method: string;
          if (hasGasType) {
            [, , gasType, cap, pallet, line, method] = cols;
          } else {
            [, , cap, pallet, line, method] = cols;
          }

          rows.push({
            code,
            modelCode,
            gasType: gasType ?? "",
            capacityPerPallet: parseInt(cap) || 20,
            palletType: (["P01","P02","P03"].includes(pallet ?? "") ? pallet : "P01") as ProductMaster["palletType"],
            primaryLine: parseInt(line) || 2,
            productionMethod: normalizeMethod(method || "B"),
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

  function EditRow({ isNew }: { isNew?: boolean }) {
    const buf = isNew ? newBuf : editBuf;
    const setBuf = isNew ? (v: ProductMaster) => setNewBuf(v) : (v: ProductMaster) => setEditBuf(v);
    const onSave = isNew ? saveNew : saveEdit;
    const onCancel = isNew ? () => setAdding(false) : () => setEditing(null);

    return (
      <tr className="bg-blue-50/60 border-b border-blue-200">
        <td className="px-3 py-2">
          <EditableCell value={buf.code} onChange={(v) => setBuf({ ...buf, code: v })} placeholder="品目コード（任意）" />
        </td>
        <td className="px-3 py-2">
          <EditableCell value={buf.modelCode} onChange={(v) => setBuf({ ...buf, modelCode: v })} placeholder="FHE-16AW1-G" />
        </td>
        <td className="px-3 py-2">
          <EditableCell value={buf.gasType ?? ""} onChange={(v) => setBuf({ ...buf, gasType: v })} placeholder="P / 12A" className="w-20" />
        </td>
        {/* 工場（ライン選択から自動導出・読み取り専用） */}
        <td className="px-3 py-2 text-center text-xs text-gray-400">
          {factoryNameForLine(buf.primaryLine)}
        </td>
        <td className="px-3 py-2">
          <select value={buf.primaryLine} onChange={(e) => setBuf({ ...buf, primaryLine: +e.target.value })}
            className="text-xs border border-blue-300 rounded px-1.5 py-1 bg-white w-full">
            {lineMasters.map((l) => (
              <option key={l.lineNumber} value={l.lineNumber}>
                {l.lineName}（{l.lineNumber}）
              </option>
            ))}
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
          <select value={buf.productionMethod} onChange={(e) => setBuf({ ...buf, productionMethod: e.target.value })}
            className="text-xs border border-blue-300 rounded px-1.5 py-1 bg-white w-full">
            {METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <button onClick={onSave} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={onCancel} className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"><X className="w-3.5 h-3.5" /></button>
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
        <button onClick={fixAllMethods}
          className="flex items-center gap-1.5 text-xs border border-orange-300 text-orange-700 rounded px-3 py-1.5 hover:bg-orange-50">
          生産方式を一括修正
        </button>
        {importSuccess && <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">{importSuccess}</span>}
        {importError && <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{importError}</span>}
        <span className="ml-auto text-xs text-gray-400">{productMasters.length} 品目</span>
      </div>

      {/* CSV仕様 */}
      <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-700">
        <strong>CSV形式：</strong> 品目コード, 製造器種名, ガス種(P/12A/空欄), 個/枚, パレット型(P01/P02/P03), ライン, 生産方式
      </div>

      {/* テーブル */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-max">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-700 whitespace-nowrap">品目コード</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-700 whitespace-nowrap">製造器種名</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-700 whitespace-nowrap">ガス種</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">工場名</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">ライン</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 whitespace-nowrap">個/パレット</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">パレット型</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">生産方式</th>
                <th className="px-3 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {adding && <EditRow isNew />}
              {productMasters.map((p) => {
                const key = rowKey(p);
                const factoryName = factoryNameForLine(p.primaryLine);
                const lineMaster = lineMasters.find((l) => l.lineNumber === p.primaryLine);
                return editing === key ? (
                  <EditRow key={key} />
                ) : (
                  <tr key={key} className={`hover:bg-gray-50 ${!p.active ? "opacity-40" : ""}`}>
                    <td className="px-3 py-2.5 text-xs font-mono font-semibold text-gray-800">{p.code || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="text-xs font-mono font-medium text-gray-800">{p.modelCode}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-center">
                      {p.gasType
                        ? <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">{p.gasType}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{factoryName}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                      {lineMaster ? lineMaster.lineName : <span className="text-gray-400">ライン{p.primaryLine}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-right text-gray-600">{p.capacityPerPallet}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{p.palletType}</span>
                      <span className="ml-1 text-gray-400 text-[10px]">{PALLET_TYPES[p.palletType]?.size}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{normalizeMethod(p.productionMethod)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteProduct(p.code || p.modelCode)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
