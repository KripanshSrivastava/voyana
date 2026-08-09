import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { AdminLeadForm, type AdminLeadValue } from "@/components/admin/AdminLeadForm";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) notFound();

  const initial: AdminLeadValue = {
    customerName: lead.customerName,
    phone: lead.phone,
    email: lead.email ?? "",
    destinationText: lead.destinationText,
    departureCity: lead.departureCity ?? "",
    clientLocation: lead.clientLocation ?? "",
    tripCategory: lead.tripCategory ?? "",
    travelDate: lead.travelDate ? lead.travelDate.toISOString().slice(0, 10) : "",
    travelers: lead.travelers?.toString() ?? "",
    adults: lead.adults?.toString() ?? "",
    children: lead.children?.toString() ?? "",
    budget: lead.budget?.toString() ?? "",
    tripType: lead.tripType ?? "",
    message: lead.message ?? "",
  };

  return (
    <div>
      <Link href={`/admin/leads/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800">
        <ArrowLeft className="h-4 w-4" /> Back to lead
      </Link>
      <PageHeader title={`Edit ${lead.code}`} subtitle="Update customer and trip details manually." />
      <AdminLeadForm mode="edit" leadId={id} initial={initial} />
    </div>
  );
}
