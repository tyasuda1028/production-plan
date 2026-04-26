// 月次ラインサマリー（グラフシート相当）
export interface LineMonthlySummary {
  yearMonth: number; // e.g. 202602
  operatingDays: number;
  prevSalesPlan: number;
  currSalesPlan: number;
  productionCapacity: number;
  prevProductionPlan: number;
  currProductionPlan: number;
  prevMonthEndInventory: number;
  currMonthEndInventory: number;
  prevInventoryMonths: number;
  currInventoryMonths: number;
}

export interface LineSummary {
  lineCode: string; // e.g. "ブライツ", "ブライツ#2"
  factoryCode: string;
  lines: number[]; // assigned line numbers
  dailyCapacity: number;
  monthly: LineMonthlySummary[];
}

// SKUレベル生産計画（今回貼り付けシート相当）
export interface MonthlyPlan {
  yearMonth: number;
  salesPlan: number;
  targetInventoryMonths: number;
  productionSchedule: number;
  requiredProduction: number;
  surplusDeficit: number;
  planAdjustment: number;
  monthEndInventory: number;
  monthEndInventoryMonths: number;
}

export interface DailyAllocation {
  date: string; // YYYYMMDD
  quantity: number;
  isOperatingDay: boolean;
}

export interface Product {
  id: string;
  responsible: string;
  positive: string; // 新/未/○
  planCategory1: string;
  planCategory2: string;
  planCategory3: string;
  planCategory4: string;
  factoryCode: string;
  inventoryItemCode: string;
  manufacturingItemCode: string;
  productName: string;
  gasType: string;
  primaryFactory: string;
  primaryLine: number;
  productionMethod: string; // A/B/C/D
  orderQuantity: number;
  factoryInventory: number;
  branchInventory: number;
  consignmentInventory: number;
  totalInventory: number;
  twoMonthsAgoInventory: number;
  lastMonthInventory: number;
  capacityPerPallet?: number; // パレット当たり台数
  monthlySales: number[]; // 12ヶ月実績
  monthlyPlans: MonthlyPlan[]; // 6ヶ月計画
  dailyAllocations: DailyAllocation[]; // 日割り
  comment: string;
}

export type ViewMode = 'dashboard' | 'plan' | 'schedule';
