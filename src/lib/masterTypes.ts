// ========== カスタム項目（ユーザー定義の表示・メモ用フィールド） ==========
export type CustomFieldTarget = 'product' | 'factory' | 'line';
export interface CustomFieldDef {
  id: string;     // 安定ID（crypto.randomUUID）
  label: string;  // 表示ラベル
}

// ========== 製品マスター ==========
export interface ProductMaster {
  code: string;               // 製品コード（任意）
  modelCode: string;          // 品名
  primaryLine: number;        // 主ライン
  capacityPerPallet: number;  // 個/パレット
  palletType: 'P01' | 'P02' | 'P03';
  productionMethod: string;   // A:主力製品 / B:在庫製品 / C:計画生産 / D:受注生産
  active: boolean;            // 有効フラグ
  custom?: Record<string, string>; // カスタム項目の値（フィールドID→値）
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
  custom?: Record<string, string>; // カスタム項目の値（フィールドID→値）
}

// ========== ラインマスター ==========
export interface LineMaster {
  lineNumber: number;      // ライン番号 (2, 3, 4, 7)
  lineName: string;        // ライン名（例: ライン2）
  factoryName: string;     // 工場名（工場マスターと連動）
  classification: string;  // 分類（工場マスターから自動補完）
  dailyCapacity: number;   // 日量能力（台/日）
  remarks: string;         // 備考
  custom?: Record<string, string>; // カスタム項目の値（フィールドID→値）
}

// ========== 部材マスター（M-BOM/MRP用） ==========
export interface MaterialMaster {
  code: string;   // 部材コード（主キー）
  name: string;   // 部材名
  unit: string;   // 単位（個・kg・m など）
}

// ========== BOM（部品構成）行：親1単位あたりの部材使用量（多階層対応） ==========
export interface BomLine {
  // 親ID：製品の pmKey または 部材コード（部材が親＝半製品）
  // ※フィールド名は旧データ互換のため productId のまま
  productId: string;
  materialCode: string; // 子の部材コード
  qtyPer: number;       // 投入量（親1単位あたり）
  qtyGood?: number;     // 完成品量（省略時 = qtyPer → スクラップ0）
}

/** BOM行のスクラップ量（投入 − 完成） */
export function bomScrap(line: BomLine): number {
  return line.qtyPer - (line.qtyGood ?? line.qtyPer);
}

// ========== 部材在庫（MRPの引当て開始時点の現在庫） ==========
export interface MaterialStock {
  materialCode: string;
  quantity: number;
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

// ========== ユーティリティ ==========
/** ProductMaster の一意キー（品目コード優先、なければ品名） */
export function pmKey(pm: ProductMaster): string {
  return pm.code || pm.modelCode;
}

