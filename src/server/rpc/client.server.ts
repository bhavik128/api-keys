import "server-only";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { headers } from "next/headers";
import { type Router, router } from "./router";

// Set once at startup (via instrumentation) so Server Components call the router
// in-process during SSR instead of over HTTP; headers thread the request session.
const globalForOrpc = globalThis as unknown as {
  $client?: RouterClient<Router>;
};

globalForOrpc.$client = createRouterClient(router, {
  context: async () => ({ headers: await headers() }),
});
