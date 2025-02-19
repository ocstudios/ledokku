import express from "express";
import { sshKeyPath } from "../config";
import { DokkuContext } from "../data/models/dokku_context";
import prisma from "../lib/prisma";
import { readFileSync } from "fs";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";

const publicKey = readFileSync(`${sshKeyPath}.pub`, {
  encoding: "utf8",
});

export class ContextFactory {
  static async generateBaseContext(): Promise<Partial<DokkuContext>> {
    return {
      prisma: prisma,
      sshContext: {
        publicKey,
      },
    };
  }

  static async createFromHTTP(req?: express.Request): Promise<DokkuContext> {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req?.headers ?? {}),
    });

    const baseContext = await ContextFactory.generateBaseContext();

    return <DokkuContext>{
      ...baseContext,
      auth: session,
    };
  }

  static async createFromWS(connectionParams?: any): Promise<DokkuContext> {
    const baseContext = await ContextFactory.generateBaseContext();

    return <DokkuContext>{
      ...baseContext,
      // auth: user //TODO: Fix this
      //   ? {
      //       token: connectionParams.token,
      //       user,
      //     }
      //   : undefined,
    };
  }
}
