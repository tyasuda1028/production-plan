import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProductMaster, OperatingDaysMaster, InventorySnapshot, LineMaster, SalesPlanOverride, SimMonthOverride } from './masterTypes';
import { products as defaultProducts } from './data';

// デフォルト製品マスター（data.ts から生成）
// ※ 製品コード（code）は空欄 → ユーザーが実際のコードを入力する
const defaultProductMasters: ProductMaster[] = defaultProducts.map((p) => ({
  code: '',                           // 製品コード（数字コード）は未設定
  modelCode: p.manufacturingItemCode, // 製造器種名（例: FHE-16AW1-G）
  primaryLine: p.primaryLine,
  capacityPerPallet: 20,
  palletType: 'P01' as const,
  productionMethod: p.productionMethod,
  active: true,
}));

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

// デフォルトラインマスター
const defaultLineMasters: LineMaster[] = [
  { lineNumber: 2, lineName: "ライン2", factoryName: "02工場", classification: "ブライツ", dailyCapacity: 540 },
  { lineNumber: 3, lineName: "ライン3", factoryName: "02工場", classification: "ブライツ", dailyCapacity: 330 },
  { lineNumber: 4, lineName: "ライン4", factoryName: "02工場", classification: "ブライツ", dailyCapacity: 200 },
  { lineNumber: 7, lineName: "ライン7", factoryName: "02工場", classification: "ブライツ", dailyCapacity:  90 },
];

interface MasterStore {
  // 計画基準月（全ページ共通）
  planBaseMonth: number;
  setPlanBaseMonth: (ym: number) => void;

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
}

export const useMasterStore = create<MasterStore>()(
  persist(
    (set, get) => ({
      // ── 計画基準月 ──
      planBaseMonth: 202603,
      setPlanBaseMonth: (ym: number) => set({ planBaseMonth: ym }),

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
          productMasters: s.productMasters.filter((p) => p.code !== code),
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

      importInventoryCSV: (yearMonth, rows) => {
        const now = new Date().toISOString();
        rows.forEach((r) => {
          get().upsertInventory({
            yearMonth,
            productCode: r.code,
            quantity: r.quantity,
            updatedAt: now,
          });
        });
      },

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
              { productId, yearMonth, salesPlan: 0, targetInventoryMonths: 1.5, [field]: value },
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
    }),
    {
      name: 'production-plan-masters',
    }
  )
);
