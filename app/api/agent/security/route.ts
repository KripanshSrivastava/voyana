import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { sendEmail } from "@/lib/email/mailer";
import { securitySettingsChanged } from "@/lib/email/templates";

export const GET = handler(async () => {
  const session = await requireRole("AGENT");
  return ok({ twoFactorEnabled: session.twoFactorEnabled });
});

export const PUT = handler(async (req: Request) => {
  const session = await requireRole("AGENT");
  const { enabled } = await req.json();
  if (typeof enabled !== "boolean") return fail("Invalid request.", 422);

  await prisma.user.update({ where: { id: session.uid }, data: { twoFactorEnabled: enabled } });

  await sendEmail({
    to: session.email,
    ...securitySettingsChanged({
      name: session.name,
      change: enabled
        ? "Email two-factor authentication was turned ON for your account. You'll be asked for a code from your email each time you sign in."
        : "Email two-factor authentication was turned OFF for your account.",
    }),
  });

  return ok({ twoFactorEnabled: enabled });
});
