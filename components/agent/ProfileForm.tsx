"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Building2, ShieldCheck, Loader2, Check } from "lucide-react";
import { FaFacebookF, FaTwitter, FaYoutube, FaLinkedinIn } from "react-icons/fa";
import { FiGlobe } from "react-icons/fi";
import { Input, Field, Textarea, Button, Card, Badge } from "@/components/ui";
import { VERIFICATION_STATUS_STYLES } from "@/lib/constants";
import { cn, titleCase, formatDate } from "@/lib/utils";

type Socials = { facebook?: string; twitter?: string; youtube?: string; linkedin?: string; googleBusiness?: string };
export type ProfileValue = {
  firstName: string; lastName: string; phone: string; personalEmail: string;
  companyName: string; state: string; city: string; companyAddress: string;
  companyEmail: string; contactPerson: string; contactNo: string; website: string;
  socials: Socials;
};

const TABS = [
  { id: "personal", label: "Personal", icon: User },
  { id: "company", label: "Company", icon: Building2 },
  { id: "verification", label: "Verification", icon: ShieldCheck },
] as const;

export function ProfileForm({
  initial,
  verification,
}: {
  initial: ProfileValue;
  verification: { status: string; verifiedAt: string | null; notes: string | null };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("personal");
  const [f, setF] = useState<ProfileValue>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ProfileValue>(k: K, v: ProfileValue[K]) => { setF((s) => ({ ...s, [k]: v })); setSaved(false); };
  const setSocial = (k: keyof Socials, v: string) => { setF((s) => ({ ...s, socials: { ...s.socials, [k]: v } })); setSaved(false); };

  async function save() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/agent/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-navy-100/60 p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "bg-white text-navy-900 shadow-sm" : "text-navy-500 hover:text-navy-800")}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "personal" && (
        <Card className="p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name"><Input value={f.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
            <Field label="Last name"><Input value={f.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
            <Field label="Phone"><Input type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} required /></Field>
            <Field label="Personal email"><Input type="email" value={f.personalEmail} onChange={(e) => set("personalEmail", e.target.value)} /></Field>
          </div>
        </Card>
      )}

      {tab === "company" && (
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-navy-900">Company</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name"><Input value={f.companyName} onChange={(e) => set("companyName", e.target.value)} required /></Field>
            <Field label="Company email"><Input type="email" value={f.companyEmail} onChange={(e) => set("companyEmail", e.target.value)} /></Field>
            <Field label="Website"><Input value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" /></Field>
            <Field label="State"><Input value={f.state} onChange={(e) => set("state", e.target.value)} /></Field>
            <Field label="City"><Input value={f.city} onChange={(e) => set("city", e.target.value)} /></Field>
          </div>
          <Field label="Company address"><Textarea rows={2} value={f.companyAddress} onChange={(e) => set("companyAddress", e.target.value)} /></Field>
          <h3 className="pt-2 font-semibold text-navy-900">Contact</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact person"><Input value={f.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} /></Field>
            <Field label="Contact number"><Input value={f.contactNo} onChange={(e) => set("contactNo", e.target.value)} /></Field>
          </div>
          <h3 className="pt-2 font-semibold text-navy-900">Social</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {([["facebook", FaFacebookF], ["twitter", FaTwitter], ["youtube", FaYoutube], ["linkedin", FaLinkedinIn], ["googleBusiness", FiGlobe]] as const).map(([k, Icon]) => (
              <Field key={k} label={titleCase(k)}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-navy-400" />
                  <Input value={f.socials[k] ?? ""} onChange={(e) => setSocial(k, e.target.value)} placeholder="URL" />
                </div>
              </Field>
            ))}
          </div>
        </Card>
      )}

      {tab === "verification" && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-navy-900">Verification status</h3>
            <Badge className={VERIFICATION_STATUS_STYLES[verification.status] ?? ""}>
              {verification.status === "VERIFIED" && <Check className="mr-1 h-3.5 w-3.5" />}
              {titleCase(verification.status)}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-navy-500">
            {verification.status === "VERIFIED"
              ? `Your account was verified on ${verification.verifiedAt ? formatDate(new Date(verification.verifiedAt)) : "—"}. The Verified Partner badge is shown across your portal.`
              : verification.status === "UNDER_REVIEW"
                ? "The Voyana team is reviewing your account. You'll be notified once it's verified."
                : verification.status === "REJECTED"
                  ? "Your verification was not approved. See the note below or contact support."
                  : "Your account is not yet verified. Complete your company profile — the Voyana team verifies partners manually."}
          </p>
          {verification.notes && (
            <p className="mt-3 rounded-lg bg-navy-50 px-3 py-2 text-sm text-navy-600"><span className="font-medium">Note from Voyana:</span> {verification.notes}</p>
          )}
          <p className="mt-4 text-xs text-navy-400">Only the Voyana team can change your verification status.</p>
        </Card>
      )}

      {tab !== "verification" && (
        <div className="mt-5 flex items-center gap-3">
          <Button variant="brand" onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
          {saved && <span className="flex items-center gap-1 text-sm text-emerald-600"><Check className="h-4 w-4" /> Saved</span>}
          {error && <span className="text-sm text-rose-600">{error}</span>}
        </div>
      )}
    </div>
  );
}
