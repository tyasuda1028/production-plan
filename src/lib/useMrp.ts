import { useMemo } from 'react';
import { useMasterStore } from './masterStore';
import { useLeveledPlans } from './useLeveledPlans';
import { getPlanMonths } from './data';
import { MaterialMaster, BomLine, MaterialStock } from './masterTypes';

/**
 * MRP（資材所要量計算・多階層BOM対応）
 * ------------------------------------------------------------
 * - Lv0 = 製品（月次生産計画）、Lv1以降 = 部材。部材が親（半製品）にもなれる
 * - 総所要量 = Σ(親の生産/内製数量 × 投入量 qtyPer)  ※歩留まり込みの投入ベース
 * - 在庫引当て：部材在庫を月順に引き当て、足りない分が正味所要量
 *   （購入品＝発注すべき量、半製品＝内製すべき量）
 * - 半製品の正味所要量（内製量）が、その子部材の総所要量を駆動する
 *   （ローレベルコード方式：レベル昇順に展開）
 * - 循環BOMは計算から除外（登録時にも wouldCreateBomCycle で拒否）
 */
export interface MrpRow {
  material: MaterialMaster;
  level: number;                 // 部材レベル（製品直下=1）
  isSubAssembly: boolean;        // 半製品（自身がBOMの親）か
  startStock: number;            // 引当て開始時点の在庫
  gross: Map<number, number>;    // 月 → 総所要量（投入ベース）
  net: Map<number, number>;      // 月 → 正味所要量（在庫引当て後）
  remain: Map<number, number>;   // 月 → 引当て後の残在庫
}

/**
 * parentId の配下に childCode を追加すると循環になるか。
 * （childCode の構成を辿って parentId に到達するなら true。自分自身も true）
 */
export function wouldCreateBomCycle(parentId: string, childCode: string, bomLines: BomLine[]): boolean {
  if (parentId === childCode) return true;
  const childrenOf = new Map<string, string[]>();
  bomLines.forEach((b) => {
    if (!childrenOf.has(b.productId)) childrenOf.set(b.productId, []);
    childrenOf.get(b.productId)!.push(b.materialCode);
  });
  const visited = new Set<string>();
  const stack = [childCode];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (cur === parentId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    (childrenOf.get(cur) ?? []).forEach((c) => stack.push(c));
  }
  return false;
}

/** 純粋関数版（スタンドアロン検証用に分離） */
export function calcMrp(
  months: number[],
  production: Map<string, Map<number, number>>, // 製品ID → (月 → 生産数)
  bomLines: BomLine[],
  materials: MaterialMaster[],
  stocks: MaterialStock[]
): MrpRow[] {
  const materialMap = new Map(materials.map((m) => [m.code, m]));
  const stockMap = new Map(stocks.map((s) => [s.materialCode, s.quantity]));
  const materialCodes = new Set(materials.map((m) => m.code));
  const parentCodes = new Set(bomLines.map((b) => b.productId));

  // ── 部材レベル計算（製品親=0として、部材レベル=全親レベルの最大+1）──
  // 反復で収束させる。部材数+1回で打ち切り＝循環している行は除外する
  const level = new Map<string, number>();
  bomLines.forEach((b) => {
    if (production.has(b.productId) && materialCodes.has(b.materialCode)) {
      level.set(b.materialCode, 1);
    }
  });
  const maxIter = materialCodes.size + 1;
  for (let i = 0; i < maxIter; i++) {
    let changed = false;
    bomLines.forEach((b) => {
      const parentLv = level.get(b.productId);
      if (parentLv === undefined || !materialCodes.has(b.materialCode)) return;
      const newLv = parentLv + 1;
      if (newLv > maxIter) return; // 循環ガード
      if ((level.get(b.materialCode) ?? 0) < newLv) {
        level.set(b.materialCode, newLv);
        changed = true;
      }
    });
    if (!changed) break;
  }
  // 循環でレベルが膨張した部材（maxIter超え相当）は対象から外す
  const validLevel = new Map([...level].filter(([, lv]) => lv <= maxIter));

  // ── レベル昇順に総所要量を伝播 ──
  const gross = new Map<string, Map<number, number>>(); // 部材 → 月 → 総所要量
  const addGross = (code: string, ym: number, qty: number) => {
    let g = gross.get(code);
    if (!g) { g = new Map(); gross.set(code, g); }
    g.set(ym, (g.get(ym) ?? 0) + qty);
  };

  // Lv0（製品需要）→ 直下の部材
  bomLines.forEach((b) => {
    const prodMonths = production.get(b.productId);
    if (!prodMonths || !validLevel.has(b.materialCode)) return;
    months.forEach((ym) => {
      const qty = (prodMonths.get(ym) ?? 0) * b.qtyPer;
      if (qty > 0) addGross(b.materialCode, ym, qty);
    });
  });

  // 対象部材 = BOMに登場（有効レベル） or 在庫あり
  const codes = new Set<string>([...validLevel.keys(), ...stockMap.keys()]);
  const sorted = Array.from(codes)
    .filter((c) => materialMap.has(c))
    .sort((a, b) => {
      const la = validLevel.get(a) ?? 99;
      const lb = validLevel.get(b) ?? 99;
      return la !== lb ? la - lb : a.localeCompare(b);
    });

  const rows: MrpRow[] = [];
  sorted.forEach((code) => {
    const material = materialMap.get(code)!;
    const grossSrc = gross.get(code) ?? new Map<number, number>();
    const startStock = stockMap.get(code) ?? 0;
    const isSubAssembly = parentCodes.has(code);

    const grossOut = new Map<number, number>();
    const net = new Map<number, number>();
    const remain = new Map<number, number>();
    let avail = startStock;
    months.forEach((ym) => {
      const g = Math.ceil(grossSrc.get(ym) ?? 0);
      const use = Math.min(avail, g);
      const n = g - use;
      avail -= use;
      grossOut.set(ym, g);
      net.set(ym, n);
      remain.set(ym, avail);
    });

    // 半製品：正味所要量（内製量）を子部材の総所要量へ伝播
    // （sorted はレベル昇順なので、子は必ずこの後に処理される）
    if (isSubAssembly) {
      bomLines.forEach((b) => {
        if (b.productId !== code || !validLevel.has(b.materialCode)) return;
        months.forEach((ym) => {
          const qty = (net.get(ym) ?? 0) * b.qtyPer;
          if (qty > 0) addGross(b.materialCode, ym, qty);
        });
      });
    }

    rows.push({
      material,
      level: validLevel.get(code) ?? 0,
      isSubAssembly,
      startStock,
      gross: grossOut,
      net,
      remain,
    });
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
