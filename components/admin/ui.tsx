import { Badge } from "@/components/ui";
import { LEAD_STATUS_STYLES, QUALITY_STYLES, AGENT_STATUS_STYLES } from "@/lib/constants";
import { titleCase, cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-navy-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "brand",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  accent?: "brand" | "sun" | "navy" | "emerald" | "rose";
}) {
  const accents: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    sun: "bg-orange-50 text-sun-600",
    navy: "bg-navy-100 text-navy-700",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-navy-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-navy-900">{value}</p>
        </div>
        {icon && <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", accents[accent])}>{icon}</span>}
      </div>
      {hint && <p className="mt-2 text-xs text-navy-400">{hint}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge className={LEAD_STATUS_STYLES[status] ?? "bg-navy-100 text-navy-600 ring-navy-500/20"}>{titleCase(status)}</Badge>;
}

export function QualityBadge({ quality }: { quality: string }) {
  return <Badge className={QUALITY_STYLES[quality] ?? "bg-navy-100 text-navy-600 ring-navy-500/20"}>{titleCase(quality)}</Badge>;
}

export function AgentStatusBadge({ status }: { status: string }) {
  return <Badge className={AGENT_STATUS_STYLES[status] ?? "bg-navy-100 text-navy-600 ring-navy-500/20"}>{titleCase(status)}</Badge>;
}
