import { authorized } from "../authorized";

export const me = authorized.handler(({ context }) => ({
  email: context.user.email,
  id: context.user.id,
  name: context.user.name,
}));
