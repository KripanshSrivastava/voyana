import { requireAgent } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { NotificationList } from "@/components/agent/NotificationList";

export default async function NotificationsPage() {
  const { session } = await requireAgent();
  const notifications = await prisma.notification.findMany({
    where: { userId: session.uid },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="max-w-2xl">
      <PageHeader title="Notifications" subtitle="Alerts, wallet updates and account news." />
      <NotificationList
        initial={notifications.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, href: n.href, read: n.read, createdAt: n.createdAt.toISOString() }))}
      />
    </div>
  );
}
