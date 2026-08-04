import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "./auth";
import { prisma } from "./db";

export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  // Wrong role (e.g. an agent session in this browser) goes back to the admin
  // login with an explanation — never a silent bounce to the public homepage,
  // which looks like the page vanished rather than an auth problem.
  if (session.role !== "ADMIN") redirect("/admin/login?error=wrong-role");
  return session;
}

/** Agent must be signed in; returns session + fresh agent record (status may change). */
export async function requireAgent() {
  const session = await getSession();
  if (!session) redirect("/agent/login");
  if (session.role !== "AGENT" || !session.agentId) redirect("/agent/login");
  const agent = await prisma.agent.findUnique({
    where: { id: session.agentId },
    include: { wallet: true, creditBalance: true },
  });
  if (!agent) redirect("/agent/login");
  return { session, agent };
}
