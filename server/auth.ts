import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";
import { Role } from "./types/role";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  trustedOrigins: [process.env.CLIENT_URL!],
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
