import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { SessionCard } from "@/components/dashboard/session-card";
import { orpc } from "@/lib/orpc";
import { getQueryClient } from "@/lib/query-client";

export default async function DashboardPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(orpc.session.me.queryOptions());

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="font-semibold text-xl tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          You&rsquo;re signed in. Keys, services, scopes, tiers, and the
          playground arrive in the next phases.
        </p>
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <SessionCard />
      </HydrationBoundary>
    </div>
  );
}
