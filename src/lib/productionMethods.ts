/**
 * 生産方式（A〜D）の定義を一元管理する。
 * ここでの定義によって「在庫の持ち方（生産必要数の計算）」が変わる：
 *  - A 最小在庫（高回転）: 在庫を最小限（最小在庫月数）に抑える
 *  - B 在庫保有        : 在庫月数目標どおり（標準）
 *  - C 計画生産（定期）: 在庫月数目標を保ちつつ定期的にまとめて生産
 *  - D 受注生産        : 在庫を持たない（生産＝販売、目標0）
 *
 * 計算・色・正規化はすべて「先頭文字（A/B/C/D）」基準。
 * そのため既存の保存値（例 "B:在庫製品"）はそのままで動く。
 */
export type MethodKey = 'A' | 'B' | 'C' | 'D';

export interface MethodDef {
  key: MethodKey;
  label: string;
  desc: string;
  color: string;
}

export const PRODUCTION_METHODS: MethodDef[] = [
  { key: 'A', label: 'A:最小在庫（高回転）', desc: '高回転率。在庫を最小限（最小在庫月数）に抑える。',     color: 'bg-green-50 text-green-700' },
  { key: 'B', label: 'B:在庫保有',           desc: '在庫月数目標どおりの在庫を持つ（標準）。',           color: 'bg-blue-50 text-blue-700' },
  { key: 'C', label: 'C:計画生産（定期）',   desc: '在庫月数目標を保ちつつ、定期的にまとめて生産する。', color: 'bg-amber-50 text-amber-700' },
  { key: 'D', label: 'D:受注生産',           desc: '受注生産のため在庫を持たない（生産＝販売）。',       color: 'bg-purple-50 text-purple-700' },
];

const KEYS: string[] = ['A', 'B', 'C', 'D'];

/** 方式文字列の先頭文字から MethodKey を得る（不明は B にフォールバック） */
export function methodLetter(s: string): MethodKey {
  const c = (s ?? '').charAt(0).toUpperCase();
  return (KEYS.includes(c) ? c : 'B') as MethodKey;
}

export function methodDef(s: string): MethodDef {
  const key = methodLetter(s);
  return PRODUCTION_METHODS.find((m) => m.key === key) ?? PRODUCTION_METHODS[1];
}

/** 方式の正式ラベルへ正規化（表記ゆれ・先頭文字のみ等を吸収） */
export function normalizeMethod(s: string): string {
  return methodDef(s).label;
}

/** セレクトボックス等で使う全ラベル */
export const METHOD_LABELS: string[] = PRODUCTION_METHODS.map((m) => m.label);

/**
 * 方式別の在庫月数目標。
 *  A=最小, D=0, B/C=標準
 */
export function targetMonthsForMethod(s: string, standard: number, minimal: number): number {
  switch (methodLetter(s)) {
    case 'A': return minimal;
    case 'D': return 0;
    default:  return standard; // B, C
  }
}
