import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "./auth";
import { prisma } from "./db";

export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "ADMIN") redirect("/");
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
