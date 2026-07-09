"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

// Temporary proof-of-wiring widget; becomes real dashboard data in Phase 3.
export function SessionCard() {
  const { data, isPending, error } = useQuery(orpc.session.me.queryOptions());

  return (
    <div className="space-y-1 rounded-lg border border-border p-4">
      <p className="font-medium text-sm">oRPC · TanStack Query · Better Auth</p>
      {isPending ? (
        <p className="text-muted-foreground text-sm">Loading session…</p>
      ) : null}
      {error ? (
        <p className="text-destructive text-sm">{error.message}</p>
      ) : null}
      {data ? (
        <p className="text-muted-foreground text-sm">
          Verified via oRPC as{" "}
          <span className="font-medium text-foreground">{data.email}</span>
        </p>
      ) : null}
    </div>
  );
}
