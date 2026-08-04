/**
 * DEMO/MOCK marketplace metrics shown on the agent signup page only.
 * These are NOT real production statistics — do not present them as such
 * anywhere else in the app. Centralized here so they're easy to find and
 * swap for real database-driven values later, e.g.:
 *   totalLeads      -> prisma.lead.count()
 *   verifiedAgents  -> prisma.agent.count({ where: { verificationStatus: "VERIFIED" } })
 *   activeDestinations -> prisma.destination.count({ where: { published: true } })
 * Do not fabricate real leads/agents/purchases in the database to inflate
 * these — they're clearly-labeled placeholder copy, not live numbers.
 */
export type SignupStat = { value: string; label: string };

export const signupStats: SignupStat[] = [
  { value: "1,800+", label: "Travel Leads" },
  { value: "500+", label: "Verified Agents" },
  { value: "24/7", label: "Lead Opportunities" },
  { value: "95%", label: "Platform Response Rate" },
];

export const signupTrustPoints: string[] = [
  "1,800+ travel enquiries processed",
  "Verified travel professionals",
  "Domestic & international opportunities",
  "Secure account verification",
];
