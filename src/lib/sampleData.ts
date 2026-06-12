import {
  ProductMaster, FactoryMaster, LineMaster, SalesPlanOverride, InventorySnapshot, pmKey,
  MaterialMaster, BomLine, MaterialStock,
} from './masterTypes';
import { addMonths, getPlanMonths } from './data';

/**
 * セットアップウィザードの「サンプルデータで始める」用の一式。
 * 工場・ライン・製品に加え、計画基準月を起点とした販売計画と前月末在庫を生成し、
 * 投入直後にダッシュボード・生産計画表・スケジュールが数字で埋まるようにする。
 */
export interface SampleData {
  factoryMasters: FactoryMaster[];
  lineMasters: LineMaster[];
  productMasters: ProductMaster[];
  salesPlanOverrides: SalesPlanOverride[];
  inventorySnapshots: InventorySnapshot[];
  materialMasters: MaterialMaster[];
  bomLines: BomLine[];
  materialStocks: MaterialStock[];
}

const FACTORIES: FactoryMaster[] = [
  { factoryNumber: '01', factoryName: '第一工場', classification: '組立' },
  { factoryNumber: '02', factoryName: '第二工場', classification: '加工' },
];

const LINES: LineMaster[] = [
  { lineNumber: 1, lineName: 'ライン1', factoryName: '第一工場', classification: '組立', dailyCapacity: 500, remarks: '' },
  { lineNumber: 2, lineName: 'ライン2', factoryName: '第一工場', classification: '組立', dailyCapacity: 400, remarks: '' },
  { lineNumber: 3, lineName: 'ライン3', factoryName: '第二工場', classification: '加工', dailyCapacity: 300, remarks: '' },
];

const PRODUCTS: ProductMaster[] = [
  { code: '1001', modelCode: '製品A 標準型', primaryLine: 1, capacityPerPallet: 20, palletType: 'P01', productionMethod: 'A:主力製品', active: true },
  { code: '1002', modelCode: '製品B 大型',   primaryLine: 1, capacityPerPallet: 12, palletType: 'P02', productionMethod: 'B:在庫製品', active: true },
  { code: '1003', modelCode: '製品C 軽量型', primaryLine: 2, capacityPerPallet: 30, palletType: 'P03', productionMethod: 'A:主力製品', active: true },
  { code: '1004', modelCode: '製品D 標準型', primaryLine: 2, capacityPerPallet: 20, palletType: 'P01', productionMethod: 'B:在庫製品', active: true },
  { code: '1005', modelCode: '製品E 加工品', primaryLine: 3, capacityPerPallet: 24, palletType: 'P01', productionMethod: 'C:計画生産', active: true },
];

// 製品コード → 6ヶ月分の販売計画
const SALES: Record<string, number[]> = {
  '1001': [3000, 3200, 3100, 3300, 3000, 3400],
  '1002': [1500, 1400, 1600, 1500, 1550, 1600],
  '1003': [4000, 4200, 3900, 4100, 4300, 4000],
  '1004': [2000, 2100, 2000, 2200, 2100, 2050],
  '1005': [1200, 1300, 1250, 1200, 1350, 1300],
};

// 製品コード → 前月末在庫
const INVENTORY: Record<string, number> = {
  '1001': 4500,
  '1002': 2200,
  '1003': 6000,
  '1004': 3000,
  '1005': 1800,
};

// 部材マスター（M-BOM/MRP用）
const MATERIALS: MaterialMaster[] = [
  { code: 'M001', name: '制御基板',     unit: '枚' },
  { code: 'M002', name: 'モーターユニット', unit: '個' },
  { code: 'M003', name: '鋼板 1.2mm',   unit: '枚' },
  { code: 'M004', name: 'ねじセット',   unit: '組' },
  { code: 'M005', name: '塗料（白）',   unit: 'kg' },
];

// BOM（製品コード → [部材コード, 員数]）
const BOM: Record<string, [string, number][]> = {
  '1001': [['M001', 1], ['M003', 2], ['M004', 1]],
  '1002': [['M001', 1], ['M002', 1], ['M003', 4], ['M004', 2]],
  '1003': [['M001', 1], ['M003', 1], ['M004', 1]],
  '1004': [['M001', 1], ['M002', 1], ['M004', 1]],
  '1005': [['M003', 2], ['M005', 0.5]],
};

// 部材コード → 現在庫
const MATERIAL_STOCK: Record<string, number> = {
  M001: 8000,
  M002: 2000,
  M003: 15000,
  M004: 10000,
  M005: 300,
};

export function buildSampleData(base: number): SampleData {
  const months = getPlanMonths(base);
  const prev = addMonths(base, -1);
  const now = new Date().toISOString();

  const salesPlanOverrides: SalesPlanOverride[] = [];
  PRODUCTS.forEach((p) => {
    const id = pmKey(p);
    const arr = SALES[p.code] ?? [];
    months.forEach((ym, i) => {
      const v = arr[i] ?? arr[arr.length - 1] ?? 0;
      if (v > 0) salesPlanOverrides.push({ productId: id, yearMonth: ym, salesPlan: v });
    });
  });

  const inventorySnapshots: InventorySnapshot[] = PRODUCTS.map((p) => ({
    yearMonth: prev,
    productCode: pmKey(p),
    quantity: INVENTORY[p.code] ?? 0,
    updatedAt: now,
  }));

  const bomLines: BomLine[] = [];
  PRODUCTS.forEach((p) => {
    const id = pmKey(p);
    (BOM[p.code] ?? []).forEach(([materialCode, qtyPer]) => {
      bomLines.push({ productId: id, materialCode, qtyPer });
    });
  });

  const materialStocks: MaterialStock[] = MATERIALS.map((m) => ({
    materialCode: m.code,
    quantity: MATERIAL_STOCK[m.code] ?? 0,
  }));

  return {
    factoryMasters: FACTORIES,
    lineMasters: LINES,
    productMasters: PRODUCTS,
    salesPlanOverrides,
    inventorySnapshots,
    materialMasters: MATERIALS,
    bomLines,
    materialStocks,
  };
}
