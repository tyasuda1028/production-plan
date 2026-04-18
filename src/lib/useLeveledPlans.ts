import { useMemo } from "react";
import { useMasterStore } from "./masterStore";
import { products, getPlanMonths } from "./data";
import { Product, MonthlyPlan } from "./types";

export type LeveledPlan = MonthlyPlan & { dailyQuantity: number };

const DEFAULT_OP_DAYS = 20;

/**
 * 1品目分の均等日量計画を算出する純粋関数。
 * planMonths（6ヶ月）を前半3・後半3に分け、グループ内の稼働日あたり生産数を均等化する。
 * 在庫は p.lastMonthInventory からの累積計算。
 */
export function buildLeveledPlanForProduct(
  p: Product,
  planMonths: number[],
  opDaysCount: Map<number, number>,
  overrideMap: Map<string, number>
): Map<number, LeveledPlan> {
  // 販売計画オーバーライドを適用したベース計画
  const basePlans: MonthlyPlan[] = planMonths.map((ym) => {
    const mp = p.monthlyPlans.find((m) => m.yearMonth === ym) ?? {
      yearMonth: ym,
      salesPlan: 0,
      targetInventoryMonths: 1.5,
      productionSchedule: 0,
      requiredProduction: 0,
      surplusDeficit: 0,
      planAdjustment: 0,
      monthEndInventory: 0,
      monthEndInventoryMonths: 0,
    };
    const override = overrideMap.get(`${p.id}:${ym}`);
    if (override !== undefined) {
      const salesPlan = override;
      const requiredProduction = Math.round(salesPlan * 1.05);
      return { ...mp, salesPlan, requiredProduction };
    }
    return mp;
  });

  const opDays = planMonths.map((ym) => opDaysCount.get(ym) ?? DEFAULT_OP_DAYS);

  // 前半3ヶ月・後半3ヶ月それぞれで均等日量レートを計算
  const req1  = basePlans.slice(0, 3).reduce((s, m) => s + m.requiredProduction, 0);
  const days1 = opDays.slice(0, 3).reduce((s, d) => s + d, 0);
  const rate1 = days1 > 0 ? req1 / days1 : 0;

  const req2  = basePlans.slice(3).reduce((s, m) => s + m.requiredProduction, 0);
  const days2 = opDays.slice(3).reduce((s, d) => s + d, 0);
  const rate2 = days2 > 0 ? req2 / days2 : 0;

  const rates = [rate1, rate1, rate1, rate2, rate2, rate2];

  const result = new Map<number, LeveledPlan>();
  let prevInv = p.lastMonthInventory;

  basePlans.forEach((mp, i) => {
    const productionSchedule      = Math.round(rates[i] * opDays[i]);
    const surplusDeficit          = productionSchedule - mp.requiredProduction;
    const planAdjustment          = surplusDeficit < 0 ? Math.abs(surplusDeficit) : 0;
    const monthEndInventory       = prevInv + productionSchedule - mp.salesPlan;
    const monthEndInventoryMonths =
      mp.salesPlan > 0 ? parseFloat((monthEndInventory / mp.salesPlan).toFixed(1)) : 0;
    const dailyQuantity = opDays[i] > 0 ? Math.round(productionSchedule / opDays[i]) : 0;

    result.set(mp.yearMonth, {
      ...mp,
      productionSchedule,
      surplusDeficit,
      planAdjustment,
      monthEndInventory,
      monthEndInventoryMonths,
      dailyQuantity,
    });

    prevInv = monthEndInventory;
  });

  return result;
}

/**
 * 全品目の均等日量計画を返すフック。
 * planBaseMonth / salesPlanOverrides / operatingDays のいずれかが変わると再計算される。
 * PlanTable・LineCard・ScheduleView で共通して使用する。
 */
export function useLeveledPlans(): Map<string, Map<number, LeveledPlan>> {
  const planBaseMonth       = useMasterStore((s) => s.planBaseMonth);
  const salesPlanOverrides  = useMasterStore((s) => s.salesPlanOverrides);
  const masterOperatingDays = useMasterStore((s) => s.operatingDays);

  const planMonths = useMemo(() => getPlanMonths(planBaseMonth), [planBaseMonth]);

  const overrideMap = useMemo(
    () => new Map(salesPlanOverrides.map((o) => [`${o.productId}:${o.yearMonth}`, o.salesPlan])),
    [salesPlanOverrides]
  );

  const opDaysCount = useMemo(() => {
    const map = new Map<number, number>();
    masterOperatingDays.forEach((o) => map.set(o.yearMonth, o.operatingDates.length));
    return map;
  }, [masterOperatingDays]);

  return useMemo(() => {
    const result = new Map<string, Map<number, LeveledPlan>>();
    products.forEach((p) => {
      result.set(p.id, buildLeveledPlanForProduct(p, planMonths, opDaysCount, overrideMap));
    });
    return result;
  }, [planMonths, opDaysCount, overrideMap]);
}
