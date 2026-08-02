import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/utils";

export const metadata = { title: "Preview", robots: { index: false } };

export default async function DestinationPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await prisma.destination.findUnique({ where: { id } });
  if (!d) notFound();
  const highlights = parseJson<string[]>(d.highlights, []);

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8">
      <div className="bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800">
        Preview mode — {d.published ? "published" : "draft (not visible to the public)"}
      </div>
      <section className="relative h-72 w-full overflow-hidden">
        {d.heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.heroImage} alt={d.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-navy-900 to-brand-700" />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <h1 className="absolute bottom-6 left-6 font-display text-4xl font-bold text-white">{d.name}</h1>
      </section>
      <div className="mx-auto max-w-3xl px-6 py-10">
        {d.longDescription && <p className="whitespace-pre-line text-lg text-navy-700">{d.longDescription}</p>}
        {highlights.length > 0 && (
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {highlights.map((h) => (<li key={h} className="flex items-start gap-2 text-navy-700"><Check className="mt-0.5 h-5 w-5 text-brand-600" /> {h}</li>))}
          </ul>
        )}
      </div>
    </div>
  );
}
