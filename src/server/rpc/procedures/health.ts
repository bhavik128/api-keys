import { base } from "../context";

export const ping = base.handler(() => ({
  now: Date.now(),
  status: "ok" as const,
}));
