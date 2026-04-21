import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import HydrationGuard from "@/components/HydrationGuard";

export const metadata: Metadata = {
  title: "生産計画システム",
  description: "ブライツ 生産計画管理アプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <HydrationGuard>
              {children}
            </HydrationGuard>
          </main>
        </div>
      </body>
    </html>
  );
}
