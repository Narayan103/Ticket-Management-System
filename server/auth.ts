import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";
import { CLIENT_URL } from "./env";
import { Role } from "./types/role";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  trustedOrigins: [CLIENT_URL],
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
    },
  },
  user: {
    modelName: "authUser",
    additionalFields: {
      role: {
        type: [Role.ADMIN, Role.AGENT],
        required: true,
        input: false,
      },
    },
  },
  session: { modelName: "authSession" },
  account: { modelName: "authAccount" },
  verification: { modelName: "authVerification" },
});
