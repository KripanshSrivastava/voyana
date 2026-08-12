import { redirect } from "next/navigation";

/**
 * Historical URL. Security controls used to live here — they moved to
 * /agent/security so the sidebar can present a dedicated Security entry.
 * Any bookmark on /agent/settings lands the user on the new page.
 */
export default function AgentSettingsPage() {
  redirect("/agent/security");
}
