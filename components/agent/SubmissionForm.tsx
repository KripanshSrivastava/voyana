"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, Select, Card } from "@/components/ui";

/** Both content types get their own full editor — same content depth as the
 *  admin panel (gallery, pricing, FAQs, and for packages also itinerary +
 *  inclusions/exclusions) — at /agent/submissions/{destinations,packages}/new. */
export function SubmissionForm() {
  const [type, setType] = useState<"destination" | "package">("destination");
  const href = type === "package" ? "/agent/submissions/packages/new" : "/agent/submissions/destinations/new";

  return (
    <Card className="p-6">
      <h2 className="mb-4 font-semibold text-navy-900">New submission</h2>
      <Field label="What are you submitting?">
        <Select value={type} onChange={(e) => setType(e.target.value as "destination" | "package")}>
          <option value="destination">Destination</option>
          <option value="package">Package / Tour</option>
        </Select>
      </Field>
      <Link
        href={href}
        className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Continue to {type === "package" ? "package" : "destination"} details
      </Link>
    </Card>
  );
}
