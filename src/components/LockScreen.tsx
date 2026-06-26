"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import BrandMark from "@/components/BrandMark";
import SubscribeButton from "@/components/SubscribeButton";

/**
 * トライアル終了（未契約）の Web ロック画面。
 * Standard はカード決済で即再開、上位プランはお問い合わせ。
 * ※ ネイティブ(iOS)では表示しない（呼び出し側で native を除外。App Store 3.1.1）。
 */
export default function LockScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <BrandMark size={56} className="mb-4 rounded-2xl shadow" />
      <h1 className="text-xl font-bold text-gray-900">30日間の無料トライアルが終了しました</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-600">
        引き続きスマコウバ計画をご利用いただくには、ご契約が必要です。
        Standard プランはカード決済ですぐにご利用を再開できます（保存済みのデータは保持されています）。
      </p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
        <SubscribeButton plan="standard_monthly" label="Standard 月額で申し込む（カード）" />
        <SubscribeButton
          plan="standard_yearly"
          label="Standard 年額（2ヶ月分お得）"
          className="block w-full text-center rounded-lg border border-blue-600 px-4 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-60"
        />
      </div>
      <div className="mt-4 flex flex-col items-center gap-1 text-sm">
        <Link href="/pricing" className="text-blue-600 underline">料金プランを見る</Link>
        <Link href="/contact" className="text-xs text-gray-500 underline">上位プラン・お見積りのお問い合わせ</Link>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="mt-1 text-xs text-gray-400 underline">別のアカウントでログイン</button>
      </div>
    </div>
  );
}
