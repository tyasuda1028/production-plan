import PlanTable from "@/components/plan/PlanTable";

export default function PlanPage() {
  return (
    <div className="p-6 max-w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">生産計画表</h1>
        <p className="text-sm text-gray-500 mt-1">
          品目別・月次の販売計画・生産計画・在庫状況を管理します
        </p>
      </div>
      <PlanTable />
    </div>
  );
}
