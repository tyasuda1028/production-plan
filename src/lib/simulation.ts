/**
 * 生産計画シミュレーション ロジック
 *
 * 計算フロー（月次連鎖）:
 *   翌月末在庫目標 = 在庫月数目標 × 翌々月販売計画
 *   生産必要数     = 翌月末在庫目標 + 翌月販売計画 - 当月末在庫
 *   翌月末在庫     = 当月末在庫 + 生産必要数 - 翌月販売計画
 *   翌月末在庫月数 = 翌月末在庫 / 翌々月販売計画
 */

export const SIM_MONTHS = 6; // シミュレーション対象月数

/** 1ヶ月分の入力パラメータ（編集可能） */
export interface MonthInput {
  yearMonth: number;    // YYYYMM
  salesPlan: number;    // 販売計画
  targetInventoryMonths: number; // 在庫月数目標（翌月販売計画に対する倍数）
}

/** 1ヶ月分の計算結果 */
export interface MonthResult extends MonthInput {
  prevInventory: number;        // 前月末在庫（インプット）
  targetInventoryQty: number;   // 月末在庫目標数量 = 目標月数 × 翌月販売計画
  requiredProduction: number;   // 生産必要数（≥0）
  monthEndInventory: number;    // 月末在庫数
  monthEndInventoryMonths: number; // 月末在庫月数（実績）
  isShortage: boolean;          // 在庫不足フラグ
}

/** 品目ごとのシミュレーション状態 */
export interface ProductSimState {
  productId: string;
  initialInventory: number;  // 計画開始時点の在庫（前月末在庫）
  inputs: MonthInput[];      // 6ヶ月分の入力（編集可能）
  nextSalesPlan: number;     // 7ヶ月目の販売計画（最終月末在庫月数の計算用）
  palletSize?: number;       // パレット当たり台数（省略時は1=切り上げなし）
}

/**
 * 月次シミュレーション計算（全6ヶ月を前月から連鎖計算）
 */
export function calcSimulation(state: ProductSimState): MonthResult[] {
  const pallet = (state.palletSize ?? 1) > 0 ? (state.palletSize ?? 1) : 1;
  const toPallet = (qty: number) => Math.ceil(qty / pallet) * pallet;

  const results: MonthResult[] = [];
  let prevInventory = state.initialInventory;

  for (let i = 0; i < state.inputs.length; i++) {
    const input = state.inputs[i];
    // 翌月販売計画（在庫月数の分母）
    const nextSales =
      i + 1 < state.inputs.length
        ? state.inputs[i + 1].salesPlan
        : state.nextSalesPlan;

    // 月末在庫目標数量
    const targetInventoryQty = Math.round(input.targetInventoryMonths * nextSales);

    // 生産必要数をパレット単位に切り上げ（マイナスになる場合は0）
    const requiredProduction = toPallet(Math.max(
      0,
      targetInventoryQty + input.salesPlan - prevInventory
    ));

    // 月末在庫
    const monthEndInventory = prevInventory + requiredProduction - input.salesPlan;

    // 月末在庫月数（翌月販売が0なら0）
    const monthEndInventoryMonths =
      nextSales > 0
        ? parseFloat((monthEndInventory / nextSales).toFixed(2))
        : 0;

    results.push({
      ...input,
      prevInventory,
      targetInventoryQty,
      requiredProduction,
      monthEndInventory,
      monthEndInventoryMonths,
      isShortage: monthEndInventory < 0,
    });

    prevInventory = monthEndInventory;
  }

  return results;
}

/** デフォルト初期入力を製品データから生成 */
export function buildDefaultInputs(
  startMonth: number,
  monthlySalesPlans: number[],
  defaultTargetMonths = 1.5
): MonthInput[] {
  return monthlySalesPlans.slice(0, SIM_MONTHS).map((salesPlan, i) => {
    const base = startMonth % 100; // MM
    const year = Math.floor(startMonth / 100);
    const mm = ((base - 1 + i) % 12) + 1;
    const yyyy = year + Math.floor((base - 1 + i) / 12);
    return {
      yearMonth: yyyy * 100 + mm,
      salesPlan,
      targetInventoryMonths: defaultTargetMonths,
    };
  });
}

export function formatYM(ym: number): string {
  const s = String(ym);
  return `${s.slice(0, 4)}年${s.slice(4)}月`;
}

export function formatYMShort(ym: number): string {
  const s = String(ym);
  return `${s.slice(2, 4)}/${s.slice(4)}`;
}
