"use client";

import { useState } from "react";
import { useMasterStore } from "@/lib/masterStore";
import { ProductMaster, LineMaster, PALLET_TYPES, CustomFieldDef } from "@/lib/masterTypes";
import { METHOD_LABELS, normalizeMethod, methodDef } from "@/lib/productionMethods";
import { Plus, Pencil, Trash2, Upload, Download, Check, X } from "lucide-react";
import CustomFieldsManager from "./CustomFieldsManager";

const PALLET_OPTIONS = ["P01", "P02", "P03"] as const;
const METHOD_OPTIONS = METHOD_LABELS;

const emptyProduct = (): ProductMaster => ({
  code: "",
  modelCode: "",
  primaryLine: 2,
  capacityPerPallet: 20,
  palletType: "P01",
  productionMethod: normalizeMethod("B"),
  active: true,
});

function CsvExportButton({ products, fields }: { products: ProductMaster[]; fields: CustomFieldDef[] }) {
  const handle = () => {
    const header = ["品目コード", "品名", "個/枚", "パレット型", "ライン", "生産方式", ...fields.map((f) => f.label)].join(",");
    const rows = products.map((p) =>
      [
        p.code,
        p.modelCode,
        p.capacityPerPallet,
        p.palletType,
        p.primaryLine,
        p.productionMethod,
        ...fields.map((f) => p.custom?.[f.id] ?? ""),
      ].join(",")
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

// 製品の追加／編集行（モジュールスコープに置き、再描画で再生成されないようにする）
function ProductEditRow({
  buf, setBuf, lineMasters, fields, factoryNameForLine, onSave, onCancel,
}: {
  buf: ProductMaster;
  setBuf: (p: ProductMaster) => void;
  lineMasters: LineMaster[];
  fields: CustomFieldDef[];
  factoryNameForLine: (n: number) => string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const setCustom = (fid: string, v: string) => setBuf({ ...buf, custom: { ...(buf.custom ?? {}), [fid]: v } });

  return (
    <tr className="bg-blue-50/60 border-b border-blue-200">
      <td className="px-3 py-2">
        <EditableCell value={buf.code} onChange={(v) => setBuf({ ...buf, code: v })} placeholder="品目コード（任意）" />
      </td>
      <td className="px-3 py-2">
        <EditableCell value={buf.modelCode} onChange={(v) => setBuf({ ...buf, modelCode: v })} placeholder="品名を入力" />
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
          title={methodDef(buf.productionMethod).desc}
          className="text-xs border border-blue-300 rounded px-1.5 py-1 bg-white w-full">
          {METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </td>
      {fields.map((f) => (
        <td key={f.id} className="px-3 py-2">
          <EditableCell value={buf.custom?.[f.id] ?? ""} onChange={(v) => setCustom(f.id, v)} placeholder={f.label} />
        </td>
      ))}
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button onClick={onSave} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={onCancel} className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"><X className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}

export default function ProductMasterTab() {
  const { productMasters, addProduct, deleteProduct, importProducts, lineMasters, productFields } = useMasterStore();
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

  const rowKey = (p: ProductMaster) => p.modelCode || p.code || "";

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

        // ヘッダー: 品目コード, 品名, 個/枚, パレット型, ライン, 生産方式, [カスタム項目...]
        const headers = lines[0].split(",").map((s) => s.trim());
        // 7列目以降のうち、既存カスタム項目ラベルに一致する列を取り込む
        const labelToId = new Map(productFields.map((f) => [f.label.trim().toLowerCase(), f.id]));
        const customCols: { idx: number; id: string }[] = [];
        for (let i = 6; i < headers.length; i++) {
          const id = labelToId.get(headers[i].trim().toLowerCase());
          if (id) customCols.push({ idx: i, id });
        }

        const rows: ProductMaster[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((s) => s.trim());
          const code      = cols[0] ?? "";
          const modelCode = cols[1] ?? "";
          if (!modelCode) continue;

          const custom: Record<string, string> = {};
          customCols.forEach(({ idx, id }) => {
            const v = cols[idx] ?? "";
            if (v) custom[id] = v;
          });

          rows.push({
            code,
            modelCode,
            capacityPerPallet: parseInt(cols[2]) || 20,
            palletType: (["P01","P02","P03"].includes(cols[3] ?? "") ? cols[3] : "P01") as ProductMaster["palletType"],
            primaryLine: parseInt(cols[4]) || 2,
            productionMethod: normalizeMethod(cols[5] || "B"),
            active: true,
            ...(Object.keys(custom).length ? { custom } : {}),
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

  return (
    <div className="space-y-4">
      {/* カスタム項目管理 */}
      <CustomFieldsManager target="product" />

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
        <CsvExportButton products={productMasters} fields={productFields} />
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
        <strong>CSV形式：</strong> 品目コード, 品名, 個/枚, パレット型(P01/P02/P03), ライン, 生産方式
        {productFields.length > 0 && <>, {productFields.map((f) => f.label).join(", ")}</>}
      </div>

      {/* テーブル */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-max">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-700 whitespace-nowrap">品目コード</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-700 whitespace-nowrap">品名</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">工場名</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">ライン</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 whitespace-nowrap">個/パレット</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">パレット型</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">生産方式</th>
                {productFields.map((f) => (
                  <th key={f.id} className="px-3 py-2.5 text-left text-xs font-medium text-gray-700 whitespace-nowrap">{f.label}</th>
                ))}
                <th className="px-3 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {adding && (
                <ProductEditRow
                  buf={newBuf}
                  setBuf={setNewBuf}
                  lineMasters={lineMasters}
                  fields={productFields}
                  factoryNameForLine={factoryNameForLine}
                  onSave={saveNew}
                  onCancel={() => setAdding(false)}
                />
              )}
              {productMasters.map((p) => {
                const key = rowKey(p);
                const factoryName = factoryNameForLine(p.primaryLine);
                const lineMaster = lineMasters.find((l) => l.lineNumber === p.primaryLine);
                return editing === key ? (
                  <ProductEditRow
                    key={key}
                    buf={editBuf}
                    setBuf={setEditBuf}
                    lineMasters={lineMasters}
                    fields={productFields}
                    factoryNameForLine={factoryNameForLine}
                    onSave={saveEdit}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <tr key={key} className={`hover:bg-gray-50 ${!p.active ? "opacity-40" : ""}`}>
                    <td className="px-3 py-2.5 text-xs font-mono font-semibold text-gray-800">{p.code || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-800">{p.modelCode}</div>
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
                    {productFields.map((f) => (
                      <td key={f.id} className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                        {p.custom?.[f.id] || <span className="text-gray-300">—</span>}
                      </td>
                    ))}
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
