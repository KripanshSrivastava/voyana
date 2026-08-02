import { requireAgent } from "@/lib/guards";
import { PageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/ui";
import { ProfileForm, type ProfileValue } from "@/components/agent/ProfileForm";
import { parseJson } from "@/lib/utils";
import { Check } from "lucide-react";

export default async function ProfilePage() {
  const { session, agent } = await requireAgent();
  const socials = parseJson<ProfileValue["socials"]>(agent.socials, {});

  const initial: ProfileValue = {
    firstName: agent.firstName ?? "",
    lastName: agent.lastName ?? "",
    phone: agent.phone ?? "",
    personalEmail: agent.personalEmail ?? session.email ?? "",
    companyName: agent.companyName ?? "",
    state: agent.state ?? "",
    city: agent.city ?? "",
    companyAddress: agent.companyAddress ?? "",
    companyEmail: agent.companyEmail ?? "",
    contactPerson: agent.contactPerson ?? session.name ?? "",
    contactNo: agent.contactNo ?? "",
    website: agent.website ?? "",
    socials: socials ?? {},
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal and company details."
        action={agent.verificationStatus === "VERIFIED" ? (
          <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20"><Check className="mr-1 h-3.5 w-3.5" /> Verified Partner</Badge>
        ) : undefined}
      />
      <ProfileForm
        initial={initial}
        verification={{ status: agent.verificationStatus, verifiedAt: agent.verifiedAt?.toISOString() ?? null, notes: agent.verificationNotes }}
      />
    </div>
  );
}
