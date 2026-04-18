import { NextRequest, NextResponse } from "next/server";
import { products, planMonths } from "@/lib/data";

// CORS ヘッダー（truck-loaderからのアクセスを許可）
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://tyasuda1028-truck-loader.vercel.app",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ymParam = searchParams.get("ym");
  const targetYM = ymParam ? parseInt(ymParam) : planMonths[0];

  // 製品マスター（デフォルトデータから生成）
  const exportProducts = products.map((p) => ({
    code: p.manufacturingItemCode,
    name: p.productName,
    capacityPerPallet: 20,
    palletType: "P01",
    factoryCode: "F001",
    primaryLine: p.primaryLine,
  }));

  // 生産計画（対象月）
  const productionPlan: Record<string, number> = {};
  products.forEach((p) => {
    const mp = p.monthlyPlans.find((m) => m.yearMonth === targetYM);
    if (mp) productionPlan[p.manufacturingItemCode] = mp.productionSchedule;
  });

  // 在庫
  const inventoryStock: Record<string, number> = {};
  products.forEach((p) => {
    inventoryStock[p.manufacturingItemCode] = p.totalInventory;
  });

  const data = {
    exportedAt: new Date().toISOString(),
    sourceApp: "production-plan",
    targetYearMonth: targetYM,
    products: exportProducts,
    productionPlan,
    inventoryStock,
  };

  return NextResponse.json(data, {
    headers: CORS_HEADERS,
  });
}
