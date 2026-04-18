import SimulationView from "@/components/simulation/SimulationView";

export default function SimulatePage() {
  return (
    <div className="p-6 max-w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">生産計画シミュレーション</h1>
        <p className="text-sm text-gray-500 mt-1">
          月ごとに在庫月数目標を調整すると、生産必要数が自動計算されます（先6ヶ月連鎖推移）
        </p>
      </div>
      <SimulationView />
    </div>
  );
}
