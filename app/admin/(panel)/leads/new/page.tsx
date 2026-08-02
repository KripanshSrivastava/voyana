import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import { AdminLeadForm } from "@/components/admin/AdminLeadForm";
import { getSiteSettings } from "@/lib/settings";

export default async function NewLeadPage() {
  const settings = await getSiteSettings();
  return (
    <div>
      <Link href="/admin/leads" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>
      <PageHeader title="Add lead manually" subtitle="Enter a walk-in or phone-in lead into the pipeline." />
      <AdminLeadForm mode="create" defaultPrice={settings.defaultLeadPrice} />
    </div>
  );
}
