import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProductMaster, OperatingDaysMaster, InventorySnapshot } from './masterTypes';
import { products as defaultProducts } from './data';

// デフォルト製品マスター（data.ts から生成）
const defaultProductMasters: ProductMaster[] = defaultProducts.map((p) => ({
  code: p.manufacturingItemCode,
  name: p.productName,
  primaryLine: p.primaryLine,
  planLot: p.planLot,
  reorderPoint: p.reorderPoint,
  capacityPerPallet: 20,
  palletType: 'P01' as const,
  productionMethod: p.productionMethod,
  active: true,
}));

// デフォルト稼働日マスター（2026年3〜8月）
function buildDefaultOperatingDays(): OperatingDaysMaster[] {
  const months = [202603, 202604, 202605, 202606, 202607, 202608];
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

interface MasterStore {
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
}

export const useMasterStore = create<MasterStore>()(
  persist(
    (set, get) => ({
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
    }),
    {
      name: 'production-plan-masters',
    }
  )
);
