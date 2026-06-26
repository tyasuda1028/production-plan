"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsNative } from "@/lib/native";

/**
 * ネイティブ(iOS)アプリで開かれた場合に指定先へリダイレクト。
 * 3.1.1対応：料金/申込ページはネイティブから到達させない（Webでは通常表示）。
 */
export default function NativeRedirect({ to = "/login" }: { to?: string }) {
  const native = useIsNative();
  const router = useRouter();
  useEffect(() => {
    if (native) router.replace(to);
  }, [native, router, to]);
  return null;
}
