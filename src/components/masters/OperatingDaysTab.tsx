"use client";

import { useState } from "react";
import { useMasterStore } from "@/lib/masterStore";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [202603, 202604, 202605, 202606, 202607, 202608, 202609, 202610, 202611, 202612];
const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function ym2label(ym: number) {
  const s = String(ym);
  return `${s.slice(0, 4)}年${s.slice(4)}月`;
}

export default function OperatingDaysTab() {
  const { operatingDays, toggleOperatingDay, setOperatingDays } = useMasterStore();
  const [selectedYM, setSelectedYM] = useState(202605);

  const year = Math.floor(selectedYM / 100);
  const month = selectedYM % 100;
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();

  const current = operatingDays.find((o) => o.yearMonth === selectedYM);
  const opDates = new Set(current?.operatingDates ?? []);
  const opCount = opDates.size;

  function prevMonth() {
    const idx = MONTHS.indexOf(selectedYM);
    if (idx > 0) setSelectedYM(MONTHS[idx - 1]);
  }
  function nextMonth() {
    const idx = MONTHS.indexOf(selectedYM);
    if (idx < MONTHS.length - 1) setSelectedYM(MONTHS[idx + 1]);
  }

  // 一括：平日のみに設定
  function setWeekdaysOnly() {
    const dates: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (dow !== 0 && dow !== 6) dates.push(d);
    }
    setOperatingDays(selectedYM, dates);
  }

  // 一括：全日稼働
  function setAllDays() {
    const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    setOperatingDays(selectedYM, dates);
  }

  // 一括：クリア
  function clearAll() {
    setOperatingDays(selectedYM, []);
  }

  // カレンダーグリッド生成
  const calCells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calCells.length % 7 !== 0) calCells.push(null);

  return (
    <div className="space-y-4">
      {/* 月ナビゲーション */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-gray-800 w-32 text-center">{ym2label(selectedYM)}</span>
        <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="flex gap-2 ml-4">
          <button onClick={setWeekdaysOnly}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50">
            平日のみ
          </button>
          <button onClick={setAllDays}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50">
            全日稼働
          </button>
          <button onClick={clearAll}
            className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded hover:bg-red-50">
            クリア
          </button>
        </div>

        <div className="ml-auto text-sm font-semibold text-blue-700">
          稼働日数：<span className="text-xl">{opCount}</span> 日
        </div>
      </div>

      {/* カレンダー */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-sm">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DOW_LABELS.map((d, i) => (
            <div key={d} className={`text-center text-xs font-medium py-1 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-500"}`}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calCells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;
            const isOp = opDates.has(day);
            const dow = (firstDow + day - 1) % 7;
            const isSun = dow === 0;
            const isSat = dow === 6;
            return (
              <button
                key={day}
                onClick={() => toggleOperatingDay(selectedYM, day)}
                className={`w-full aspect-square rounded text-xs font-medium transition-colors flex items-center justify-center
                  ${isOp
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : isSun
                    ? "text-red-400 hover:bg-red-50"
                    : isSat
                    ? "text-blue-400 hover:bg-blue-50"
                    : "text-gray-400 hover:bg-gray-100"
                  }`}
              >
                {day}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-blue-600 inline-block" />稼働日
          </span>
          <span>クリックで切り替え</span>
        </div>
      </div>

      {/* 月一覧サマリー */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">年月</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">稼働日数</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">稼働日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {MONTHS.map((ym) => {
              const rec = operatingDays.find((o) => o.yearMonth === ym);
              const cnt = rec?.operatingDates.length ?? 0;
              return (
                <tr key={ym}
                  className={`cursor-pointer hover:bg-gray-50 ${selectedYM === ym ? "bg-blue-50" : ""}`}
                  onClick={() => setSelectedYM(ym)}>
                  <td className="px-4 py-2.5 text-xs font-medium text-gray-700">{ym2label(ym)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`text-sm font-semibold ${cnt === 0 ? "text-gray-300" : "text-blue-700"}`}>{cnt}</span>
                    <span className="text-xs text-gray-400 ml-1">日</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">
                    {rec?.operatingDates.slice(0, 10).join(", ")}{(rec?.operatingDates.length ?? 0) > 10 ? "..." : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
