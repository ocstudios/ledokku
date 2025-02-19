import { $log } from "@tsed/common";
import { PlatformExpress } from "@tsed/platform-express";
import "reflect-metadata";
import { Server } from "./server";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import cors from "cors";

async function bootstrap() {
  try {
    $log.info("Start server...");
    const platform = await PlatformExpress.bootstrap(Server, {});

    platform.platform.app.all("/api/auth/*", toNodeHandler(auth));

    platform.platform.app.use(
      cors({
        origin: process.env.BETTER_AUTH_URL,
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
      })
    );

    await platform.listen();
    $log.info("Server initialized");
  } catch (er) {
    $log.error(er);
  }
}

bootstrap();
