// ========== 製品マスター ==========
export interface ProductMaster {
  code: string;               // 製品コード（truck-loaderと共通キー・任意）
  modelCode: string;          // 製造器種名（例: FHE-16AW1-G）
  primaryLine: number;        // 主ライン
  planLot: number;            // 計画ロット
  reorderPoint: number;       // 発注点
  capacityPerPallet: number;  // 個/パレット
  palletType: 'P01' | 'P02' | 'P03';
  productionMethod: string;   // B:在庫製品 / D:受注生産
  active: boolean;            // 有効フラグ
}

export const PALLET_TYPES: Record<string, { name: string; size: string }> = {
  P01: { name: '標準', size: '1100mm' },
  P02: { name: '大型', size: '1200mm' },
  P03: { name: '軽量', size: '800mm' },
};

// ========== ラインマスター ==========
export interface LineMaster {
  lineNumber: number;      // ライン番号 (2, 3, 4, 7)
  lineName: string;        // ライン名（例: ライン2）
  factoryName: string;     // 工場名（例: 第1工場）
  classification: string;  // 分類（例: ブライツ）
}

// ========== 販売計画オーバーライド ==========
export interface SalesPlanOverride {
  productId: string;   // Product.id (P001 etc.)
  yearMonth: number;   // YYYYMM
  salesPlan: number;
}

// ========== 稼働日マスター ==========
export interface OperatingDaysMaster {
  yearMonth: number;       // YYYYMM
  operatingDates: number[]; // 稼働する日付のリスト [1, 2, 4, 7, ...]
}

// ========== 在庫スナップショット ==========
export interface InventorySnapshot {
  yearMonth: number;
  productCode: string;
  quantity: number;
  updatedAt: string; // ISO date string
}

// ========== Truck-Loader 連携型 ==========
export interface TruckLoaderExportData {
  exportedAt: string;
  sourceApp: string;
  products: TruckLoaderProduct[];
  productionPlan: Record<string, number>;  // productCode → 月次計画数
  inventoryStock: Record<string, number>;  // productCode → 在庫数
}

export interface TruckLoaderProduct {
  code: string;
  name: string;
  capacityPerPallet: number;
  palletType: string;
  factoryCode: string;
}
