import { prisma } from "@/lib/db";
import { handler, ok, fail } from "@/lib/api";
import { agentSignupSchema } from "@/lib/validation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const POST = handler(async (req: Request) => {
  const data = agentSignupSchema.parse(await req.json());
  const email = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return fail("An account with this email already exists.", 409);
  }

  // Create the Supabase auth identity (auto-confirmed so they can sign in now).
  const admin = createSupabaseAdmin();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
    user_metadata: { name: data.name },
  });
  if (error || !created.user) {
    return fail(/already/i.test(error?.message ?? "") ? "An account with this email already exists." : "Could not create account.", 409);
  }
  const authId = created.user.id;

  try {
    await prisma.user.create({
      data: {
        email,
        name: data.name,
        role: "AGENT",
        authId,
        agent: {
          create: {
            companyName: data.companyName,
            phone: data.phone,
            city: data.city || null,
            status: "PENDING",
            wallet: { create: { balance: 0 } },
          },
        },
      },
    });
  } catch (e) {
    // Roll back the orphaned auth user so the email can be reused.
    await admin.auth.admin.deleteUser(authId).catch(() => {});
    throw e;
  }

  // Sign them in immediately; portal gates actions until admin approves.
  const supabase = await createSupabaseServer();
  await supabase.auth.signInWithPassword({ email, password: data.password });

  return ok({ agentStatus: "PENDING" });
});
