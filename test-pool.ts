import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$queryRaw`SELECT 1 as ok`;
  console.log("DATABASE_URL (pooled 6543) connection OK:", JSON.stringify(result));
  const count = await prisma.user.count();
  console.log("user count via pooled connection:", count);
  await prisma.$disconnect();
}
main().catch((e) => { console.error("CONNECTION FAILED:", e.message); process.exit(1); });
