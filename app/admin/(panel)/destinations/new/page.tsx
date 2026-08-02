import { PageHeader } from "@/components/admin/ui";
import { DestinationEditor } from "@/components/admin/DestinationEditor";

export default function NewDestinationPage() {
  return (
    <div>
      <PageHeader title="New destination" subtitle="Create a destination for the public catalog." />
      <DestinationEditor />
    </div>
  );
}
