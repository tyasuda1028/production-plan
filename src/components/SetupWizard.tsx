"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMasterStore } from "@/lib/masterStore";
import { useUiStore } from "@/lib/uiStore";
import { PALLET_TYPES, ProductMaster, FactoryMaster } from "@/lib/masterTypes";
import { METHOD_LABELS } from "@/lib/productionMethods";
import { addMonths, formatYearMonth } from "@/lib/data";
import {
  X, ChevronRight, ChevronLeft, Sparkles, Check, Plus,
  Building2, Layers, Package, CalendarDays, Rocket, Boxes,
} from "lucide-react";

const PALLET_OPTIONS = ["P01", "P02", "P03"] as const;
const METHOD_OPTIONS = METHOD_LABELS;
const MONTH_OPTIONS = Array.from({ length: 24 }, (_, i) => addMonths(202601, i));

// ステップ: 0=開始方法 / 1=計画基準月 / 2=工場 / 3=ライン / 4=製品 / 5=完了
const STEP_LABELS = ["開始", "基準月", "在庫月数", "工場", "ライン", "製品", "完了"];

export default function SetupWizard() {
  const router = useRouter();

  const hasHydrated   = useMasterStore((s) => s._hasHydrated);
  const setupCompleted = useMasterStore((s) => s.setupCompleted);
  const factoryMasters = useMasterStore((s) => s.factoryMasters);
  const lineMasters    = useMasterStore((s) => s.lineMasters);
  const productMasters = useMasterStore((s) => s.productMasters);
  const planBaseMonth  = useMasterStore((s) => s.planBaseMonth);
  const setPlanBaseMonth = useMasterStore((s) => s.setPlanBaseMonth);
  const targetMonths   = useMasterStore((s) => s.defaultTargetInventoryMonths);
  const setTargetMonths = useMasterStore((s) => s.setDefaultTargetInventoryMonths);
  const minMonths      = useMasterStore((s) => s.minTargetInventoryMonths);
  const setMinMonths   = useMasterStore((s) => s.setMinTargetInventoryMonths);
  const cycleMonths    = useMasterStore((s) => s.productionCycleMonths);
  const setCycleMonths = useMasterStore((s) => s.setProductionCycleMonths);
  const addFactory     = useMasterStore((s) => s.addFactory);
  const addLineMaster  = useMasterStore((s) => s.addLineMaster);
  const addProduct     = useMasterStore((s) => s.addProduct);
  const seedSampleData = useMasterStore((s) => s.seedSampleData);
  const setSetupCompleted = useMasterStore((s) => s.setSetupCompleted);

  const setupOpen = useUiStore((s) => s.setupOpen);
  const openSetup = useUiStore((s) => s.openSetup);
  const closeSetup = useUiStore((s) => s.closeSetup);

  const [step, setStep] = useState(0);

  const isEmpty = factoryMasters.length === 0 && lineMasters.length === 0 && productMasters.length === 0;

  // 新規（マスターが空・未完了）→ 自動でウィザードを開く（外部UIストアを更新）
  useEffect(() => {
    if (hasHydrated && !setupCompleted && isEmpty) openSetup();
  }, [hasHydrated, setupCompleted, isEmpty, openSetup]);

  function finishAndClose(markDone: boolean) {
    if (markDone) setSetupCompleted(true);
    setStep(0);
    closeSetup();
  }

  if (!setupOpen) return null;

  const hasAnyData = factoryMasters.length > 0 || lineMasters.length > 0 || productMasters.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-gray-800 text-sm">セットアップ</span>
          </div>
          <button
            onClick={() => finishAndClose(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
            title="閉じる（スキップ）"
          >
            スキップ <X className="w-4 h-4" />
          </button>
        </div>

        {/* ステップインジケーター */}
        <div className="flex items-center gap-1 px-5 py-2.5 border-b border-gray-100 bg-gray-50">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                i === step ? "bg-blue-600 text-white font-medium"
                  : i < step ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-400"
              }`}>{label}</span>
              {i < STEP_LABELS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300" />}
            </div>
          ))}
        </div>

        {/* 本文 */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === 0 && (
            <StepStart
              hasAnyData={hasAnyData}
              onEmpty={() => setStep(1)}
              onSample={() => {
                if (hasAnyData && !confirm("現在のデータをサンプルで置き換えます。よろしいですか？")) return;
                seedSampleData();
                setStep(6);
              }}
            />
          )}
          {step === 1 && (
            <StepBaseMonth planBaseMonth={planBaseMonth} setPlanBaseMonth={setPlanBaseMonth} />
          )}
          {step === 2 && (
            <StepTargetMonths
              value={targetMonths} setValue={setTargetMonths}
              min={minMonths} setMin={setMinMonths}
              cycle={cycleMonths} setCycle={setCycleMonths}
            />
          )}
          {step === 3 && (
            <StepFactory factoryMasters={factoryMasters} addFactory={addFactory} />
          )}
          {step === 4 && (
            <StepLine factoryMasters={factoryMasters} lineMasters={lineMasters} addLineMaster={addLineMaster} onBackToFactory={() => setStep(3)} />
          )}
          {step === 5 && (
            <StepProduct lineMasters={lineMasters} productMasters={productMasters} addProduct={addProduct} onBackToLine={() => setStep(4)} />
          )}
          {step === 6 && (
            <StepDone
              factoryCount={factoryMasters.length}
              lineCount={lineMasters.length}
              productCount={productMasters.length}
              onDashboard={() => { finishAndClose(true); router.push("/"); }}
              onMasters={() => { finishAndClose(true); router.push("/masters"); }}
            />
          )}
        </div>

        {/* フッター（ナビ）— 完了/開始ステップ以外 */}
        {step >= 1 && step <= 5 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded"
            >
              <ChevronLeft className="w-3.5 h-3.5" />戻る
            </button>
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 font-medium"
            >
              次へ <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ステップ0: 開始方法 ──
function StepStart({ hasAnyData, onEmpty, onSample }: {
  hasAnyData: boolean; onEmpty: () => void; onSample: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <Rocket className="w-8 h-8 text-blue-500 mx-auto" />
        <h2 className="text-lg font-bold text-gray-800">ようこそ</h2>
        <p className="text-sm text-gray-500">生産計画を始めるための初期設定をします。方法を選んでください。</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={onEmpty}
          className="text-left border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50/40 transition-colors">
          <div className="font-semibold text-gray-800 text-sm mb-1">空から始める</div>
          <p className="text-xs text-gray-500">工場・ライン・製品を順番に登録します。自社のデータを入力する場合はこちら。</p>
        </button>
        <button onClick={onSample}
          className="text-left border border-blue-300 bg-blue-50/40 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors">
          <div className="font-semibold text-blue-800 text-sm mb-1 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />サンプルで始める</div>
          <p className="text-xs text-blue-700/80">工場・ライン・製品・販売計画・在庫の例を一括投入。すぐに動きを確認できます（あとで差し替え可）。</p>
        </button>
      </div>
      {hasAnyData && (
        <p className="text-[11px] text-amber-600 text-center">※ すでにデータがあります。「サンプルで始める」は既存データを置き換えます。</p>
      )}
    </div>
  );
}

// ── ステップ1: 計画基準月 ──
function StepBaseMonth({ planBaseMonth, setPlanBaseMonth }: {
  planBaseMonth: number; setPlanBaseMonth: (ym: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-blue-500" /><h2 className="font-semibold text-gray-800 text-sm">計画基準月</h2></div>
      <p className="text-xs text-gray-500">計画の起点となる月です。ここから6ヶ月分を計画します（あとで変更できます）。</p>
      <select
        value={planBaseMonth}
        onChange={(e) => setPlanBaseMonth(+e.target.value)}
        className="text-sm border border-gray-300 rounded px-3 py-2 bg-white"
      >
        {MONTH_OPTIONS.map((m) => (
          <option key={m} value={m}>{formatYearMonth(m)}</option>
        ))}
      </select>
      <p className="text-xs text-gray-400">
        計画期間：{formatYearMonth(planBaseMonth)} 〜 {formatYearMonth(addMonths(planBaseMonth, 5))}
        <br />稼働日カレンダー（平日）は自動生成済みです。土日・祝日・会社休日は後で「稼働日マスター」で調整できます。
      </p>
    </div>
  );
}

// ── ステップ: 在庫月数目標・方式別パラメータ ──
function StepTargetMonths({ value, setValue, min, setMin, cycle, setCycle }: {
  value: number; setValue: (v: number) => void;
  min: number; setMin: (v: number) => void;
  cycle: number; setCycle: (v: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Boxes className="w-4 h-4 text-blue-500" /><h2 className="font-semibold text-gray-800 text-sm">在庫の持ち方（生産方式別）</h2></div>
      <p className="text-xs text-gray-500">
        製品ごとに選ぶ<strong>生産方式（A〜D）</strong>で在庫の持ち方が変わります。ここでその基準値を決めます（あとで変更可）。
      </p>

      {/* 標準（B/C） */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-gray-700">標準の在庫月数目標（B:在庫保有 / C:計画生産）</div>
        <div className="flex items-center gap-3">
          <input type="range" min={0.5} max={4} step={0.25} value={value}
            onChange={(e) => setValue(Number(e.target.value))} className="w-48" />
          <span className="text-base font-bold text-indigo-700 w-20">{value.toFixed(2)}<span className="text-xs text-gray-400 ml-1">ヶ月</span></span>
        </div>
        <p className="text-[11px] text-gray-400">翌月販売の何ヶ月分を在庫として持つか（目標在庫＝在庫月数×翌月販売）。</p>
      </div>

      {/* 最小（A） */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-gray-700">最小在庫月数（A:最小在庫・高回転）</div>
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={2} step={0.25} value={min}
            onChange={(e) => setMin(Number(e.target.value))} className="w-48" />
          <span className="text-base font-bold text-green-700 w-20">{min.toFixed(2)}<span className="text-xs text-gray-400 ml-1">ヶ月</span></span>
        </div>
        <p className="text-[11px] text-gray-400">高回転で在庫を薄く持つ製品の在庫水準。</p>
      </div>

      {/* 生産間隔（C） */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-gray-700">生産間隔（C:計画生産・定期まとめ生産）</div>
        <div className="flex items-center gap-3">
          <input type="range" min={1} max={6} step={1} value={cycle}
            onChange={(e) => setCycle(Number(e.target.value))} className="w-48" />
          <span className="text-base font-bold text-amber-700 w-20">{cycle}<span className="text-xs text-gray-400 ml-1">ヶ月ごと</span></span>
        </div>
        <p className="text-[11px] text-gray-400">この間隔でまとめて生産し、間は在庫を取り崩します。</p>
      </div>

      <p className="text-[11px] text-gray-400 border-t border-gray-100 pt-2">D:受注生産 は在庫を持たず「生産＝販売」です（設定不要）。</p>
    </div>
  );
}

// ── ステップ: 工場 ──
function StepFactory({ factoryMasters, addFactory }: {
  factoryMasters: FactoryMaster[]; addFactory: (f: FactoryMaster) => void;
}) {
  const [num, setNum] = useState("");
  const [name, setName] = useState("");
  const [cls, setCls] = useState("");

  function add() {
    if (!name.trim()) return;
    addFactory({ factoryNumber: num.trim(), factoryName: name.trim(), classification: cls.trim() });
    setNum(""); setName(""); setCls("");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-500" /><h2 className="font-semibold text-gray-800 text-sm">工場を登録</h2></div>
      <p className="text-xs text-gray-500">製造拠点を登録します。最低1つあるとラインを設定できます。</p>
      <div className="grid grid-cols-[80px_1fr_1fr_auto] gap-2 items-center">
        <input value={num} onChange={(e) => setNum(e.target.value)} placeholder="番号(任意)" className="text-xs border border-gray-300 rounded px-2 py-1.5" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="工場名 *" className="text-xs border border-gray-300 rounded px-2 py-1.5" />
        <input value={cls} onChange={(e) => setCls(e.target.value)} placeholder="分類(任意)" className="text-xs border border-gray-300 rounded px-2 py-1.5" />
        <button onClick={add} className="flex items-center gap-1 text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700"><Plus className="w-3.5 h-3.5" />追加</button>
      </div>
      <ItemList items={factoryMasters.map((f) => ({ key: f.factoryName, label: f.factoryName, sub: [f.factoryNumber, f.classification].filter(Boolean).join(" / ") }))} empty="まだ工場がありません" />
    </div>
  );
}

// ── ステップ3: ライン ──
function StepLine({ factoryMasters, lineMasters, addLineMaster, onBackToFactory }: {
  factoryMasters: FactoryMaster[];
  lineMasters: ReturnType<typeof useMasterStore.getState>["lineMasters"];
  addLineMaster: ReturnType<typeof useMasterStore.getState>["addLineMaster"];
  onBackToFactory: () => void;
}) {
  const [num, setNum] = useState("");
  const [name, setName] = useState("");
  const [factory, setFactory] = useState("");
  const [cap, setCap] = useState("");

  function add() {
    const n = parseInt(num, 10);
    if (isNaN(n) || n <= 0 || !name.trim()) return;
    if (lineMasters.some((l) => l.lineNumber === n)) { alert(`ライン ${n} は既に存在します`); return; }
    const f = factoryMasters.find((x) => x.factoryName === factory);
    addLineMaster({
      lineNumber: n, lineName: name.trim(), factoryName: factory,
      classification: f?.classification ?? "", dailyCapacity: Number(cap) || 0, remarks: "",
    });
    setNum(""); setName(""); setCap("");
  }

  if (factoryMasters.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-blue-500" /><h2 className="font-semibold text-gray-800 text-sm">ラインを登録</h2></div>
        <p className="text-xs text-amber-600">先に工場を登録してください。</p>
        <button onClick={onBackToFactory} className="text-xs text-blue-600 hover:underline">← 工場の登録へ戻る</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-blue-500" /><h2 className="font-semibold text-gray-800 text-sm">ラインを登録</h2></div>
      <p className="text-xs text-gray-500">各ラインの番号・名称・所属工場・日量能力を登録します。</p>
      <div className="grid grid-cols-[70px_1fr_1fr_90px_auto] gap-2 items-center">
        <input value={num} onChange={(e) => setNum(e.target.value)} placeholder="番号 *" className="text-xs border border-gray-300 rounded px-2 py-1.5" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ライン名 *" className="text-xs border border-gray-300 rounded px-2 py-1.5" />
        <select value={factory} onChange={(e) => setFactory(e.target.value)} className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white">
          <option value="">工場 *</option>
          {factoryMasters.map((f) => <option key={f.factoryName} value={f.factoryName}>{f.factoryName}</option>)}
        </select>
        <input value={cap} onChange={(e) => setCap(e.target.value)} placeholder="日量" className="text-xs border border-gray-300 rounded px-2 py-1.5 text-right" />
        <button onClick={add} className="flex items-center gap-1 text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700"><Plus className="w-3.5 h-3.5" />追加</button>
      </div>
      <ItemList items={lineMasters.map((l) => ({ key: String(l.lineNumber), label: `${l.lineName}（${l.lineNumber}）`, sub: `${l.factoryName || "—"} / 日量${l.dailyCapacity}` }))} empty="まだラインがありません" />
    </div>
  );
}

// ── ステップ4: 製品 ──
function StepProduct({ lineMasters, productMasters, addProduct, onBackToLine }: {
  lineMasters: ReturnType<typeof useMasterStore.getState>["lineMasters"];
  productMasters: ProductMaster[];
  addProduct: (p: ProductMaster) => void;
  onBackToLine: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [line, setLine] = useState<number>(lineMasters[0]?.lineNumber ?? 0);
  const [cap, setCap] = useState("20");
  const [pallet, setPallet] = useState<ProductMaster["palletType"]>("P01");
  const [method, setMethod] = useState(METHOD_OPTIONS[1]);

  function add() {
    if (!name.trim()) return;
    addProduct({
      code: code.trim(), modelCode: name.trim(), primaryLine: line,
      capacityPerPallet: Number(cap) || 20, palletType: pallet, productionMethod: method, active: true,
    });
    setCode(""); setName("");
  }

  if (lineMasters.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2"><Package className="w-4 h-4 text-blue-500" /><h2 className="font-semibold text-gray-800 text-sm">製品を登録</h2></div>
        <p className="text-xs text-amber-600">先にラインを登録してください。</p>
        <button onClick={onBackToLine} className="text-xs text-blue-600 hover:underline">← ラインの登録へ戻る</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><Package className="w-4 h-4 text-blue-500" /><h2 className="font-semibold text-gray-800 text-sm">製品を登録</h2></div>
      <p className="text-xs text-gray-500">品名・主ライン・個/パレット・パレット型・生産方式を登録します。</p>
      <div className="grid grid-cols-2 gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="品目コード(任意)" className="text-xs border border-gray-300 rounded px-2 py-1.5" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="品名 *" className="text-xs border border-gray-300 rounded px-2 py-1.5" />
        <select value={line} onChange={(e) => setLine(+e.target.value)} className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white">
          {lineMasters.map((l) => <option key={l.lineNumber} value={l.lineNumber}>{l.lineName}（{l.lineNumber}）</option>)}
        </select>
        <input value={cap} onChange={(e) => setCap(e.target.value)} placeholder="個/パレット" className="text-xs border border-gray-300 rounded px-2 py-1.5 text-right" />
        <select value={pallet} onChange={(e) => setPallet(e.target.value as ProductMaster["palletType"])} className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white">
          {PALLET_OPTIONS.map((p) => <option key={p} value={p}>{p}（{PALLET_TYPES[p].size}）</option>)}
        </select>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white">
          {METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <button onClick={add} className="flex items-center gap-1 text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700"><Plus className="w-3.5 h-3.5" />製品を追加</button>
      <ItemList items={productMasters.map((p) => ({ key: p.code || p.modelCode, label: p.modelCode, sub: `${p.code || "—"} / ライン${p.primaryLine}` }))} empty="まだ製品がありません" />
    </div>
  );
}

// ── ステップ5: 完了 ──
function StepDone({ factoryCount, lineCount, productCount, onDashboard, onMasters }: {
  factoryCount: number; lineCount: number; productCount: number;
  onDashboard: () => void; onMasters: () => void;
}) {
  return (
    <div className="space-y-4 text-center">
      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <Check className="w-6 h-6 text-green-600" />
      </div>
      <h2 className="text-lg font-bold text-gray-800">セットアップ完了</h2>
      <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
        <span><strong className="text-gray-800">{factoryCount}</strong> 工場</span>
        <span><strong className="text-gray-800">{lineCount}</strong> ライン</span>
        <span><strong className="text-gray-800">{productCount}</strong> 製品</span>
      </div>
      <p className="text-xs text-gray-500">
        販売計画・在庫数は「マスター設定」の各タブから入力できます。
      </p>
      <div className="flex items-center justify-center gap-2 pt-1">
        <button onClick={onMasters} className="text-xs border border-gray-300 text-gray-700 rounded px-4 py-2 hover:bg-gray-50">マスター設定へ</button>
        <button onClick={onDashboard} className="text-xs bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 font-medium">ダッシュボードへ</button>
      </div>
    </div>
  );
}

// ── 追加済みアイテム一覧（共通） ──
function ItemList({ items, empty }: { items: { key: string; label: string; sub?: string }[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded p-3 text-center">{empty}</p>;
  }
  return (
    <div className="border border-gray-200 rounded divide-y divide-gray-100 max-h-44 overflow-y-auto">
      {items.map((it) => (
        <div key={it.key} className="flex items-center gap-2 px-3 py-1.5 text-xs">
          <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
          <span className="font-medium text-gray-700">{it.label}</span>
          {it.sub && <span className="text-gray-400">{it.sub}</span>}
        </div>
      ))}
    </div>
  );
}
