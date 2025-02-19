import { AuthChecker } from "type-graphql";
import { DokkuContext } from "../data/models/dokku_context";
import prisma from "../lib/prisma";

export const authChecker: AuthChecker<DokkuContext, "admin" | "user"> = async (
  { context },
  roles
): Promise<boolean> => {
  if (!context.auth) return false;

  const settings = await prisma.settings.findFirst();

  const userRoles = context.auth.user.role as
    | "admin"
    | "user"
    | null
    | undefined;

  if (
    !settings?.allowedEmails
      .map((it) => it.toLowerCase())
      .includes(context.auth.user.email.toLowerCase()) &&
    userRoles !== "admin"
  ) {
    return false;
  }

  return roles.length === 0 || roles.includes(userRoles ?? "user");
};
