export async function register() {
  // Node-only: the server client pulls in node-postgres via the router.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/server/rpc/client.server");
  }
}
