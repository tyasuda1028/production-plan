import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "生産計画システム",
  description: "中小製造業向け 生産計画管理システム",
};

// Clerk の公開キーが設定されているときだけ認証を有効化する。
// 未設定（ローカル開発など）の場合は ClerkProvider を挟まず認証なしで動作。
const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shell = <AppShell>{children}</AppShell>;
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {clerkEnabled ? <ClerkProvider>{shell}</ClerkProvider> : shell}
      </body>
    </html>
  );
}
