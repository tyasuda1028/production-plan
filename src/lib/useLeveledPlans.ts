import { useMemo } from "react";
import { useMasterStore } from "./masterStore";
import { getPlanMonths, addMonths } from "./data";
import { Product, MonthlyPlan } from "./types";
import { ProductMaster, pmKey } from "./masterTypes";

export type LeveledPlan = MonthlyPlan & { dailyQuantity: number };

const DEFAULT_OP_DAYS = 20;

/**
 * ProductMaster + 初期在庫数量から、計算用の仮想 Product を構築する。
 * monthlyPlans はすべて salesPlan: 0 で初期化し、salesPlanOverrides で上書きする。
 */
export function buildVirtualProduct(
  pm: ProductMaster,
  lastMonthInventory: number,
  planMonths: number[]
): Product {
  return {
    id: pmKey(pm),
    responsible: "",
    positive: "",
    planCategory1: pm.productionMethod,
    planCategory2: "",
    planCategory3: "",
    planCategory4: "",
    factoryCode: "",
    inventoryItemCode: pm.code,
    manufacturingItemCode: pm.modelCode,
    productName: pm.modelCode || pm.code,
    gasType: pm.gasType ?? "",
    primaryFactory: "",
    primaryLine: pm.primaryLine,
    productionMethod: pm.productionMethod,
    orderQuantity: 0,
    factoryInventory: 0,
    branchInventory: 0,
    consignmentInventory: 0,
    totalInventory: lastMonthInventory,
    twoMonthsAgoInventory: 0,
    lastMonthInventory,
    capacityPerPallet: pm.capacityPerPallet ?? 1,
    monthlySales: [],
    monthlyPlans: planMonths.map((ym) => ({
      yearMonth: ym,
      salesPlan: 0,
      targetInventoryMonths: 1.5,
      productionSchedule: 0,
      requiredProduction: 0,
      surplusDeficit: 0,
      planAdjustment: 0,
      monthEndInventory: lastMonthInventory,
      monthEndInventoryMonths: 0,
    })),
    dailyAllocations: [],
    comment: "",
  };
}

/**
 * productMasters + inventorySnapshots から仮想 Product[] を返すフック。
 * ScheduleView / PlanTable / SimulationView など products を使う箇所で利用する。
 */
export function useVirtualProducts(): Product[] {
  const productMasters     = useMasterStore((s) => s.productMasters);
  const inventorySnapshots = useMasterStore((s) => s.inventorySnapshots);
  const planBaseMonth      = useMasterStore((s) => s.planBaseMonth);

  return useMemo(() => {
    const prevMonth  = addMonths(planBaseMonth, -1);
    const planMonths = getPlanMonths(planBaseMonth);
    return productMasters
      .filter((pm) => pm.active !== false)
      .map((pm) => {
        const key  = pmKey(pm);
        const snap = inventorySnapshots.find(
          (s) => s.yearMonth === prevMonth && s.productCode === key
        );
        return buildVirtualProduct(pm, snap?.quantity ?? 0, planMonths);
      });
  }, [productMasters, inventorySnapshots, planBaseMonth]);
}

/**
 * 1品目分の均等日量計画を算出する純粋関数。
 * planMonths（6ヶ月）を前半3・後半3に分け、グループ内の稼働日あたり生産数を均等化する。
 * 在庫は p.lastMonthInventory からの累積計算。
 */
export function buildLeveledPlanForProduct(
  p: Product,
  planMonths: number[],
  opDaysCount: Map<number, number>,
  overrideMap: Map<string, number>,
  simInputsMap?: Map<string, Map<number, { salesPlan: number; targetInventoryMonths: number }>>
): Map<number, LeveledPlan> {
  // 販売計画オーバーライドを適用したベース計画
  let basePlans: MonthlyPlan[] = planMonths.map((ym) => {
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

  const simForProduct = simInputsMap?.get(p.id);
  if (simForProduct && simForProduct.size > 0) {
    let prevInvChain = p.lastMonthInventory;
    basePlans = basePlans.map((mp, i) => {
      const si = simForProduct.get(mp.yearMonth);
      if (!si) {
        prevInvChain = prevInvChain + mp.requiredProduction - mp.salesPlan;
        return mp;
      }
      const nextSalesPlan =
        i + 1 < basePlans.length
          ? (simForProduct.get(basePlans[i + 1].yearMonth)?.salesPlan ?? basePlans[i + 1].salesPlan)
          : p.monthlyPlans.find((m) => m.yearMonth > mp.yearMonth)?.salesPlan ?? 0;
      const targetInventoryQty = Math.round(si.targetInventoryMonths * nextSalesPlan);
      const requiredProduction = Math.max(0, targetInventoryQty + si.salesPlan - prevInvChain);
      prevInvChain = prevInvChain + requiredProduction - si.salesPlan;
      return { ...mp, salesPlan: si.salesPlan, requiredProduction };
    });
  }

  const opDays = planMonths.map((ym) => opDaysCount.get(ym) ?? DEFAULT_OP_DAYS);

  // 3ヶ月ローリング平均レート：当月から3ヶ月分の必要生産量÷稼働日数
  // 月ごとに「当月〜翌2ヶ月」の平均日量を目標にすることで滑らかな生産計画を実現
  const rates = basePlans.map((_, i) => {
    const end    = Math.min(i + 3, basePlans.length);
    const reqSum = basePlans.slice(i, end).reduce((s, m) => s + m.requiredProduction, 0);
    const daySum = opDays.slice(i, end).reduce((s, d) => s + d, 0);
    return daySum > 0 ? reqSum / daySum : 0;
  });

  const pallet = (p.capacityPerPallet ?? 1) > 0 ? (p.capacityPerPallet ?? 1) : 1;
  // パレット単位切り上げヘルパー
  const toPallet = (qty: number) => Math.ceil(qty / pallet) * pallet;

  const result = new Map<number, LeveledPlan>();
  let prevInv = p.lastMonthInventory;

  basePlans.forEach((mp, i) => {
    // 生産数をパレット単位に切り上げ。必要生産がある場合は最低1パレット保証
    const roundedQty = Math.round(rates[i] * opDays[i]);
    const productionSchedule = roundedQty === 0 && mp.requiredProduction > 0
      ? pallet
      : toPallet(roundedQty);
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
  const simMonthOverrides   = useMasterStore((s) => s.simMonthOverrides);
  const productMasters      = useMasterStore((s) => s.productMasters);
  const inventorySnapshots  = useMasterStore((s) => s.inventorySnapshots);

  const planMonths = useMemo(() => getPlanMonths(planBaseMonth), [planBaseMonth]);
  const prevMonth  = useMemo(() => addMonths(planBaseMonth, -1), [planBaseMonth]);

  const overrideMap = useMemo(
    () => new Map(salesPlanOverrides.map((o) => [`${o.productId}:${o.yearMonth}`, o.salesPlan])),
    [salesPlanOverrides]
  );

  const opDaysCount = useMemo(() => {
    const map = new Map<number, number>();
    masterOperatingDays.forEach((o) => map.set(o.yearMonth, o.operatingDates.length));
    return map;
  }, [masterOperatingDays]);

  const simInputsMap = useMemo(() => {
    const map = new Map<string, Map<number, { salesPlan: number; targetInventoryMonths: number }>>();
    simMonthOverrides.forEach((o) => {
      if (!map.has(o.productId)) map.set(o.productId, new Map());
      map.get(o.productId)!.set(o.yearMonth, {
        salesPlan: o.salesPlan,
        targetInventoryMonths: o.targetInventoryMonths,
      });
    });
    return map;
  }, [simMonthOverrides]);

  return useMemo(() => {
    const result = new Map<string, Map<number, LeveledPlan>>();
    productMasters.filter((pm) => pm.active !== false).forEach((pm) => {
      const key  = pmKey(pm);
      const snap = inventorySnapshots.find(
        (s) => s.yearMonth === prevMonth && s.productCode === key
      );
      const vp = buildVirtualProduct(pm, snap?.quantity ?? 0, planMonths);
      result.set(key, buildLeveledPlanForProduct(vp, planMonths, opDaysCount, overrideMap, simInputsMap));
    });
    return result;
  }, [planMonths, prevMonth, productMasters, inventorySnapshots, opDaysCount, overrideMap, simInputsMap]);
}
