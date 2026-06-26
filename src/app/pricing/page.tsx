import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import NativeRedirect from "@/components/NativeRedirect";
import SubscribeButton from "@/components/SubscribeButton";

export const metadata = {
  title: "料金プラン｜スマコウバ計画",
  description: "スマコウバ計画の料金プラン（スタンダード／ビジネス／プレミアム）",
};

const TIERS: {
  name: string;
  monthly: string;
  yearly: string;
  target: string;
  features: string[];
  highlight: boolean;
}[] = [
  {
    name: "スタンダード",
    monthly: "¥29,800",
    yearly: "¥298,000",
    target: "単一工場・10〜50名／Excel脱却の第一歩",
    features: [
      "1拠点・ユーザー数無制限",
      "生産計画立案・日割りスケジュール",
      "部材調達計画（MRP）・手配計画",
      "CSV入出力・印刷（PDF）",
    ],
    highlight: false,
  },
  {
    name: "ビジネス",
    monthly: "¥59,800",
    yearly: "¥598,000",
    target: "複数ライン・30〜150名／欠品を事前に回避",
    features: [
      "最大3拠点・ユーザー数無制限",
      "スタンダードの全機能",
      "需給シミュレーション・多ライン協調",
      "調達先ごとの手配計画を印刷（PDF）",
    ],
    highlight: true,
  },
  {
    name: "プレミアム",
    monthly: "¥99,800",
    yearly: "¥998,000",
    target: "多拠点・計画高度化が必要な企業",
    features: [
      "最大10拠点・ユーザー数無制限",
      "ビジネスの全機能",
      "拠点横断の需給最適化",
      "優先サポート（メール）",
    ],
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-800">
      {/* ネイティブ(iOS)では料金ページを表示しない（App Store 3.1.1：外部課金導線を出さない） */}
      <NativeRedirect to="/login" />
      <div className="max-w-5xl mx-auto px-5 py-10">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <BrandMark size={52} className="mx-auto mb-3 rounded-2xl shadow" />
          <h1 className="text-2xl font-bold text-gray-900">スマコウバ計画 料金プラン</h1>
          <p className="text-sm text-gray-500 mt-2">
            販売計画と在庫から、生産計画・日割りスケジュール・部材手配までを自動化。
            <br className="hidden sm:block" />
            まずは<strong>30日間の無料トライアル</strong>でお試しください（クレジットカード不要）。
          </p>
          <p className="text-xs text-gray-400 mt-2">価格はすべて税別。年額は月額比 約17%お得（2ヶ月分無料）。</p>
        </div>

        {/* ティア */}
        <div className="grid gap-5 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl border bg-white p-6 flex flex-col ${
                t.highlight ? "border-blue-500 shadow-md ring-1 ring-blue-200" : "border-gray-200 shadow-sm"
              }`}
            >
              {t.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                  おすすめ
                </span>
              )}
              <h2 className="text-base font-bold text-gray-900">{t.name}</h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed min-h-[2.5rem]">{t.target}</p>
              <div className="mt-4">
                <div className="text-2xl font-bold text-gray-900">
                  {t.monthly}
                  <span className="text-sm font-normal text-gray-400"> / 月</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">年額 {t.yearly}</div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-gray-700 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {t.name === "スタンダード" ? (
                <div className="mt-6 flex flex-col gap-2">
                  <SubscribeButton plan="standard_monthly" label="月額でカード申し込み" />
                  <SubscribeButton
                    plan="standard_yearly"
                    label="年額（2ヶ月分お得）"
                    className="block w-full text-center rounded-lg border border-blue-600 px-4 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-60"
                  />
                  <span className="text-center text-[11px] text-gray-400">クレジットカード決済・いつでも解約可</span>
                </div>
              ) : (
                <Link
                  href="/contact"
                  className={`mt-6 block text-center rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    t.highlight
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  お問い合わせ・お申し込み
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* 補足 */}
        <div className="mt-8 bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-600 space-y-2">
          <p>・お支払いは<strong>クレジットカード決済</strong>に対応しています。</p>
          <p>・サポートは<strong>メール</strong>で承ります（平日日中の電話・訪問でのご対応はいたしかねます。順次ご返信します）。</p>
          <p>・ご利用には登録が必要です。導入のご相談はお気軽にお問い合わせください。</p>
        </div>

        {/* フッターリンク */}
        <div className="mt-8 text-center text-xs text-gray-400 space-x-4">
          <Link href="/" className="text-blue-600 hover:underline">スマコウバ計画</Link>
          <Link href="/support" className="text-blue-600 hover:underline">サポート</Link>
          <Link href="/privacy" className="text-blue-600 hover:underline">プライバシーポリシー</Link>
        </div>
        <p className="text-center text-[11px] text-gray-400 mt-3">運営：スマコウバ運営事務局</p>
      </div>
    </main>
  );
}
