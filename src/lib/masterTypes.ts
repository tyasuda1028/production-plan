// ========== 製品マスター ==========
export interface ProductMaster {
  code: string;               // 製品コード（任意）
  modelCode: string;          // 製造器種名（例: FHE-16AW1-G）
  primaryLine: number;        // 主ライン
  capacityPerPallet: number;  // 個/パレット
  palletType: 'P01' | 'P02' | 'P03';
  productionMethod: string;   // A:主力製品 / B:在庫製品 / C:計画生産 / D:受注生産
  active: boolean;            // 有効フラグ
}

export const PALLET_TYPES: Record<string, { name: string; size: string }> = {
  P01: { name: '標準', size: '1100mm' },
  P02: { name: '大型', size: '1200mm' },
  P03: { name: '軽量', size: '800mm' },
};

// ========== 工場マスター ==========
export interface FactoryMaster {
  factoryNumber: string;  // 工場番号（例: 02）
  factoryName: string;    // 工場名（主キー・例: 02工場）
  classification: string; // 分類（例: ブライツ）
  // ライン本数はラインマスターから自動集計
}

// ========== ラインマスター ==========
export interface LineMaster {
  lineNumber: number;      // ライン番号 (2, 3, 4, 7)
  lineName: string;        // ライン名（例: ライン2）
  factoryName: string;     // 工場名（工場マスターと連動）
  classification: string;  // 分類（工場マスターから自動補完）
  dailyCapacity: number;   // 日量能力（台/日）
  remarks: string;         // 備考
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

// ========== シミュレーション月別入力オーバーライド ==========
export interface SimMonthOverride {
  productId: string;
  yearMonth: number;
  salesPlan: number;
  targetInventoryMonths: number;
}

