import ScheduleView from "@/components/schedule/ScheduleView";

export default function SchedulePage() {
  return (
    <div className="p-6 max-w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">日割りスケジュール</h1>
        <p className="text-sm text-gray-500 mt-1">
          2026年5月度 品目別・日次生産割付
        </p>
      </div>
      <ScheduleView />
    </div>
  );
}
