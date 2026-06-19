"use client";

import { useState, useMemo } from "react";
import { useMasterStore } from "@/lib/masterStore";
import { useUiStore } from "@/lib/uiStore";
import { pmKey, BomLine } from "@/lib/masterTypes";
import { wouldCreateBomCycle } from "@/lib/useMrp";
import { Plus, Trash2, Upload, Download, Search, ListTree, Package, Puzzle, ChevronRight, ChevronDown } from "lucide-react";
import { MaterialMaster } from "@/lib/masterTypes";

type ParentItem = { id: string; kind: "product" | "material"; code: string; label: string };

/**
 * 多階層BOMの展開ツリー（読み取り専用）。
 * rootId を起点に bomLines を辿り、半製品の子はインデントして再帰展開する。
 */
function BomTree({
  rootId, bomLines, materialMasters,
}: {
  rootId: string;
  bomLines: BomLine[];
  materialMasters: MaterialMaster[];
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const childrenOf = useMemo(() => {
    const m = new Map<string, BomLine[]>();
    bomLines.forEach((b) => {
      if (!m.has(b.productId)) m.set(b.productId, []);
      m.get(b.productId)!.push(b);
    });
    m.forEach((arr) => arr.sort((a, b) => a.materialCode.localeCompare(b.materialCode)));
    return m;
  }, [bomLines]);

  const parentSet = useMemo(() => new Set(bomLines.map((b) => b.productId)), [bomLines]);
  const matOf = (code: string) => materialMasters.find((m) => m.code === code);

  function toggle(path: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }

  function rows(parentId: string, depth: number, pathPrefix: string, cumInput: number, visited: Set<string>): React.ReactNode[] {
    const lines = childrenOf.get(parentId) ?? [];
    return lines.flatMap((line) => {
      const m = matOf(line.materialCode);
      const input = line.qtyPer;
      const good = line.qtyGood ?? line.qtyPer;
      const scrap = Math.max(0, input - good);
      const yld = input > 0 ? (good / input) * 100 : 0;
      const cum = cumInput * input;
      const isSub = parentSet.has(line.materialCode);
      const cycle = visited.has(line.materialCode);
      const path = `${pathPrefix}>${line.materialCode}`;
      const expandable = isSub && !cycle && depth < 10;
      const open = expandable && !collapsed.has(path);

      const row = (
        <tr key={path} className="hover:bg-gray-50">
          <td className="px-3 py-1.5">
            <div className="flex items-center" style={{ paddingLeft: depth * 18 }}>
              {expandable ? (
                <button onClick={() => toggle(path)} className="p-0.5 text-gray-400 hover:text-gray-700">
                  {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              ) : (
                <span className="inline-block w-4" />
              )}
              <span className="font-mono text-xs font-semibold text-gray-800 ml-1">{line.materialCode}</span>
              {isSub && <span className="ml-1.5 text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded">半製品</span>}
              {cycle && <span className="ml-1.5 text-[9px] bg-red-100 text-red-600 px-1 py-0.5 rounded">循環</span>}
            </div>
          </td>
          <td className="px-3 py-1.5 text-xs text-gray-700">{m?.name ?? <span className="text-amber-600">未登録部材</span>}</td>
          <td className="px-3 py-1.5 text-right text-xs text-gray-700">{input}</td>
          <td className="px-3 py-1.5 text-right text-xs text-gray-700">{good}</td>
          <td className={`px-3 py-1.5 text-right text-xs ${scrap > 0 ? "text-red-500" : "text-gray-300"}`}>{scrap > 0 ? scrap : "—"}</td>
          <td className={`px-3 py-1.5 text-right text-xs ${yld < 100 ? "text-amber-600" : "text-gray-400"}`}>{yld.toFixed(0)}%</td>
          <td className="px-3 py-1.5 text-xs text-gray-400">{m?.unit ?? "—"}</td>
          <td className="px-3 py-1.5 text-right text-xs font-medium text-blue-700">{Number(cum.toFixed(4)).toLocaleString()}</td>
        </tr>
      );

      const children = open
        ? rows(line.materialCode, depth + 1, path, cum, new Set([...visited, line.materialCode]))
        : [];
      return [row, ...children];
    });
  }

  const tree = rows(rootId, 0, rootId, 1, new Set([rootId]));

  if (tree.length === 0) {
    return <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded p-4 text-center">構成部材がありません</p>;
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      <table className="w-full text-sm border-collapse min-w-max">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">構成（部材コード）</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">部材名</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">投入量</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">完成品</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">スクラップ</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">歩留</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">単位</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 whitespace-nowrap" title="親（製品/半製品）1単位あたりの総投入量＝経路の投入量の積">累積投入/1単位</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{tree}</tbody>
      </table>
    </div>
  );
}

/**
 * BOM（部品構成）タブ — 多階層対応。
 * 親＝製品（Lv0）または 部材（半製品）。子＝部材。
 * 各行に投入量・完成品を設定（スクラップ＝投入−完成、歩留まり自動）。
 */
export default function BomTab() {
  const productMasters  = useMasterStore((s) => s.productMasters);
  const materialMasters = useMasterStore((s) => s.materialMasters);
  const bomLines        = useMasterStore((s) => s.bomLines);
  const upsertBomLine   = useMasterStore((s) => s.upsertBomLine);
  const deleteBomLine   = useMasterStore((s) => s.deleteBomLine);
  const importBom       = useMasterStore((s) => s.importBom);

  const requestConfirm = useUiStore((s) => s.requestConfirm);
  const addToast = useUiStore((s) => s.addToast);

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [newMaterial, setNewMaterial] = useState("");
  const [newInput, setNewInput] = useState("1");
  const [newGood, setNewGood] = useState("");

  // 親候補（製品＋部材）
  const parents: ParentItem[] = useMemo(() => {
    const prods: ParentItem[] = productMasters
      .filter((p) => p.active !== false)
      .map((p) => ({ id: pmKey(p), kind: "product", code: p.code, label: p.modelCode }));
    const mats: ParentItem[] = materialMasters.map((m) => ({ id: m.code, kind: "material", code: m.code, label: m.name }));
    return [...prods, ...mats];
  }, [productMasters, materialMasters]);

  const filteredParents = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return parents;
    return parents.filter((p) => p.code.toLowerCase().includes(q) || p.label.toLowerCase().includes(q));
  }, [search, parents]);

  const selected = parents.find((p) => p.id === selectedId) ?? null;

  // 親IDごとの構成行数
  const childCountByParent = useMemo(() => {
    const m = new Map<string, number>();
    bomLines.forEach((b) => m.set(b.productId, (m.get(b.productId) ?? 0) + 1));
    return m;
  }, [bomLines]);

  // 半製品（親に登場する部材コード）
  const subAssemblyCodes = useMemo(() => {
    const set = new Set<string>();
    bomLines.forEach((b) => { if (materialMasters.some((m) => m.code === b.productId)) set.add(b.productId); });
    return set;
  }, [bomLines, materialMasters]);

  const linesForSelected = useMemo(
    () => bomLines.filter((b) => b.productId === selectedId)
      .sort((a, b) => a.materialCode.localeCompare(b.materialCode)),
    [bomLines, selectedId]
  );

  const materialOf = (code: string) => materialMasters.find((m) => m.code === code);

  // 追加できる子部材（自身・既存子・循環になるものを除外）
  const childOptions = useMemo(() => {
    if (!selectedId) return [];
    const existing = new Set(linesForSelected.map((l) => l.materialCode));
    return materialMasters.filter(
      (m) => !existing.has(m.code) && !wouldCreateBomCycle(selectedId, m.code, bomLines)
    );
  }, [selectedId, linesForSelected, materialMasters, bomLines]);

  function addLine() {
    if (!selectedId || !newMaterial) return;
    const input = parseFloat(newInput);
    if (isNaN(input) || input <= 0) { addToast("error", "投入量は正の数で入力してください"); return; }
    const good = newGood.trim() === "" ? input : parseFloat(newGood);
    if (isNaN(good) || good < 0 || good > input) { addToast("error", "完成品は0〜投入量の範囲で入力してください"); return; }
    upsertBomLine(selectedId, newMaterial, input, good);
    setNewInput("1"); setNewGood(""); setNewMaterial("");
  }

  function handleInputBlur(line: BomLine, raw: string) {
    const input = parseFloat(raw.replace(/,/g, ""));
    if (isNaN(input) || input <= 0) return;
    const good = Math.min(line.qtyGood ?? line.qtyPer, input);
    upsertBomLine(selectedId, line.materialCode, input, good);
  }
  function handleGoodBlur(line: BomLine, raw: string) {
    const good = parseFloat(raw.replace(/,/g, ""));
    if (isNaN(good) || good < 0) return;
    const input = line.qtyPer;
    upsertBomLine(selectedId, line.materialCode, input, Math.min(good, input));
  }

  async function handleDeleteLine(materialCode: string) {
    const m = materialOf(materialCode);
    const ok = await requestConfirm(`構成から「${m?.name ?? materialCode}」を外しますか？`, { danger: true, okLabel: "外す" });
    if (!ok) return;
    deleteBomLine(selectedId, materialCode);
  }

  // ── CSV（全BOM一括）──
  function exportCsv() {
    const header = "親コード,子部材コード,投入量,完成品";
    const rows = bomLines.map((b) => [b.productId, b.materialCode, b.qtyPer, b.qtyGood ?? b.qtyPer].join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "BOM部品構成.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = (ev.target?.result as string).replace(/^\uFEFF/, "");
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        const start = lines[0]?.includes("コード") ? 1 : 0;
        const parentIds = new Set(parents.map((p) => p.id));
        const materialCodes = new Set(materialMasters.map((m) => m.code));
        const rows: BomLine[] = [];
        let skipped = 0;
        for (let i = start; i < lines.length; i++) {
          const cols = lines[i].split(",").map((s) => s.trim());
          const parentId = cols[0] ?? "";
          const materialCode = cols[1] ?? "";
          const input = parseFloat(cols[2] ?? "");
          // 4列目があれば完成品、なければ投入量＝完成品（旧「員数」形式互換）
          const good = cols[3] !== undefined && cols[3] !== "" ? parseFloat(cols[3]) : input;
          if (!parentId || !materialCode || isNaN(input) || input <= 0) continue;
          if (!parentIds.has(parentId) || !materialCodes.has(materialCode)) { skipped++; continue; }
          if (wouldCreateBomCycle(parentId, materialCode, bomLines)) { skipped++; continue; }
          rows.push({ productId: parentId, materialCode, qtyPer: input, qtyGood: isNaN(good) ? input : Math.min(good, input) });
        }
        if (rows.length === 0) { addToast("error", "有効なBOM行が見つかりません（親・子の登録を確認してください）"); return; }
        importBom(rows);
        addToast("success", `BOM ${rows.length}行をインポートしました${skipped > 0 ? `（未登録/循環の ${skipped}行はスキップ）` : ""}`);
      } catch {
        addToast("error", "CSVの形式が正しくありません");
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  function renderParentGroup(title: string, items: ParentItem[]) {
    if (items.length === 0) return null;
    return (
      <div>
        <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 bg-gray-50 sticky top-0">{title}</div>
        {items.map((p) => {
          const count = childCountByParent.get(p.id) ?? 0;
          const isSub = p.kind === "material" && subAssemblyCodes.has(p.id);
          return (
            <button
              key={`${p.kind}-${p.id}`}
              onClick={() => setSelectedId(p.id)}
              className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                selectedId === p.id ? "bg-blue-50 text-blue-800" : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <span className="font-mono text-gray-400 shrink-0">{p.code || "—"}</span>
              <span className="flex-1 truncate">{p.label}</span>
              {isSub && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded shrink-0">半製品</span>}
              {count > 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded shrink-0">{count}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-700">
        親（製品・半製品）1単位あたりに使う<strong>部材と投入量・完成品</strong>を登録します（スクラップ＝投入−完成）。
        部材を親に選べば<strong>半製品（多階層）</strong>になります。「所要量計算（MRP）」が各階層を展開して必要量を算出します。
      </div>

      {/* ツールバー */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-1.5 text-xs border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
          <Upload className="w-3.5 h-3.5" />CSVインポート（全BOM）
          <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
        </label>
        <button onClick={exportCsv}
          className="flex items-center gap-1.5 text-xs border border-gray-200 rounded px-3 py-1.5 hover:bg-gray-50">
          <Download className="w-3.5 h-3.5" />CSVエクスポート
        </button>
        <span className="text-xs text-gray-400">形式：親コード, 子部材コード, 投入量, 完成品</span>
        <span className="ml-auto text-xs text-gray-400">{bomLines.length} 行 / {childCountByParent.size} 親</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        {/* 親リスト */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="コード・名称で検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs border-none outline-none bg-transparent"
            />
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            {renderParentGroup("製品", filteredParents.filter((p) => p.kind === "product"))}
            {renderParentGroup("部材・半製品", filteredParents.filter((p) => p.kind === "material"))}
            {filteredParents.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-gray-400">該当なし</p>
            )}
          </div>
        </div>

        {/* 構成編集 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          {!selected ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              <ListTree className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              左のリストから親（製品・部材）を選択してください
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {selected.kind === "product"
                  ? <Package className="w-4 h-4 text-blue-500" />
                  : <Puzzle className="w-4 h-4 text-amber-500" />}
                <h3 className="text-sm font-semibold text-gray-800">{selected.label}</h3>
                <span className="text-xs text-gray-400 font-mono">{selected.code}</span>
                <span className="text-xs text-gray-400 ml-auto">1単位あたりの構成</span>
              </div>

              {/* 追加フォーム */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded p-2 flex-wrap">
                <select value={newMaterial} onChange={(e) => setNewMaterial(e.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white flex-1 min-w-40">
                  <option value="">部材を選択...</option>
                  {childOptions.map((m) => <option key={m.code} value={m.code}>{m.code}：{m.name}</option>)}
                </select>
                <input type="text" inputMode="decimal" value={newInput} onChange={(e) => setNewInput(e.target.value)}
                  className="w-20 text-right text-xs border border-gray-200 rounded px-2 py-1.5" placeholder="投入量" title="投入量" />
                <input type="text" inputMode="decimal" value={newGood} onChange={(e) => setNewGood(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addLine(); }}
                  className="w-20 text-right text-xs border border-gray-200 rounded px-2 py-1.5" placeholder="完成品(任意)" title="完成品（省略時=投入量）" />
                <button onClick={addLine} disabled={!newMaterial}
                  className="flex items-center gap-1 text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700 disabled:opacity-40">
                  <Plus className="w-3.5 h-3.5" />追加
                </button>
              </div>
              {materialMasters.length === 0 && (
                <p className="text-xs text-amber-600">部材マスターが空です。先に「部材マスター」で部材を登録してください。</p>
              )}

              {/* 構成一覧 */}
              {linesForSelected.length === 0 ? (
                <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded p-4 text-center">まだ構成部材がありません</p>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">部材コード</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">部材名</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">投入量</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">完成品</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">スクラップ</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">歩留</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">単位</th>
                      <th className="px-3 py-2 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {linesForSelected.map((line) => {
                      const m = materialOf(line.materialCode);
                      const input = line.qtyPer;
                      const good = line.qtyGood ?? line.qtyPer;
                      const scrap = Math.max(0, input - good);
                      const yld = input > 0 ? (good / input) * 100 : 0;
                      const childIsSub = subAssemblyCodes.has(line.materialCode);
                      return (
                        <tr key={line.materialCode} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs font-mono font-semibold text-gray-800">
                            {line.materialCode}
                            {childIsSub && <span className="ml-1 text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded">半製品</span>}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-700">{m?.name ?? <span className="text-amber-600">未登録部材</span>}</td>
                          <td className="px-3 py-2 text-right">
                            <input type="text" inputMode="decimal" key={`in-${line.materialCode}-${input}`} defaultValue={String(input)}
                              onFocus={(e) => e.target.select()} onBlur={(e) => handleInputBlur(line, e.target.value)}
                              className="w-16 text-right text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input type="text" inputMode="decimal" key={`gd-${line.materialCode}-${good}`} defaultValue={String(good)}
                              onFocus={(e) => e.target.select()} onBlur={(e) => handleGoodBlur(line, e.target.value)}
                              className="w-16 text-right text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          </td>
                          <td className={`px-3 py-2 text-right text-xs ${scrap > 0 ? "text-red-500" : "text-gray-300"}`}>{scrap > 0 ? scrap : "—"}</td>
                          <td className={`px-3 py-2 text-right text-xs ${yld < 100 ? "text-amber-600" : "text-gray-400"}`}>{yld.toFixed(0)}%</td>
                          <td className="px-3 py-2 text-xs text-gray-500">{m?.unit ?? "—"}</td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => handleDeleteLine(line.materialCode)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* 構成ツリー（多階層展開） */}
              <div className="pt-2">
                <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-gray-600">
                  <ListTree className="w-3.5 h-3.5 text-gray-400" />
                  構成ツリー（{selected.label} を起点に下位部材まで展開）
                </div>
                <BomTree rootId={selectedId} bomLines={bomLines} materialMasters={materialMasters} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
