import { os } from "@orpc/server";

export interface ORPCContext {
  headers: Headers;
}

export const base = os.$context<ORPCContext>();
