import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { Router } from "@/server/rpc/router";

// SSR uses the in-process client set on globalThis by server/rpc/client.server;
// the browser falls back to the HTTP RPC link below.
const globalForOrpc = globalThis as unknown as {
  $client?: RouterClient<Router>;
};

const link = new RPCLink({
  url: () => {
    if (typeof window === "undefined") {
      throw new Error(
        "orpc: server-side calls must go through the instrumentation-provided client"
      );
    }
    return `${window.location.origin}/api/rpc`;
  },
});

export const client: RouterClient<Router> =
  globalForOrpc.$client ?? createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
