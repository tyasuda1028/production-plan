import React from "react";

/**
 * スマコウバ計画 のブランドマーク（太い白い「ス」＋カレンダーの線画）。
 * スマコウバ積載（ス＋トラック）と同コンセプト＝アプリアイコンと同じ構図。
 * アプリ内ロゴ・印刷ヘッダーで共通利用する。
 * - 既定：青グラデ(インディゴ→青→シアン)の角丸四角＋白マーク
 * - mono：背景なし・ブランド色の線のみ（印刷向け＝白紙でも確実に出る）
 */
export default function BrandMark({
  size = 32,
  mono = false,
  className,
}: {
  size?: number;
  mono?: boolean;
  className?: string;
}) {
  const fg = mono ? "#2563eb" : "#ffffff";
  const font = "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      className={className}
      role="img"
      aria-label="スマコウバ計画"
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      {!mono && (
        <>
          <defs>
            <linearGradient id="brandmark-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#6366f1" />
              <stop offset="1" stopColor="#818cf8" />
            </linearGradient>
          </defs>
          <rect width="1024" height="1024" rx="220" fill="url(#brandmark-bg)" />
        </>
      )}
      {/* 太いカタカナ「ス」 */}
      <text
        x="512"
        y="690"
        textAnchor="middle"
        fontFamily={font}
        fontWeight="900"
        fontSize="620"
        fill={fg}
      >
        ス
      </text>
      {/* 右下：カレンダーの線画 */}
      <g
        transform="translate(674 664) scale(9.583)"
        fill="none"
        stroke={fg}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
        <path d="M7 14l2.5 2.5L14 12" />
      </g>
    </svg>
  );
}
