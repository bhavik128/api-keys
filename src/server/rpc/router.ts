import { ping } from "./procedures/health";
import { me } from "./procedures/session";

export const router = {
  health: { ping },
  session: { me },
};

export type Router = typeof router;
