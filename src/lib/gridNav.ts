/**
 * グリッド入力のキーボードナビゲーション。
 * 各セルの input に data-row / data-col を付与し、onKeyDown でこれを呼ぶ。
 * Enter = 下のセルへ、Shift+Enter = 上のセルへ（移動先は全選択）。
 * blur が先に走るため、既存の onBlur 保存パターンとそのまま両立する。
 */
export function handleGridKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  row: number,
  col: number | string
) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const nextRow = e.shiftKey ? row - 1 : row + 1;
  const root = (e.target as HTMLInputElement).closest('table') ?? document;
  const next = root.querySelector<HTMLInputElement>(
    `input[data-row="${nextRow}"][data-col="${col}"]`
  );
  if (next) {
    next.focus();
    next.select();
  } else {
    (e.target as HTMLInputElement).blur(); // 端なら確定だけ
  }
}
