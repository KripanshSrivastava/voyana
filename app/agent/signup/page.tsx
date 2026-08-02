import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AgentSignupForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Agent Signup", robots: { index: false } };

export default async function AgentSignupPage() {
  const session = await getSession();
  if (session?.role === "AGENT") redirect("/agent/dashboard");
  return <AgentSignupForm />;
}
