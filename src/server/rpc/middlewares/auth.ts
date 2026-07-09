import { ORPCError } from "@orpc/server";
import { auth } from "@/server/auth";
import { base } from "../context";

export const authMiddleware = base.middleware(async ({ context, next }) => {
  const data = await auth.api.getSession({ headers: context.headers });

  if (!data) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      session: data.session,
      user: data.user,
    },
  });
});
