import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { PageHeader } from "@/components/admin/ui";
import { AccessRestricted } from "@/components/admin/AccessRestricted";
import { Card, Badge, EmptyState } from "@/components/ui";
import { InviteAdminForm } from "@/components/admin/InviteAdminForm";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Admins", robots: { index: false } };

export default async function AdminsPage() {
  const session = await requireAdmin();
  // Only the Main Admin (SUPER_ADMIN or a legacy admin with no adminRole
  // set) may reach this page. Rendered in-page — never a silent redirect —
  // so other admins see exactly why they can't be here.
  if (session.adminRole && session.adminRole !== "SUPER_ADMIN") {
    return <AccessRestricted area="Admins (Main Admin only)" />;
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: [{ createdAt: "desc" }],
    // Only the columns the listing table renders. authId/passwordHash never
    // leave the server.
    select: {
      id: true,
      email: true,
      name: true,
      adminRole: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  return (
    <div>
      <PageHeader
        title="Admins"
        subtitle="Invite new admins by email. They'll receive a secure link to set their own password — no passwords are ever emailed."
      />

      <Card className="mb-6 p-6">
        <h2 className="mb-4 text-sm font-semibold text-navy-800">Invite a new admin</h2>
        <InviteAdminForm />
        <p className="mt-3 text-xs text-navy-400">
          The invitee gets a one-time link from Supabase to set their password. Their access begins the moment they finish that step.
        </p>
      </Card>

      <Card className="p-0">
        {admins.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No admins yet" description="Invite your first admin using the form above." />
          </div>
        ) : (
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-navy-50/60">
                <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Invited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {admins.map((a) => {
                  const isYou = a.id === session.uid;
                  const roleLabel = a.adminRole ? a.adminRole.replace(/_/g, " ") : "SUPER ADMIN (legacy)";
                  return (
                    <tr key={a.id} className="hover:bg-navy-50/40">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-navy-800">{a.name}</span>
                        {isYou && (
                          <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 ring-1 ring-brand-600/20">
                            YOU
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-navy-700">{a.email}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-navy-100 text-navy-700 ring-navy-500/20">{roleLabel}</Badge>
                      </td>
                      <td className="px-4 py-3 text-navy-500">{formatDate(a.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
