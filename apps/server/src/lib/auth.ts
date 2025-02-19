import { betterAuth } from "better-auth";
import { GITHUB_APP_CLIENT_ID, GITHUB_APP_CLIENT_SECRET } from "../constants";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    github: {
      clientId: GITHUB_APP_CLIENT_ID ?? "",
      clientSecret: GITHUB_APP_CLIENT_SECRET ?? "",
      enabled: !!GITHUB_APP_CLIENT_ID && !!GITHUB_APP_CLIENT_SECRET,
    },
  },
  plugins: [admin()],
});
