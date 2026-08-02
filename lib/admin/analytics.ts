import { prisma } from "../db";

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
export function startOfWeek(): Date {
  const d = startOfToday();
  const day = (d.getDay() + 6) % 7; // Monday-based
  d.setDate(d.getDate() - day);
  return d;
}
export function startOfMonth(): Date {
  const d = startOfToday();
  d.setDate(1);
  return d;
}

async function sumRevenue(gte?: Date): Promise<number> {
  const res = await prisma.leadPayment.aggregate({
    _sum: { amount: true },
    where: gte ? { createdAt: { gte } } : undefined,
  });
  return res._sum.amount ?? 0;
}

export async function revenueWindows() {
  const [today, week, month, all, avg] = await Promise.all([
    sumRevenue(startOfToday()),
    sumRevenue(startOfWeek()),
    sumRevenue(startOfMonth()),
    sumRevenue(),
    prisma.leadPayment.aggregate({ _avg: { amount: true } }),
  ]);
  return { today, week, month, all, avgLeadPrice: Math.round(avg._avg.amount ?? 0) };
}

/** Revenue per day for the last `days` days, oldest first. */
export async function dailyRevenueSeries(days = 14) {
  const start = startOfToday();
  start.setDate(start.getDate() - (days - 1));
  const payments = await prisma.leadPayment.findMany({
    where: { createdAt: { gte: start } },
    select: { amount: true, createdAt: true },
  });
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const p of payments) {
    const key = p.createdAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + p.amount);
  }
  return Array.from(buckets.entries()).map(([iso, revenue]) => ({
    label: new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    revenue,
  }));
}
