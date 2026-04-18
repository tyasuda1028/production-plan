"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { LayoutDashboard, Table2, CalendarDays, Factory, FlaskConical, Settings } from "lucide-react";

const navItems: { href: string; label: string; icon: React.ElementType; badge?: string; divider?: boolean }[] = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/plan", label: "生産計画表", icon: Table2 },
  { href: "/schedule", label: "日割りスケジュール", icon: CalendarDays },
  { href: "/simulate", label: "生産計画立案", icon: FlaskConical, badge: "NEW" },
  { href: "/masters", label: "マスター設定", icon: Settings, divider: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-200">
        <Factory className="w-6 h-6 text-blue-600" />
        <span className="font-bold text-gray-800 text-sm leading-tight">
          生産計画<br />
          <span className="text-xs text-gray-500 font-normal">ブライツ</span>
        </span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon, badge, divider }) => {
          const active = pathname === href;
          return (
            <React.Fragment key={href}>
            {divider && <div className="border-t border-gray-100 my-1" />}
            <Link
              key={`link-${href}`}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">
                  {badge}
                </span>
              )}
            </Link>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">2026年3月度 計画</p>
      </div>
    </aside>
  );
}
