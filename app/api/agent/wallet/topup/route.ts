import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { z } from "zod";

const topupSchema = z.object({ packageId: z.string().min(1) });

/**
 * Creates a Razorpay order server-side for a Lead Credit package. The client
 * submits only packageId; price and credit quantity are loaded from the DB.
 * Credits are added only after the signed Razorpay webhook confirms payment.
 */
export const POST = handler(async (req: Request) => {
  const session = await requireRole("AGENT");
  if (!session.agentId) return fail("Agent profile missing.", 403);
  const { packageId } = topupSchema.parse(await req.json());

  const pkg = await prisma.leadCreditPackage.findFirst({ where: { id: packageId, isActive: true } });
  if (!pkg) return fail("Lead Credit package not found.", 404);

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return fail("Online payments are not connected yet. Please contact the Voyana team to buy Lead Credits.", 503);
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: pkg.priceInr * 100,
      currency: "INR",
      receipt: `credits_${session.agentId}_${Date.now()}`,
      notes: { agentId: session.agentId, packageId: pkg.id, credits: pkg.credits },
    }),
  });
  if (!res.ok) {
    return fail("Could not start payment. Please try again.", 502);
  }
  const order = (await res.json()) as { id: string };

  await prisma.$transaction(async (tx) => {
    const purchase = await tx.leadCreditPurchase.create({
      data: {
        agentId: session.agentId!,
        packageId: pkg.id,
        packageName: pkg.name,
        credits: pkg.credits,
        priceInr: pkg.priceInr,
        currency: "INR",
        provider: "razorpay",
        orderId: order.id,
        status: "CREATED",
      },
    });
    await tx.walletTopup.create({
      data: {
        agentId: session.agentId!,
        amount: pkg.priceInr,
        currency: "INR",
        provider: "razorpay",
        orderId: order.id,
        status: "CREATED",
        leadCreditPurchaseId: purchase.id,
      },
    });
  });

  return ok({ orderId: order.id, amount: pkg.priceInr, credits: pkg.credits, packageName: pkg.name, keyId, currency: "INR" });
});
