import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui";

/** Shown in-page when a signed-in admin's role doesn't cover this area —
 *  never a silent redirect or a full-page crash. The admin sees exactly why. */
export function AccessRestricted({ area }: { area: string }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Card className="p-8">
        <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="mt-4 text-lg font-semibold text-navy-900">Access restricted</h1>
        <p className="mt-2 text-sm text-navy-500">
          Your admin role doesn&apos;t include access to <strong>{area}</strong>. Ask the Main Admin to grant access
          if you need it.
        </p>
      </Card>
    </div>
  );
}
