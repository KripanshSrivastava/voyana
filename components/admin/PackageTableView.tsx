import { ContentRowActions } from "@/components/admin/ContentRowActions";
import { Badge } from "@/components/ui";
import { formatINR, formatDate } from "@/lib/utils";

type Row = {
  id: string;
  title: string;
  slug: string;
  kind: string;
  heroImage: string | null;
  startingPrice: number | null;
  offerPrice: number | null;
  published: boolean;
  featured: boolean;
  updatedAt: Date;
  destination: { name: string } | null;
};

export function PackageTableView({ rows, basePath }: { rows: Row[]; basePath: "packages" | "tours" }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
      <div className="overflow-x-auto scroll-slim">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-navy-50/60">
            <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Destination</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Featured</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-navy-50/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.heroImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.heroImage} alt="" className="h-10 w-14 rounded-lg object-cover" />
                    ) : (
                      <div className="h-10 w-14 rounded-lg bg-navy-100" />
                    )}
                    <div>
                      <div className="font-medium text-navy-800">{p.title}</div>
                      <div className="text-xs text-navy-400">/{p.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-navy-700">{p.destination?.name ?? "—"}</td>
                <td className="px-4 py-3 text-navy-700">{formatINR(p.offerPrice ?? p.startingPrice)}</td>
                <td className="px-4 py-3">
                  <Badge className={p.published ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-navy-100 text-navy-600 ring-navy-500/20"}>
                    {p.published ? "Published" : "Draft"}
                  </Badge>
                </td>
                <td className="px-4 py-3">{p.featured ? <Badge className="bg-sun-500/10 text-sun-600 ring-sun-500/20">Featured</Badge> : <span className="text-navy-300">—</span>}</td>
                <td className="px-4 py-3 text-navy-500">{formatDate(p.updatedAt)}</td>
                <td className="px-4 py-3">
                  <ContentRowActions resource="packages" id={p.id} published={p.published} editHref={`/admin/${basePath}/${p.id}/edit`} previewHref={`/admin/preview/package/${p.id}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
