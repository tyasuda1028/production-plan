import { useMemo } from "react";
import { useMasterStore } from "./masterStore";
import { getPlanMonths, addMonths } from "./data";
import { Product, MonthlyPlan } from "./types";
import { ProductMaster, pmKey } from "./masterTypes";
import { methodLetter, targetMonthsForMethod } from "./productionMethods";

/** 方式別の在庫・生産パラメータ */
export interface PlanPolicy {
  standardMonths: number; // B/C の在庫月数目標（標準）
  minMonths: number;      // A の最小在庫月数
  cycleMonths: number;    // C の生産間隔（月）
}

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
    gasType: "",
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
  simInputsMap: Map<string, Map<number, { salesPlan: number; targetInventoryMonths: number }>> | undefined,
  policy: PlanPolicy
): Map<number, LeveledPlan> {
  const n = planMonths.length;
  const letter = methodLetter(p.productionMethod);
  const pallet = (p.capacityPerPallet ?? 1) > 0 ? (p.capacityPerPallet ?? 1) : 1;
  const toPallet = (qty: number) => Math.ceil(qty / pallet) * pallet;
  const opDays = planMonths.map((ym) => opDaysCount.get(ym) ?? DEFAULT_OP_DAYS);
  const simForProduct = simInputsMap?.get(p.id);

  // ── 各月の販売計画（sim販売 ＞ salesPlanオーバーライド ＞ monthlyPlan） ──
  const sales = planMonths.map((ym) => {
    const sim = simForProduct?.get(ym);
    if (sim) return sim.salesPlan;
    const ov = overrideMap.get(`${p.id}:${ym}`);
    if (ov !== undefined) return ov;
    return p.monthlyPlans.find((m) => m.yearMonth === ym)?.salesPlan ?? 0;
  });
  // 翌月販売（最終月は7ヶ月目があれば使用、無ければ当月で代用）
  const nextSales = planMonths.map((_, i) =>
    i + 1 < n
      ? sales[i + 1]
      : (p.monthlyPlans.find((m) => m.yearMonth > planMonths[n - 1])?.salesPlan ?? sales[i])
  );
  // 各月の在庫月数目標（simオーバーライド ＞ 方式別既定）
  const targetMonthsAt = (i: number): number => {
    const sim = simForProduct?.get(planMonths[i]);
    if (sim) return sim.targetInventoryMonths;
    return targetMonthsForMethod(p.productionMethod, policy.standardMonths, policy.minMonths);
  };

  // ── 1) 生産必要数（目標）を方式別に算出。prevInv を「必要分だけ生産」で連鎖 ──
  const required: number[] = new Array(n).fill(0);
  const cycle = Math.max(1, Math.round(policy.cycleMonths));
  {
    let prevInv = p.lastMonthInventory;
    for (let i = 0; i < n; i++) {
      let need = 0;
      if (letter === "C") {
        // 定期まとめ生産：生産月だけ、次サイクルまでの販売＋目標バッファをまとめて
        if (i % cycle === 0) {
          const end = Math.min(i + cycle, n);
          const coverSum = sales.slice(i, end).reduce((s, v) => s + v, 0);
          const cycleEndNext = end < n ? sales[end] : nextSales[n - 1];
          const buffer = Math.round(targetMonthsAt(i) * cycleEndNext);
          need = Math.max(0, coverSum + buffer - prevInv);
        }
      } else if (letter === "D") {
        // 受注・在庫なし：販売分だけ（前月末在庫があれば取り崩し）
        need = Math.max(0, sales[i] - prevInv);
      } else {
        // A / B：在庫月数目標を満たす
        const targetQty = Math.round(targetMonthsAt(i) * nextSales[i]);
        need = Math.max(0, targetQty + sales[i] - prevInv);
      }
      required[i] = need;
      prevInv = prevInv + need - sales[i];
    }
  }

  // ── 2) 実生産量。A/Bは3ヶ月ローリング平均で平準化、C/Dは平準化せず必要分 ──
  let production: number[];
  if (letter === "A" || letter === "B") {
    const rates = required.map((_, i) => {
      const end = Math.min(i + 3, n);
      const reqSum = required.slice(i, end).reduce((s, v) => s + v, 0);
      const daySum = opDays.slice(i, end).reduce((s, d) => s + d, 0);
      return daySum > 0 ? reqSum / daySum : 0;
    });
    production = required.map((req, i) => {
      const rounded = Math.round(rates[i] * opDays[i]);
      // 必要生産がある場合は最低1パレット保証
      return rounded === 0 && req > 0 ? pallet : toPallet(rounded);
    });
  } else {
    production = required.map((req) => (req <= 0 ? 0 : Math.max(pallet, toPallet(req))));
  }

  // ── 3) 月末在庫・在庫月数・日量を連鎖算出 ──
  const result = new Map<number, LeveledPlan>();
  let prevInv = p.lastMonthInventory;
  planMonths.forEach((ym, i) => {
    const productionSchedule = production[i];
    const salesPlan = sales[i];
    const surplusDeficit = productionSchedule - required[i];
    const planAdjustment = surplusDeficit < 0 ? Math.abs(surplusDeficit) : 0;
    const monthEndInventory = prevInv + productionSchedule - salesPlan;
    const monthEndInventoryMonths =
      salesPlan > 0 ? parseFloat((monthEndInventory / salesPlan).toFixed(1)) : 0;
    const dailyQuantity = opDays[i] > 0 ? Math.round(productionSchedule / opDays[i]) : 0;

    result.set(ym, {
      yearMonth: ym,
      salesPlan,
      targetInventoryMonths: targetMonthsAt(i),
      productionSchedule,
      requiredProduction: required[i],
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
  const standardMonths      = useMasterStore((s) => s.defaultTargetInventoryMonths);
  const minMonths           = useMasterStore((s) => s.minTargetInventoryMonths);
  const cycleMonths         = useMasterStore((s) => s.productionCycleMonths);

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
      result.set(key, buildLeveledPlanForProduct(vp, planMonths, opDaysCount, overrideMap, simInputsMap, { standardMonths, minMonths, cycleMonths }));
    });
    return result;
  }, [planMonths, prevMonth, productMasters, inventorySnapshots, opDaysCount, overrideMap, simInputsMap, standardMonths, minMonths, cycleMonths]);
}
