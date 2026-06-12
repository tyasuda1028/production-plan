import { useMemo } from 'react';
import { useMasterStore } from './masterStore';
import { useLeveledPlans } from './useLeveledPlans';
import { getPlanMonths } from './data';
import { MaterialMaster, BomLine, MaterialStock } from './masterTypes';

/**
 * MRP（資材所要量計算）
 * ------------------------------------------------------------
 * 総所要量 = Σ(製品の月次生産計画 × BOM員数)
 * 在庫引当て：部材在庫を月順に引き当て、足りない分が正味所要量（発注すべき量）。
 * 入荷は正味所要どおり当月調達される前提（リードタイム・ロット丸めは将来拡張）。
 */
export interface MrpRow {
  material: MaterialMaster;
  startStock: number;            // 引当て開始時点の在庫
  gross: Map<number, number>;    // 月 → 総所要量
  net: Map<number, number>;      // 月 → 正味所要量（在庫引当て後）
  remain: Map<number, number>;   // 月 → 引当て後の残在庫
}

/** 純粋関数版（スタンドアロン検証用に分離） */
export function calcMrp(
  months: number[],
  production: Map<string, Map<number, number>>, // productId → (月 → 生産数)
  bomLines: BomLine[],
  materials: MaterialMaster[],
  stocks: MaterialStock[]
): MrpRow[] {
  const materialMap = new Map(materials.map((m) => [m.code, m]));
  const stockMap = new Map(stocks.map((s) => [s.materialCode, s.quantity]));

  // 総所要量を部材ごとに集計（製品が存在するBOM行のみ）
  const grossByMaterial = new Map<string, Map<number, number>>();
  bomLines.forEach((line) => {
    const prodMonths = production.get(line.productId);
    if (!prodMonths) return;
    let g = grossByMaterial.get(line.materialCode);
    if (!g) { g = new Map(); grossByMaterial.set(line.materialCode, g); }
    months.forEach((ym) => {
      const qty = (prodMonths.get(ym) ?? 0) * line.qtyPer;
      if (qty > 0) g!.set(ym, (g!.get(ym) ?? 0) + qty);
    });
  });

  // 対象部材 = BOMに登場 or 在庫あり（マスター登録済みのもの）
  const codes = new Set<string>([...grossByMaterial.keys(), ...stockMap.keys()]);

  const rows: MrpRow[] = [];
  Array.from(codes).sort().forEach((code) => {
    const material = materialMap.get(code);
    if (!material) return; // マスター未登録はスキップ
    const grossSrc = grossByMaterial.get(code) ?? new Map<number, number>();
    const startStock = stockMap.get(code) ?? 0;

    const gross = new Map<number, number>();
    const net = new Map<number, number>();
    const remain = new Map<number, number>();
    let avail = startStock;
    months.forEach((ym) => {
      const g = Math.ceil(grossSrc.get(ym) ?? 0);
      const use = Math.min(avail, g);
      const n = g - use;
      avail -= use;
      gross.set(ym, g);
      net.set(ym, n);
      remain.set(ym, avail);
    });

    rows.push({ material, startStock, gross, net, remain });
  });

  return rows;
}

/** 生産計画（useLeveledPlans）とBOM・在庫からMRPを算出するフック */
export function useMrp(): { months: number[]; rows: MrpRow[] } {
  const planBaseMonth   = useMasterStore((s) => s.planBaseMonth);
  const bomLines        = useMasterStore((s) => s.bomLines);
  const materialMasters = useMasterStore((s) => s.materialMasters);
  const materialStocks  = useMasterStore((s) => s.materialStocks);
  const leveledPlansMap = useLeveledPlans();

  const months = useMemo(() => getPlanMonths(planBaseMonth), [planBaseMonth]);

  const rows = useMemo(() => {
    // useLeveledPlans の productionSchedule を productId → (月 → 生産数) に変換
    const production = new Map<string, Map<number, number>>();
    leveledPlansMap.forEach((monthMap, productId) => {
      const m = new Map<number, number>();
      monthMap.forEach((lp, ym) => m.set(ym, lp.productionSchedule));
      production.set(productId, m);
    });
    return calcMrp(months, production, bomLines, materialMasters, materialStocks);
  }, [months, leveledPlansMap, bomLines, materialMasters, materialStocks]);

  return { months, rows };
}
