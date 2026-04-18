import { LineSummary, Product } from "./types";

const MONTHS = [202602, 202603, 202604, 202605, 202606, 202607, 202608, 202609, 202610];

export const lineSummaries: LineSummary[] = [
  {
    lineCode: "ブライツ",
    factoryCode: "02",
    lines: [2, 3, 4, 7],
    dailyCapacity: 1145,
    monthly: [
      { yearMonth: 202602, operatingDays: 18, prevSalesPlan: 15200, currSalesPlan: 15800, productionCapacity: 20610, prevProductionPlan: 16000, currProductionPlan: 16500, prevMonthEndInventory: 28000, currMonthEndInventory: 27300, prevInventoryMonths: 1.8, currInventoryMonths: 1.7 },
      { yearMonth: 202603, operatingDays: 20, prevSalesPlan: 17500, currSalesPlan: 17200, productionCapacity: 22900, prevProductionPlan: 17800, currProductionPlan: 17500, prevMonthEndInventory: 27800, currMonthEndInventory: 27100, prevInventoryMonths: 1.6, currInventoryMonths: 1.6 },
      { yearMonth: 202604, operatingDays: 19, prevSalesPlan: 16800, currSalesPlan: 17100, productionCapacity: 21755, prevProductionPlan: 17000, currProductionPlan: 17200, prevMonthEndInventory: 27000, currMonthEndInventory: 27200, prevInventoryMonths: 1.6, currInventoryMonths: 1.6 },
      { yearMonth: 202605, operatingDays: 21, prevSalesPlan: 18200, currSalesPlan: 18500, productionCapacity: 24045, prevProductionPlan: 18500, currProductionPlan: 18800, prevMonthEndInventory: 26500, currMonthEndInventory: 27000, prevInventoryMonths: 1.5, currInventoryMonths: 1.5 },
      { yearMonth: 202606, operatingDays: 21, prevSalesPlan: 19000, currSalesPlan: 19200, productionCapacity: 24045, prevProductionPlan: 19200, currProductionPlan: 19500, prevMonthEndInventory: 26200, currMonthEndInventory: 27300, prevInventoryMonths: 1.4, currInventoryMonths: 1.4 },
      { yearMonth: 202607, operatingDays: 22, prevSalesPlan: 20000, currSalesPlan: 20500, productionCapacity: 25190, prevProductionPlan: 20000, currProductionPlan: 20500, prevMonthEndInventory: 26000, currMonthEndInventory: 27300, prevInventoryMonths: 1.3, currInventoryMonths: 1.3 },
      { yearMonth: 202608, operatingDays: 20, prevSalesPlan: 18500, currSalesPlan: 18800, productionCapacity: 22900, prevProductionPlan: 18800, currProductionPlan: 19000, prevMonthEndInventory: 26300, currMonthEndInventory: 27500, prevInventoryMonths: 1.4, currInventoryMonths: 1.5 },
      { yearMonth: 202609, operatingDays: 19, prevSalesPlan: 17200, currSalesPlan: 17500, productionCapacity: 21755, prevProductionPlan: 17500, currProductionPlan: 17800, prevMonthEndInventory: 26600, currMonthEndInventory: 27800, prevInventoryMonths: 1.5, currInventoryMonths: 1.6 },
      { yearMonth: 202610, operatingDays: 21, prevSalesPlan: 18800, currSalesPlan: 19000, productionCapacity: 24045, prevProductionPlan: 19000, currProductionPlan: 19200, prevMonthEndInventory: 27000, currMonthEndInventory: 28000, prevInventoryMonths: 1.5, currInventoryMonths: 1.5 },
    ],
  },
  {
    lineCode: "ブライツ#2",
    factoryCode: "02",
    lines: [2],
    dailyCapacity: 540,
    monthly: [
      { yearMonth: 202602, operatingDays: 18, prevSalesPlan: 7200, currSalesPlan: 7500, productionCapacity: 9720, prevProductionPlan: 7500, currProductionPlan: 7800, prevMonthEndInventory: 13000, currMonthEndInventory: 13300, prevInventoryMonths: 1.8, currInventoryMonths: 1.8 },
      { yearMonth: 202603, operatingDays: 20, prevSalesPlan: 8200, currSalesPlan: 8100, productionCapacity: 10800, prevProductionPlan: 8300, currProductionPlan: 8200, prevMonthEndInventory: 13100, currMonthEndInventory: 13400, prevInventoryMonths: 1.6, currInventoryMonths: 1.7 },
      { yearMonth: 202604, operatingDays: 19, prevSalesPlan: 7900, currSalesPlan: 8000, productionCapacity: 10260, prevProductionPlan: 8000, currProductionPlan: 8100, prevMonthEndInventory: 13200, currMonthEndInventory: 13500, prevInventoryMonths: 1.7, currInventoryMonths: 1.7 },
      { yearMonth: 202605, operatingDays: 21, prevSalesPlan: 8600, currSalesPlan: 8800, productionCapacity: 11340, prevProductionPlan: 8700, currProductionPlan: 8900, prevMonthEndInventory: 13500, currMonthEndInventory: 13600, prevInventoryMonths: 1.6, currInventoryMonths: 1.5 },
      { yearMonth: 202606, operatingDays: 21, prevSalesPlan: 9000, currSalesPlan: 9100, productionCapacity: 11340, prevProductionPlan: 9100, currProductionPlan: 9200, prevMonthEndInventory: 13600, currMonthEndInventory: 13700, prevInventoryMonths: 1.5, currInventoryMonths: 1.5 },
      { yearMonth: 202607, operatingDays: 22, prevSalesPlan: 9500, currSalesPlan: 9700, productionCapacity: 11880, prevProductionPlan: 9500, currProductionPlan: 9700, prevMonthEndInventory: 13800, currMonthEndInventory: 14000, prevInventoryMonths: 1.5, currInventoryMonths: 1.4 },
      { yearMonth: 202608, operatingDays: 20, prevSalesPlan: 8700, currSalesPlan: 8900, productionCapacity: 10800, prevProductionPlan: 8800, currProductionPlan: 9000, prevMonthEndInventory: 14000, currMonthEndInventory: 14100, prevInventoryMonths: 1.6, currInventoryMonths: 1.6 },
      { yearMonth: 202609, operatingDays: 19, prevSalesPlan: 8100, currSalesPlan: 8300, productionCapacity: 10260, prevProductionPlan: 8200, currProductionPlan: 8400, prevMonthEndInventory: 14200, currMonthEndInventory: 14300, prevInventoryMonths: 1.8, currInventoryMonths: 1.7 },
      { yearMonth: 202610, operatingDays: 21, prevSalesPlan: 8900, currSalesPlan: 9000, productionCapacity: 11340, prevProductionPlan: 9000, currProductionPlan: 9100, prevMonthEndInventory: 14400, currMonthEndInventory: 14500, prevInventoryMonths: 1.6, currInventoryMonths: 1.6 },
    ],
  },
  {
    lineCode: "ブライツ#3",
    factoryCode: "02",
    lines: [3],
    dailyCapacity: 330,
    monthly: [
      { yearMonth: 202602, operatingDays: 18, prevSalesPlan: 4400, currSalesPlan: 4500, productionCapacity: 5940, prevProductionPlan: 4500, currProductionPlan: 4600, prevMonthEndInventory: 8000, currMonthEndInventory: 8100, prevInventoryMonths: 1.8, currInventoryMonths: 1.8 },
      { yearMonth: 202603, operatingDays: 20, prevSalesPlan: 5000, currSalesPlan: 4900, productionCapacity: 6600, prevProductionPlan: 5100, currProductionPlan: 5000, prevMonthEndInventory: 8100, currMonthEndInventory: 8200, prevInventoryMonths: 1.6, currInventoryMonths: 1.7 },
      { yearMonth: 202604, operatingDays: 19, prevSalesPlan: 4800, currSalesPlan: 4900, productionCapacity: 6270, prevProductionPlan: 4900, currProductionPlan: 5000, prevMonthEndInventory: 8200, currMonthEndInventory: 8300, prevInventoryMonths: 1.7, currInventoryMonths: 1.7 },
      { yearMonth: 202605, operatingDays: 21, prevSalesPlan: 5200, currSalesPlan: 5300, productionCapacity: 6930, prevProductionPlan: 5300, currProductionPlan: 5400, prevMonthEndInventory: 8300, currMonthEndInventory: 8400, prevInventoryMonths: 1.6, currInventoryMonths: 1.6 },
      { yearMonth: 202606, operatingDays: 21, prevSalesPlan: 5500, currSalesPlan: 5600, productionCapacity: 6930, prevProductionPlan: 5600, currProductionPlan: 5700, prevMonthEndInventory: 8400, currMonthEndInventory: 8500, prevInventoryMonths: 1.5, currInventoryMonths: 1.5 },
      { yearMonth: 202607, operatingDays: 22, prevSalesPlan: 5800, currSalesPlan: 5900, productionCapacity: 7260, prevProductionPlan: 5800, currProductionPlan: 5900, prevMonthEndInventory: 8500, currMonthEndInventory: 8600, prevInventoryMonths: 1.5, currInventoryMonths: 1.5 },
      { yearMonth: 202608, operatingDays: 20, prevSalesPlan: 5300, currSalesPlan: 5400, productionCapacity: 6600, prevProductionPlan: 5400, currProductionPlan: 5500, prevMonthEndInventory: 8600, currMonthEndInventory: 8700, prevInventoryMonths: 1.6, currInventoryMonths: 1.6 },
      { yearMonth: 202609, operatingDays: 19, prevSalesPlan: 4900, currSalesPlan: 5000, productionCapacity: 6270, prevProductionPlan: 5000, currProductionPlan: 5100, prevMonthEndInventory: 8700, currMonthEndInventory: 8800, prevInventoryMonths: 1.8, currInventoryMonths: 1.8 },
      { yearMonth: 202610, operatingDays: 21, prevSalesPlan: 5400, currSalesPlan: 5500, productionCapacity: 6930, prevProductionPlan: 5500, currProductionPlan: 5600, prevMonthEndInventory: 8800, currMonthEndInventory: 8900, prevInventoryMonths: 1.6, currInventoryMonths: 1.6 },
    ],
  },
  {
    lineCode: "ブライツ#4",
    factoryCode: "02",
    lines: [4],
    dailyCapacity: 200,
    monthly: [
      { yearMonth: 202602, operatingDays: 18, prevSalesPlan: 2700, currSalesPlan: 2800, productionCapacity: 3600, prevProductionPlan: 2800, currProductionPlan: 2900, prevMonthEndInventory: 4800, currMonthEndInventory: 4900, prevInventoryMonths: 1.8, currInventoryMonths: 1.8 },
      { yearMonth: 202603, operatingDays: 20, prevSalesPlan: 3000, currSalesPlan: 2900, productionCapacity: 4000, prevProductionPlan: 3100, currProductionPlan: 3000, prevMonthEndInventory: 4900, currMonthEndInventory: 5000, prevInventoryMonths: 1.6, currInventoryMonths: 1.7 },
      { yearMonth: 202604, operatingDays: 19, prevSalesPlan: 2900, currSalesPlan: 3000, productionCapacity: 3800, prevProductionPlan: 3000, currProductionPlan: 3100, prevMonthEndInventory: 5000, currMonthEndInventory: 5100, prevInventoryMonths: 1.7, currInventoryMonths: 1.7 },
      { yearMonth: 202605, operatingDays: 21, prevSalesPlan: 3200, currSalesPlan: 3300, productionCapacity: 4200, prevProductionPlan: 3300, currProductionPlan: 3400, prevMonthEndInventory: 5100, currMonthEndInventory: 5200, prevInventoryMonths: 1.6, currInventoryMonths: 1.6 },
      { yearMonth: 202606, operatingDays: 21, prevSalesPlan: 3400, currSalesPlan: 3500, productionCapacity: 4200, prevProductionPlan: 3500, currProductionPlan: 3600, prevMonthEndInventory: 5200, currMonthEndInventory: 5300, prevInventoryMonths: 1.5, currInventoryMonths: 1.5 },
      { yearMonth: 202607, operatingDays: 22, prevSalesPlan: 3600, currSalesPlan: 3700, productionCapacity: 4400, prevProductionPlan: 3600, currProductionPlan: 3700, prevMonthEndInventory: 5300, currMonthEndInventory: 5400, prevInventoryMonths: 1.5, currInventoryMonths: 1.5 },
      { yearMonth: 202608, operatingDays: 20, prevSalesPlan: 3300, currSalesPlan: 3400, productionCapacity: 4000, prevProductionPlan: 3400, currProductionPlan: 3500, prevMonthEndInventory: 5400, currMonthEndInventory: 5500, prevInventoryMonths: 1.6, currInventoryMonths: 1.6 },
      { yearMonth: 202609, operatingDays: 19, prevSalesPlan: 3000, currSalesPlan: 3100, productionCapacity: 3800, prevProductionPlan: 3100, currProductionPlan: 3200, prevMonthEndInventory: 5500, currMonthEndInventory: 5600, prevInventoryMonths: 1.8, currInventoryMonths: 1.8 },
      { yearMonth: 202610, operatingDays: 21, prevSalesPlan: 3300, currSalesPlan: 3400, productionCapacity: 4200, prevProductionPlan: 3400, currProductionPlan: 3500, prevMonthEndInventory: 5600, currMonthEndInventory: 5700, prevInventoryMonths: 1.7, currInventoryMonths: 1.7 },
    ],
  },
  {
    lineCode: "ブライツ#7",
    factoryCode: "02",
    lines: [7],
    dailyCapacity: 90,
    monthly: [
      { yearMonth: 202602, operatingDays: 18, prevSalesPlan: 1200, currSalesPlan: 1300, productionCapacity: 1620, prevProductionPlan: 1300, currProductionPlan: 1350, prevMonthEndInventory: 2200, currMonthEndInventory: 2250, prevInventoryMonths: 1.8, currInventoryMonths: 1.7 },
      { yearMonth: 202603, operatingDays: 20, prevSalesPlan: 1400, currSalesPlan: 1380, productionCapacity: 1800, prevProductionPlan: 1420, currProductionPlan: 1400, prevMonthEndInventory: 2230, currMonthEndInventory: 2260, prevInventoryMonths: 1.6, currInventoryMonths: 1.6 },
      { yearMonth: 202604, operatingDays: 19, prevSalesPlan: 1350, currSalesPlan: 1380, productionCapacity: 1710, prevProductionPlan: 1370, currProductionPlan: 1400, prevMonthEndInventory: 2260, currMonthEndInventory: 2280, prevInventoryMonths: 1.7, currInventoryMonths: 1.7 },
      { yearMonth: 202605, operatingDays: 21, prevSalesPlan: 1500, currSalesPlan: 1530, productionCapacity: 1890, prevProductionPlan: 1520, currProductionPlan: 1550, prevMonthEndInventory: 2290, currMonthEndInventory: 2310, prevInventoryMonths: 1.5, currInventoryMonths: 1.5 },
      { yearMonth: 202606, operatingDays: 21, prevSalesPlan: 1600, currSalesPlan: 1630, productionCapacity: 1890, prevProductionPlan: 1620, currProductionPlan: 1650, prevMonthEndInventory: 2320, currMonthEndInventory: 2340, prevInventoryMonths: 1.5, currInventoryMonths: 1.4 },
      { yearMonth: 202607, operatingDays: 22, prevSalesPlan: 1700, currSalesPlan: 1730, productionCapacity: 1980, prevProductionPlan: 1700, currProductionPlan: 1730, prevMonthEndInventory: 2350, currMonthEndInventory: 2370, prevInventoryMonths: 1.4, currInventoryMonths: 1.4 },
      { yearMonth: 202608, operatingDays: 20, prevSalesPlan: 1550, currSalesPlan: 1580, productionCapacity: 1800, prevProductionPlan: 1570, currProductionPlan: 1600, prevMonthEndInventory: 2380, currMonthEndInventory: 2400, prevInventoryMonths: 1.5, currInventoryMonths: 1.5 },
      { yearMonth: 202609, operatingDays: 19, prevSalesPlan: 1430, currSalesPlan: 1460, productionCapacity: 1710, prevProductionPlan: 1450, currProductionPlan: 1480, prevMonthEndInventory: 2410, currMonthEndInventory: 2430, prevInventoryMonths: 1.7, currInventoryMonths: 1.7 },
      { yearMonth: 202610, operatingDays: 21, prevSalesPlan: 1580, currSalesPlan: 1610, productionCapacity: 1890, prevProductionPlan: 1600, currProductionPlan: 1630, prevMonthEndInventory: 2440, currMonthEndInventory: 2460, prevInventoryMonths: 1.6, currInventoryMonths: 1.5 },
    ],
  },
];

export const planMonths = [202603, 202604, 202605, 202606, 202607, 202608];

function makePlans(base: number, growth: number): import("./types").MonthlyPlan[] {
  return planMonths.map((ym, i) => {
    const sales = Math.round(base * Math.pow(1 + growth, i));
    const required = Math.round(sales * 1.05);
    const schedule = Math.round(required * (0.95 + Math.random() * 0.1));
    const surplus = schedule - required;
    const adj = surplus < 0 ? Math.abs(surplus) : 0;
    const endInv = Math.round(base * 1.5 + surplus);
    return {
      yearMonth: ym,
      salesPlan: sales,
      targetInventoryMonths: 1.5,
      productionSchedule: schedule,
      requiredProduction: required,
      surplusDeficit: surplus,
      planAdjustment: adj,
      monthEndInventory: endInv,
      monthEndInventoryMonths: parseFloat((endInv / sales).toFixed(1)),
    };
  });
}

function makeDailyAllocations(monthlyQty: number): import("./types").DailyAllocation[] {
  const days: import("./types").DailyAllocation[] = [];
  const operatingDays = 20;
  const perDay = Math.floor(monthlyQty / operatingDays);
  for (let d = 1; d <= 31; d++) {
    const dow = (d % 7);
    const isOp = dow !== 0 && dow !== 6 && d <= 31;
    days.push({
      date: `202605${String(d).padStart(2, "0")}`,
      quantity: isOp ? perDay : 0,
      isOperatingDay: isOp,
    });
  }
  return days;
}

export const products: Product[] = [
  {
    id: "P001", responsible: "田中", positive: "○",
    planCategory1: "FH 風呂", planCategory2: "給湯器", planCategory3: "屋外壁掛", planCategory4: "16号",
    factoryCode: "02", inventoryItemCode: "FHE-16AW1", manufacturingItemCode: "FHE-16AW1-G",
    productName: "エコジョーズ 16号 屋外壁掛型", gasType: "13A",
    primaryFactory: "02", primaryLine: 2, planLot: 50,
    productionMethod: "B:在庫製品", reorderPoint: 200, orderQuantity: 50,
    factoryInventory: 350, branchInventory: 180, consignmentInventory: 0, totalInventory: 530,
    twoMonthsAgoInventory: 510, lastMonthInventory: 520,
    monthlySales: [420, 380, 450, 510, 490, 530, 560, 520, 480, 440, 460, 430],
    monthlyPlans: makePlans(480, 0.02),
    dailyAllocations: makeDailyAllocations(500),
    comment: "",
  },
  {
    id: "P002", responsible: "田中", positive: "○",
    planCategory1: "FH 風呂", planCategory2: "給湯器", planCategory3: "屋外壁掛", planCategory4: "20号",
    factoryCode: "02", inventoryItemCode: "FHE-20AW1", manufacturingItemCode: "FHE-20AW1-G",
    productName: "エコジョーズ 20号 屋外壁掛型", gasType: "13A",
    primaryFactory: "02", primaryLine: 2, planLot: 30,
    productionMethod: "B:在庫製品", reorderPoint: 150, orderQuantity: 30,
    factoryInventory: 280, branchInventory: 120, consignmentInventory: 0, totalInventory: 400,
    twoMonthsAgoInventory: 390, lastMonthInventory: 395,
    monthlySales: [320, 290, 340, 380, 360, 400, 420, 390, 350, 310, 330, 300],
    monthlyPlans: makePlans(360, 0.015),
    dailyAllocations: makeDailyAllocations(370),
    comment: "",
  },
  {
    id: "P003", responsible: "鈴木", positive: "○",
    planCategory1: "FH 風呂", planCategory2: "給湯器", planCategory3: "屋外壁掛", planCategory4: "24号",
    factoryCode: "02", inventoryItemCode: "FHE-24AW1", manufacturingItemCode: "FHE-24AW1-G",
    productName: "エコジョーズ 24号 屋外壁掛型", gasType: "13A",
    primaryFactory: "02", primaryLine: 3, planLot: 20,
    productionMethod: "B:在庫製品", reorderPoint: 100, orderQuantity: 20,
    factoryInventory: 180, branchInventory: 90, consignmentInventory: 0, totalInventory: 270,
    twoMonthsAgoInventory: 260, lastMonthInventory: 265,
    monthlySales: [240, 210, 260, 290, 280, 310, 330, 300, 270, 240, 250, 220],
    monthlyPlans: makePlans(280, 0.01),
    dailyAllocations: makeDailyAllocations(290),
    comment: "",
  },
  {
    id: "P004", responsible: "鈴木", positive: "○",
    planCategory1: "FH 風呂", planCategory2: "給湯器", planCategory3: "屋内設置", planCategory4: "16号",
    factoryCode: "02", inventoryItemCode: "FHI-16AG1", manufacturingItemCode: "FHI-16AG1-G",
    productName: "エコジョーズ 16号 屋内設置型", gasType: "13A",
    primaryFactory: "02", primaryLine: 3, planLot: 40,
    productionMethod: "B:在庫製品", reorderPoint: 160, orderQuantity: 40,
    factoryInventory: 290, branchInventory: 140, consignmentInventory: 20, totalInventory: 450,
    twoMonthsAgoInventory: 440, lastMonthInventory: 445,
    monthlySales: [380, 340, 400, 450, 430, 470, 500, 460, 420, 380, 400, 360],
    monthlyPlans: makePlans(430, 0.018),
    dailyAllocations: makeDailyAllocations(445),
    comment: "",
  },
  {
    id: "P005", responsible: "山本", positive: "○",
    planCategory1: "FH 風呂", planCategory2: "給湯器", planCategory3: "屋内設置", planCategory4: "20号",
    factoryCode: "02", inventoryItemCode: "FHI-20AG1", manufacturingItemCode: "FHI-20AG1-G",
    productName: "エコジョーズ 20号 屋内設置型", gasType: "13A",
    primaryFactory: "02", primaryLine: 4, planLot: 30,
    productionMethod: "B:在庫製品", reorderPoint: 120, orderQuantity: 30,
    factoryInventory: 220, branchInventory: 110, consignmentInventory: 0, totalInventory: 330,
    twoMonthsAgoInventory: 320, lastMonthInventory: 325,
    monthlySales: [290, 260, 310, 350, 330, 370, 390, 360, 330, 290, 310, 280],
    monthlyPlans: makePlans(335, 0.012),
    dailyAllocations: makeDailyAllocations(345),
    comment: "",
  },
  {
    id: "P006", responsible: "山本", positive: "○",
    planCategory1: "FH 風呂", planCategory2: "給湯器", planCategory3: "屋内設置", planCategory4: "24号",
    factoryCode: "02", inventoryItemCode: "FHI-24AG1", manufacturingItemCode: "FHI-24AG1-G",
    productName: "エコジョーズ 24号 屋内設置型", gasType: "13A",
    primaryFactory: "02", primaryLine: 4, planLot: 20,
    productionMethod: "B:在庫製品", reorderPoint: 80, orderQuantity: 20,
    factoryInventory: 150, branchInventory: 75, consignmentInventory: 0, totalInventory: 225,
    twoMonthsAgoInventory: 215, lastMonthInventory: 220,
    monthlySales: [200, 175, 220, 250, 240, 270, 290, 260, 230, 200, 215, 190],
    monthlyPlans: makePlans(240, 0.008),
    dailyAllocations: makeDailyAllocations(248),
    comment: "",
  },
  {
    id: "P007", responsible: "佐藤", positive: "新",
    planCategory1: "FH 風呂", planCategory2: "給湯器", planCategory3: "PS標準", planCategory4: "16号",
    factoryCode: "02", inventoryItemCode: "FHP-16AC1", manufacturingItemCode: "FHP-16AC1-G",
    productName: "エコジョーズ 16号 PS標準型", gasType: "13A",
    primaryFactory: "02", primaryLine: 7, planLot: 50,
    productionMethod: "B:在庫製品", reorderPoint: 200, orderQuantity: 50,
    factoryInventory: 310, branchInventory: 150, consignmentInventory: 10, totalInventory: 470,
    twoMonthsAgoInventory: 460, lastMonthInventory: 465,
    monthlySales: [400, 360, 420, 470, 450, 490, 520, 480, 440, 400, 420, 380],
    monthlyPlans: makePlans(450, 0.022),
    dailyAllocations: makeDailyAllocations(462),
    comment: "新製品立上げ中",
  },
  {
    id: "P008", responsible: "佐藤", positive: "○",
    planCategory1: "FH 風呂", planCategory2: "給湯器", planCategory3: "PS標準", planCategory4: "20号",
    factoryCode: "02", inventoryItemCode: "FHP-20AC1", manufacturingItemCode: "FHP-20AC1-G",
    productName: "エコジョーズ 20号 PS標準型", gasType: "13A",
    primaryFactory: "02", primaryLine: 7, planLot: 30,
    productionMethod: "B:在庫製品", reorderPoint: 120, orderQuantity: 30,
    factoryInventory: 240, branchInventory: 120, consignmentInventory: 0, totalInventory: 360,
    twoMonthsAgoInventory: 350, lastMonthInventory: 355,
    monthlySales: [310, 280, 330, 370, 350, 390, 410, 380, 340, 310, 325, 295],
    monthlyPlans: makePlans(355, 0.014),
    dailyAllocations: makeDailyAllocations(365),
    comment: "",
  },
  {
    id: "P009", responsible: "伊藤", positive: "○",
    planCategory1: "FH 風呂", planCategory2: "給湯器", planCategory3: "PS狭幅", planCategory4: "16号",
    factoryCode: "02", inventoryItemCode: "FHPS-16AC1", manufacturingItemCode: "FHPS-16AC1-G",
    productName: "エコジョーズ 16号 PS狭幅型", gasType: "13A",
    primaryFactory: "02", primaryLine: 2, planLot: 40,
    productionMethod: "B:在庫製品", reorderPoint: 160, orderQuantity: 40,
    factoryInventory: 280, branchInventory: 130, consignmentInventory: 0, totalInventory: 410,
    twoMonthsAgoInventory: 400, lastMonthInventory: 405,
    monthlySales: [340, 305, 365, 410, 390, 430, 455, 420, 385, 345, 360, 330],
    monthlyPlans: makePlans(395, 0.016),
    dailyAllocations: makeDailyAllocations(406),
    comment: "",
  },
  {
    id: "P010", responsible: "伊藤", positive: "未",
    planCategory1: "FH 風呂", planCategory2: "給湯器", planCategory3: "PS狭幅", planCategory4: "20号",
    factoryCode: "02", inventoryItemCode: "FHPS-20AC1", manufacturingItemCode: "FHPS-20AC1-G",
    productName: "エコジョーズ 20号 PS狭幅型", gasType: "13A",
    primaryFactory: "02", primaryLine: 2, planLot: 20,
    productionMethod: "D:受注生産", reorderPoint: 0, orderQuantity: 0,
    factoryInventory: 0, branchInventory: 0, consignmentInventory: 0, totalInventory: 0,
    twoMonthsAgoInventory: 0, lastMonthInventory: 0,
    monthlySales: [0, 0, 0, 20, 35, 50, 80, 70, 60, 40, 30, 20],
    monthlyPlans: makePlans(55, 0.03),
    dailyAllocations: makeDailyAllocations(55),
    comment: "量産未確定",
  },
  {
    id: "P011", responsible: "高橋", positive: "○",
    planCategory1: "FH 風呂", planCategory2: "暖房", planCategory3: "温水床暖", planCategory4: "標準",
    factoryCode: "02", inventoryItemCode: "FHU-STD1", manufacturingItemCode: "FHU-STD1-G",
    productName: "床暖房ユニット 標準型", gasType: "13A",
    primaryFactory: "02", primaryLine: 3, planLot: 10,
    productionMethod: "B:在庫製品", reorderPoint: 40, orderQuantity: 10,
    factoryInventory: 80, branchInventory: 40, consignmentInventory: 5, totalInventory: 125,
    twoMonthsAgoInventory: 120, lastMonthInventory: 122,
    monthlySales: [110, 100, 120, 135, 130, 145, 155, 140, 125, 110, 115, 105],
    monthlyPlans: makePlans(130, 0.01),
    dailyAllocations: makeDailyAllocations(134),
    comment: "",
  },
  {
    id: "P012", responsible: "高橋", positive: "○",
    planCategory1: "FH 風呂", planCategory2: "暖房", planCategory3: "温水床暖", planCategory4: "大型",
    factoryCode: "02", inventoryItemCode: "FHU-LRG1", manufacturingItemCode: "FHU-LRG1-G",
    productName: "床暖房ユニット 大型", gasType: "13A",
    primaryFactory: "02", primaryLine: 4, planLot: 5,
    productionMethod: "B:在庫製品", reorderPoint: 20, orderQuantity: 5,
    factoryInventory: 45, branchInventory: 20, consignmentInventory: 0, totalInventory: 65,
    twoMonthsAgoInventory: 62, lastMonthInventory: 63,
    monthlySales: [60, 55, 65, 75, 72, 80, 85, 78, 70, 60, 63, 58],
    monthlyPlans: makePlans(72, 0.009),
    dailyAllocations: makeDailyAllocations(74),
    comment: "",
  },
];

export function formatYearMonth(ym: number): string {
  const s = String(ym);
  return `${s.slice(0, 4)}年${s.slice(4)}月`;
}

export function getLineColor(lineCode: string): string {
  const colors: Record<string, string> = {
    "ブライツ": "#2563eb",
    "ブライツ#2": "#16a34a",
    "ブライツ#3": "#d97706",
    "ブライツ#4": "#dc2626",
    "ブライツ#7": "#7c3aed",
  };
  return colors[lineCode] ?? "#6b7280";
}
