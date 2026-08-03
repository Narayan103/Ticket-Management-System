import type { auth } from "../auth";

type SessionResult = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

declare global {
  namespace Express {
    interface Request {
      session: SessionResult["session"] | null;
      user: SessionResult["user"] | null;
    }
  }
}

export {};
