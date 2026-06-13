import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProductMaster, OperatingDaysMaster, InventorySnapshot, LineMaster, FactoryMaster, SalesPlanOverride, SimMonthOverride, CustomFieldDef, CustomFieldTarget, MaterialMaster, BomLine, MaterialStock } from './masterTypes';
import { createLocalStorage } from './localStore';
import { createSupabaseStorage } from './supabaseStorage';
import { supabaseEnabled } from './supabaseClient';
import { buildSampleData } from './sampleData';

// 製品マスターはデフォルトなし（各企業がマスター設定から登録）
const defaultProductMasters: ProductMaster[] = [];

// デフォルト稼働日マスター（2026年1月〜2027年12月 = 24ヶ月）
function buildDefaultOperatingDays(): OperatingDaysMaster[] {
  const months: number[] = Array.from({ length: 24 }, (_, i) => {
    const y = 2026 + Math.floor(i / 12);
    const m = (i % 12) + 1;
    return y * 100 + m;
  });
  return months.map((ym) => {
    const year = Math.floor(ym / 100);
    const month = ym % 100;
    const daysInMonth = new Date(year, month, 0).getDate();
    const operating: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (dow !== 0 && dow !== 6) operating.push(d);
    }
    return { yearMonth: ym, operatingDates: operating };
  });
}

// 工場・ラインマスターはデフォルトなし（各企業がマスター設定から登録）
const defaultFactoryMasters: FactoryMaster[] = [];
const defaultLineMasters: LineMaster[]       = [];

/** 当月の YYYYMM（計画基準月の既定）。在庫の前月末はこれに連動する。 */
function currentYearMonth(): number {
  const d = new Date();
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}

interface MasterStore {
  // データ読み込み完了フラグ（localStorage からの初回ロードが終わるまで false）
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  // 計画基準月（全ページ共通）
  planBaseMonth: number;
  setPlanBaseMonth: (ym: number) => void;

  // 在庫月数目標の既定値（B/C・標準）
  defaultTargetInventoryMonths: number;
  setDefaultTargetInventoryMonths: (v: number) => void;
  // 最小在庫月数（生産方式A用）
  minTargetInventoryMonths: number;
  setMinTargetInventoryMonths: (v: number) => void;
  // 生産間隔（月）（生産方式C・定期まとめ生産用）
  productionCycleMonths: number;
  setProductionCycleMonths: (v: number) => void;

  // 工場マスター
  factoryMasters: FactoryMaster[];
  addFactory: (f: FactoryMaster) => void;
  updateFactory: (factoryName: string, patch: Partial<FactoryMaster>) => void;
  deleteFactory: (factoryName: string) => void;

  // ラインマスター
  lineMasters: LineMaster[];
  addLineMaster: (l: LineMaster) => void;
  updateLineMaster: (lineNumber: number, patch: Partial<LineMaster>) => void;
  replaceLineMaster: (oldNumber: number, newEntry: LineMaster) => void;
  deleteLineMaster: (lineNumber: number) => void;

  // 製品マスター
  productMasters: ProductMaster[];
  addProduct: (p: ProductMaster) => void;
  updateProduct: (code: string, p: Partial<ProductMaster>) => void;
  deleteProduct: (code: string) => void;
  importProducts: (rows: ProductMaster[]) => void;

  // 稼働日マスター
  operatingDays: OperatingDaysMaster[];
  setOperatingDays: (ym: number, dates: number[]) => void;
  toggleOperatingDay: (ym: number, day: number) => void;

  // 在庫スナップショット
  inventorySnapshots: InventorySnapshot[];
  upsertInventory: (snap: InventorySnapshot) => void;
  removeInventory: (yearMonth: number, productCode: string) => void;
  importInventoryCSV: (yearMonth: number, rows: { code: string; quantity: number }[]) => void;
  getInventory: (yearMonth: number) => Record<string, number>;

  // 販売計画オーバーライド
  salesPlanOverrides: SalesPlanOverride[];
  setSalesPlanOverride: (productId: string, yearMonth: number, salesPlan: number) => void;
  clearSalesPlanOverride: (productId: string, yearMonth: number) => void;
  getSalesPlanOverride: (productId: string, yearMonth: number) => number | undefined;

  // シミュレーション入力オーバーライド
  simMonthOverrides: SimMonthOverride[];
  setSimMonthOverride: (productId: string, yearMonth: number, field: 'salesPlan' | 'targetInventoryMonths', value: number) => void;
  setSimMonthInputs: (productId: string, inputs: Array<{yearMonth: number; salesPlan: number; targetInventoryMonths: number}>) => void;
  clearSimMonthOverrides: (productId: string) => void;

  // 部材マスター（M-BOM/MRP）
  materialMasters: MaterialMaster[];
  addMaterial: (m: MaterialMaster) => void;
  updateMaterial: (code: string, patch: Partial<MaterialMaster>) => void;
  deleteMaterial: (code: string) => void;
  importMaterials: (rows: MaterialMaster[]) => void;

  // BOM（部品構成・多階層）：親=製品 or 部材（半製品）
  bomLines: BomLine[];
  upsertBomLine: (parentId: string, materialCode: string, qtyPer: number, qtyGood?: number) => void;
  deleteBomLine: (parentId: string, materialCode: string) => void;
  importBom: (rows: BomLine[]) => void;

  // 部材在庫
  materialStocks: MaterialStock[];
  setMaterialStock: (materialCode: string, quantity: number) => void;

  // カスタム項目（ユーザー定義のマスター項目）
  productFields: CustomFieldDef[];
  factoryFields: CustomFieldDef[];
  lineFields: CustomFieldDef[];
  addCustomField: (target: CustomFieldTarget, label: string) => void;
  renameCustomField: (target: CustomFieldTarget, id: string, label: string) => void;
  deleteCustomField: (target: CustomFieldTarget, id: string) => void;

  // 年別データ一括削除
  clearYearData: (year: number) => void;

  // 全データ削除（このユーザーの保存データを初期状態に戻す）
  resetAll: () => void;

  // セットアップウィザード
  setupCompleted: boolean;
  setSetupCompleted: (v: boolean) => void;
  seedSampleData: () => void;
}

export const useMasterStore = create<MasterStore>()(
  persist(
    (set, get) => ({
      // ── ローディング ──
      _hasHydrated: false,
      setHasHydrated: (v: boolean) => set({ _hasHydrated: v }),

      // ── 計画基準月（既定は当月） ──
      planBaseMonth: currentYearMonth(),
      setPlanBaseMonth: (ym: number) => set({ planBaseMonth: ym }),

      // ── 在庫月数目標の既定値・方式別パラメータ ──
      defaultTargetInventoryMonths: 1.5,
      setDefaultTargetInventoryMonths: (v: number) => set({ defaultTargetInventoryMonths: v }),
      minTargetInventoryMonths: 0.5,
      setMinTargetInventoryMonths: (v: number) => set({ minTargetInventoryMonths: v }),
      productionCycleMonths: 2,
      setProductionCycleMonths: (v: number) => set({ productionCycleMonths: v }),

      // ── 工場マスター ──
      factoryMasters: defaultFactoryMasters,

      addFactory: (f) =>
        set((s) => ({
          factoryMasters: [...s.factoryMasters.filter((x) => x.factoryName !== f.factoryName), f],
        })),

      updateFactory: (factoryName, patch) =>
        set((s) => ({
          factoryMasters: s.factoryMasters.map((f) =>
            f.factoryName === factoryName ? { ...f, ...patch } : f
          ),
        })),

      deleteFactory: (factoryName) =>
        set((s) => ({
          factoryMasters: s.factoryMasters.filter((f) => f.factoryName !== factoryName),
        })),

      // ── ラインマスター ──
      lineMasters: defaultLineMasters,

      addLineMaster: (l) =>
        set((s) => ({
          lineMasters: [...s.lineMasters, l].sort((a, b) => a.lineNumber - b.lineNumber),
        })),

      updateLineMaster: (lineNumber, patch) =>
        set((s) => ({
          lineMasters: s.lineMasters.map((l) =>
            l.lineNumber === lineNumber ? { ...l, ...patch } : l
          ),
        })),

      replaceLineMaster: (oldNumber, newEntry) =>
        set((s) => ({
          lineMasters: [
            ...s.lineMasters.filter((l) => l.lineNumber !== oldNumber),
            newEntry,
          ].sort((a, b) => a.lineNumber - b.lineNumber),
        })),

      deleteLineMaster: (lineNumber) =>
        set((s) => ({
          lineMasters: s.lineMasters.filter((l) => l.lineNumber !== lineNumber),
        })),

      // ── 製品マスター ──
      productMasters: defaultProductMasters,

      addProduct: (p) =>
        set((s) => ({ productMasters: [...s.productMasters, p] })),

      updateProduct: (code, patch) =>
        set((s) => ({
          productMasters: s.productMasters.map((p) =>
            p.code === code ? { ...p, ...patch } : p
          ),
        })),

      deleteProduct: (code) =>
        set((s) => ({
          productMasters: s.productMasters.filter((p) => (p.code || p.modelCode) !== code),
          // 製品削除時はBOM行も連動削除（孤立防止）
          bomLines: s.bomLines.filter((b) => b.productId !== code),
        })),

      importProducts: (rows) =>
        set((s) => {
          const map = new Map(s.productMasters.map((p) => [p.code, p]));
          rows.forEach((r) => map.set(r.code, r));
          return { productMasters: Array.from(map.values()) };
        }),

      // ── 稼働日マスター ──
      operatingDays: buildDefaultOperatingDays(),

      setOperatingDays: (ym, dates) =>
        set((s) => ({
          operatingDays: s.operatingDays.some((o) => o.yearMonth === ym)
            ? s.operatingDays.map((o) =>
                o.yearMonth === ym ? { ...o, operatingDates: dates } : o
              )
            : [...s.operatingDays, { yearMonth: ym, operatingDates: dates }],
        })),

      toggleOperatingDay: (ym, day) => {
        const current = get().operatingDays.find((o) => o.yearMonth === ym);
        const dates = current?.operatingDates ?? [];
        const next = dates.includes(day)
          ? dates.filter((d) => d !== day)
          : [...dates, day].sort((a, b) => a - b);
        get().setOperatingDays(ym, next);
      },

      // ── 在庫スナップショット ──
      inventorySnapshots: [],

      upsertInventory: (snap) =>
        set((s) => {
          const filtered = s.inventorySnapshots.filter(
            (i) => !(i.yearMonth === snap.yearMonth && i.productCode === snap.productCode)
          );
          return { inventorySnapshots: [...filtered, snap] };
        }),

      removeInventory: (yearMonth, productCode) =>
        set((s) => ({
          inventorySnapshots: s.inventorySnapshots.filter(
            (i) => !(i.yearMonth === yearMonth && i.productCode === productCode)
          ),
        })),

      importInventoryCSV: (yearMonth, rows) =>
        set((s) => {
          const now = new Date().toISOString();
          const incoming = rows.map((r) => ({
            yearMonth,
            productCode: r.code,
            quantity: r.quantity,
            updatedAt: now,
          }));
          const incomingKeys = new Set(incoming.map((i) => `${i.yearMonth}:${i.productCode}`));
          const kept = s.inventorySnapshots.filter(
            (i) => !incomingKeys.has(`${i.yearMonth}:${i.productCode}`)
          );
          return { inventorySnapshots: [...kept, ...incoming] };
        }),

      getInventory: (yearMonth) => {
        const snaps = get().inventorySnapshots.filter(
          (s) => s.yearMonth === yearMonth
        );
        return Object.fromEntries(snaps.map((s) => [s.productCode, s.quantity]));
      },

      // ── 販売計画オーバーライド ──
      salesPlanOverrides: [],

      setSalesPlanOverride: (productId, yearMonth, salesPlan) =>
        set((s) => {
          const filtered = s.salesPlanOverrides.filter(
            (o) => !(o.productId === productId && o.yearMonth === yearMonth)
          );
          return { salesPlanOverrides: [...filtered, { productId, yearMonth, salesPlan }] };
        }),

      clearSalesPlanOverride: (productId, yearMonth) =>
        set((s) => ({
          salesPlanOverrides: s.salesPlanOverrides.filter(
            (o) => !(o.productId === productId && o.yearMonth === yearMonth)
          ),
        })),

      getSalesPlanOverride: (productId, yearMonth) =>
        get().salesPlanOverrides.find(
          (o) => o.productId === productId && o.yearMonth === yearMonth
        )?.salesPlan,

      // ── シミュレーション入力オーバーライド ──
      simMonthOverrides: [],

      setSimMonthOverride: (productId, yearMonth, field, value) =>
        set((s) => {
          const existing = s.simMonthOverrides.find(
            (o) => o.productId === productId && o.yearMonth === yearMonth
          );
          if (existing) {
            return {
              simMonthOverrides: s.simMonthOverrides.map((o) =>
                o.productId === productId && o.yearMonth === yearMonth
                  ? { ...o, [field]: value }
                  : o
              ),
            };
          }
          return {
            simMonthOverrides: [
              ...s.simMonthOverrides,
              { productId, yearMonth, salesPlan: 0, targetInventoryMonths: get().defaultTargetInventoryMonths, [field]: value },
            ],
          };
        }),

      setSimMonthInputs: (productId, inputs) =>
        set((s) => {
          const others = s.simMonthOverrides.filter((o) => o.productId !== productId);
          const newEntries = inputs.map((inp) => ({ productId, ...inp }));
          return { simMonthOverrides: [...others, ...newEntries] };
        }),

      clearSimMonthOverrides: (productId) =>
        set((s) => ({
          simMonthOverrides: s.simMonthOverrides.filter((o) => o.productId !== productId),
        })),

      // ── 部材マスター（M-BOM/MRP） ──
      materialMasters: [],

      addMaterial: (m) =>
        set((s) => ({
          materialMasters: [...s.materialMasters.filter((x) => x.code !== m.code), m]
            .sort((a, b) => a.code.localeCompare(b.code)),
        })),

      updateMaterial: (code, patch) =>
        set((s) => ({
          materialMasters: s.materialMasters.map((m) => (m.code === code ? { ...m, ...patch } : m)),
        })),

      deleteMaterial: (code) =>
        set((s) => ({
          // 部材削除時はBOM行（子として・親=半製品として両方）・在庫も連動削除
          materialMasters: s.materialMasters.filter((m) => m.code !== code),
          bomLines: s.bomLines.filter((b) => b.materialCode !== code && b.productId !== code),
          materialStocks: s.materialStocks.filter((st) => st.materialCode !== code),
        })),

      importMaterials: (rows) =>
        set((s) => {
          const map = new Map(s.materialMasters.map((m) => [m.code, m]));
          rows.forEach((r) => map.set(r.code, r));
          return { materialMasters: Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code)) };
        }),

      // ── BOM（部品構成） ──
      bomLines: [],

      upsertBomLine: (parentId, materialCode, qtyPer, qtyGood) =>
        set((s) => ({
          bomLines: [
            ...s.bomLines.filter((b) => !(b.productId === parentId && b.materialCode === materialCode)),
            { productId: parentId, materialCode, qtyPer, ...(qtyGood !== undefined ? { qtyGood } : {}) },
          ],
        })),

      deleteBomLine: (parentId, materialCode) =>
        set((s) => ({
          bomLines: s.bomLines.filter(
            (b) => !(b.productId === parentId && b.materialCode === materialCode)
          ),
        })),

      importBom: (rows) =>
        set((s) => {
          const map = new Map(s.bomLines.map((b) => [`${b.productId}::${b.materialCode}`, b]));
          rows.forEach((r) => map.set(`${r.productId}::${r.materialCode}`, r));
          return { bomLines: Array.from(map.values()) };
        }),

      // ── 部材在庫 ──
      materialStocks: [],

      setMaterialStock: (materialCode, quantity) =>
        set((s) => ({
          materialStocks:
            quantity > 0
              ? [
                  ...s.materialStocks.filter((st) => st.materialCode !== materialCode),
                  { materialCode, quantity },
                ]
              : s.materialStocks.filter((st) => st.materialCode !== materialCode),
        })),

      // ── カスタム項目 ──
      productFields: [],
      factoryFields: [],
      lineFields: [],

      addCustomField: (target, label) => {
        const trimmed = label.trim();
        if (!trimmed) return;
        const entry: CustomFieldDef = { id: crypto.randomUUID(), label: trimmed };
        const key = `${target}Fields` as const;
        set((s) => ({ [key]: [...s[key], entry] }) as Partial<MasterStore>);
      },

      renameCustomField: (target, id, label) => {
        const key = `${target}Fields` as const;
        set((s) => ({
          [key]: s[key].map((f) => (f.id === id ? { ...f, label } : f)),
        }) as Partial<MasterStore>);
      },

      deleteCustomField: (target, id) => {
        const fieldsKey = `${target}Fields` as const;
        const recordsKey = ({ product: 'productMasters', factory: 'factoryMasters', line: 'lineMasters' } as const)[target];
        set((s) => {
          const strip = <T extends { custom?: Record<string, string> }>(rows: T[]): T[] =>
            rows.map((r) => {
              if (!r.custom || !(id in r.custom)) return r;
              const next = { ...r.custom };
              delete next[id];
              return { ...r, custom: next };
            });
          return {
            [fieldsKey]: s[fieldsKey].filter((f) => f.id !== id),
            [recordsKey]: strip(s[recordsKey] as Array<{ custom?: Record<string, string> }>),
          } as Partial<MasterStore>;
        });
      },

      clearYearData: (year) =>
        set((s) => {
          const notInYear = (ym: number) => Math.floor(ym / 100) !== year;
          return {
            salesPlanOverrides: s.salesPlanOverrides.filter((o) => notInYear(o.yearMonth)),
            inventorySnapshots: s.inventorySnapshots.filter((o) => notInYear(o.yearMonth)),
            simMonthOverrides:  s.simMonthOverrides.filter((o)  => notInYear(o.yearMonth)),
            operatingDays:      s.operatingDays.filter((o)      => notInYear(o.yearMonth)),
          };
        }),

      resetAll: () =>
        set({
          planBaseMonth: currentYearMonth(),
          defaultTargetInventoryMonths: 1.5,
          minTargetInventoryMonths: 0.5,
          productionCycleMonths: 2,
          factoryMasters: [],
          lineMasters: [],
          productMasters: [],
          operatingDays: buildDefaultOperatingDays(),
          inventorySnapshots: [],
          salesPlanOverrides: [],
          simMonthOverrides: [],
          productFields: [],
          factoryFields: [],
          lineFields: [],
          materialMasters: [],
          bomLines: [],
          materialStocks: [],
          setupCompleted: false,
        }),

      // ── セットアップウィザード ──
      setupCompleted: false,
      setSetupCompleted: (v) => set({ setupCompleted: v }),

      seedSampleData: () =>
        set((s) => {
          const sample = buildSampleData(s.planBaseMonth);
          return {
            factoryMasters: sample.factoryMasters,
            lineMasters: sample.lineMasters,
            productMasters: sample.productMasters,
            salesPlanOverrides: sample.salesPlanOverrides,
            inventorySnapshots: sample.inventorySnapshots,
            materialMasters: sample.materialMasters,
            bomLines: sample.bomLines,
            materialStocks: sample.materialStocks,
            setupCompleted: true,
          };
        }),
    }),
    {
      name: 'production-plan-masters',
      // Supabase（クラウド保存・多端末同期）が有効ならそちら、
      // 未設定なら従来どおり localStorage のみで動作
      storage: supabaseEnabled ? createSupabaseStorage() : createLocalStorage(),
      // 計画基準月は「当月を下回らない」ように補正して開く。
      // 保存値が過去（または未設定）なら当月へ繰り上げ、未来月の選択はそのまま保持。
      // → 在庫の前月末 = 計画基準月-1 が常に当月以降に連動する。
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<MasterStore>) } as MasterStore;
        const now = currentYearMonth();
        if (!merged.planBaseMonth || merged.planBaseMonth < now) {
          merged.planBaseMonth = now;
        }
        return merged;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
