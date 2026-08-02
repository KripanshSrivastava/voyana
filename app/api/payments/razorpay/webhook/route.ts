import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { addCreditsInTx, CREDIT_LEDGER_TYPES } from "@/lib/credits";
import { notify } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { logIntegration } from "@/lib/integrations/log";

/**
 * Razorpay webhook. This is the only online-payment path that activates a Lead
 * Credit package. Signature verification and paid-status idempotency prevent a
 * replayed event from double-crediting an agent.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    await logIntegration({ integration: "payment", event: "webhook", status: "FAILED", message: "RAZORPAY_WEBHOOK_SECRET not set" });
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const sig = req.headers.get("x-razorpay-signature") || "";
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const valid = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!valid) {
    await logIntegration({ integration: "payment", event: "webhook_verify", status: "FAILED", message: "Invalid signature" });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.event === "payment.captured" || payload.event === "order.paid") {
    const entity = payload.payload?.payment?.entity;
    const orderId = entity?.order_id;
    const paymentId = entity?.id;
    if (!orderId) return NextResponse.json({ ok: true });

    const purchase = await prisma.leadCreditPurchase.findUnique({
      where: { orderId },
      include: { agent: { select: { userId: true } } },
    });
    if (!purchase) {
      await logIntegration({ integration: "payment", event: "webhook", status: "FAILED", externalId: orderId, message: "Unknown Lead Credit order" });
      return NextResponse.json({ ok: true });
    }
    if (purchase.status === "PAID") return NextResponse.json({ ok: true });

    const balance = await prisma.$transaction(async (tx) => {
      const claim = await tx.leadCreditPurchase.updateMany({
        where: { id: purchase.id, status: "CREATED" },
        data: { status: "PAID", paymentId: paymentId ?? null, paidAt: new Date() },
      });
      if (claim.count === 0) return null;

      await tx.walletTopup.updateMany({
        where: { orderId, status: "CREATED" },
        data: { status: "PAID", paymentId: paymentId ?? null },
      });

      return addCreditsInTx(
        tx,
        purchase.agentId,
        purchase.credits,
        CREDIT_LEDGER_TYPES.PURCHASE,
        `Purchased ${purchase.packageName}`,
        { referenceId: purchase.id, packageId: purchase.packageId }
      );
    });

    if (balance != null) {
      await notify({
        userId: purchase.agent.userId,
        type: "wallet",
        title: "Lead Credits added",
        body: `${purchase.credits.toLocaleString("en-IN")} Lead Credits added. New balance ${balance.toLocaleString("en-IN")}.`,
        href: "/agent/wallet",
      });
      await logAudit({ actorType: "SYSTEM", action: "credits.purchase", entityType: "wallet", entityId: purchase.agentId, metadata: { credits: purchase.credits, priceInr: purchase.priceInr, orderId, paymentId } });
      await logIntegration({ integration: "payment", event: "credits_purchase", status: "SUCCESS", externalId: orderId, message: `Credited ${purchase.credits} Lead Credits` });
    }
  }

  return NextResponse.json({ ok: true });
}
