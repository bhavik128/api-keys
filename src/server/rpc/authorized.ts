import { base } from "./context";
import { authMiddleware } from "./middlewares/auth";

export const authorized = base.use(authMiddleware);
