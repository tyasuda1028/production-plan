"use client";

import { SignIn } from "@clerk/nextjs";
import { Factory } from "lucide-react";

export default function LoginForm() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      {/* ロゴ・タイトル（汎用ブランディング） */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow">
          <Factory className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">生産計画システム</h1>
        <p className="text-sm text-gray-400 mt-1">Production Planning System</p>
      </div>

      {/* Clerk のサインインフォーム（招待制では Restricted モードによりサインアップは自動的に非表示） */}
      <SignIn
        routing="hash"
        appearance={{
          elements: {
            rootBox: "w-full flex justify-center",
            card: "shadow-sm border border-gray-200",
          },
        }}
      />

      <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
        アカウントの発行は担当者にお問い合わせください
      </p>
    </div>
  );
}
