"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { ADMIN_ROLES } from "@/lib/constants";

/**
 * SUPER_ADMIN invite form. Not optimistic — invite creation touches the
 * external Supabase Auth API (email sending, auth user provisioning) whose
 * result the client can't safely predict. We DO prevent duplicate submits,
 * clear the form on success, and surface every failure through a toast so
 * the caller sees exactly what went wrong.
 */
export function InviteAdminForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [adminRole, setAdminRole] = useState<string>("LEAD_MANAGER");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/admins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, adminRole }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || "Could not invite admin.");
        toast.success(`Invite sent to ${email}. They'll receive an email to set their password.`);
        setEmail("");
        setName("");
        setAdminRole("LEAD_MANAGER");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not invite admin.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
      <label className="block">
        <span className="text-xs font-medium text-navy-500">Email</span>
        <Input
          type="email"
          required
          autoComplete="off"
          placeholder="new.admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          className="mt-1"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-navy-500">Full name</span>
        <Input
          required
          placeholder="Firstname Lastname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
          className="mt-1"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-navy-500">Role</span>
        <Select
          value={adminRole}
          onChange={(e) => setAdminRole(e.target.value)}
          disabled={pending}
          className="mt-1"
        >
          {ADMIN_ROLES.map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
          ))}
        </Select>
      </label>
      <Button type="submit" variant="brand" disabled={pending || !email || !name}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4" /> Send invite</>}
      </Button>
    </form>
  );
}
