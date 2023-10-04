import { DokkuProxyRepository as DokkuProxyRepository1 } from "./../lib/dokku/dokku.proxy.repository";
import { App, App as App1, AppStatus, AppStatus as AppStatus1 } from "@prisma/client";
import { $log, $log as $log1 } from "@tsed/common";
import { Job, Job as Job1 } from "bullmq";
import { PubSub as PubSub1 } from "graphql-subscriptions";
import { SubscriptionTopics, SubscriptionTopics as SubscriptionTopics1 } from "../data/models/subscription_topics";
import {
  IQueue as IQueue1,
  Queue as Queue1,
} from "../lib/queues/queue.decorator";
import { AppCreatedPayload, AppCreatedPayload as AppCreatedPayload1 } from "../modules/apps/data/models/app_created.payload";
import { DokkuAppRepository as DokkuAppRepository1 } from "./../lib/dokku/dokku.app.repository";
import { DokkuGitRepository as DokkuGitRepository1 } from "./../lib/dokku/dokku.git.repository";
import { ActivityRepository as ActivityRepository1 } from "./../modules/activity/data/repositories/activity.repository";
import { AppRepository as AppRepository1 } from "./../modules/apps/data/repositories/app.repository";
import { SSHExecOptions } from "node-ssh";
import { NotFound } from "@tsed/exceptions";
import { ProxyPort } from "./../lib/dokku/models/proxy_ports.model";
import { DatabaseRepository } from "./../modules/databases/data/repositories/database.repository";
import { LinkDatabaseQueue } from "./link_database.queue";

interface QueueArgs {
  appId: string;
  userName: string;
  token: string;
  deleteOnFailed?: boolean;
  databaseId?: string;
}

@Queue1()
export class DeployAppQueue extends IQueue1<QueueArgs, App1> {
  constructor(
    private appRepository: AppRepository1,
    private databaseRepository: DatabaseRepository,
    private dokkuGitRepository: DokkuGitRepository1,
    private pubsub: PubSub1,
    private activityRepository: ActivityRepository1,
    private linkDatabaseQueue: LinkDatabaseQueue,
    private dokkuAppRepository: DokkuAppRepository1,
    private dokkuProxyRepository: DokkuProxyRepository1
  ) {
    super();
  }

  protected async execute(job: Job1<QueueArgs, any>) {
    const { appId, userName, token } = job.data;
    const sshOptions: SSHExecOptions = {
      onStdout: (chunk) => {
        const payload = {
          appCreateLogs: {
            message: chunk.toString(),
            type: "stdout",
          },
          appId,
        } as AppCreatedPayload1;
        this.appRepository.addCreateLog(appId, payload.appCreateLogs);
        this.pubsub.publish(SubscriptionTopics1.APP_CREATED, payload);
      },
      onStderr: (chunk) => {
        const payload = {
          appCreateLogs: {
            message: chunk.toString(),
            type: "stderr",
          },
          appId,
        } as AppCreatedPayload1;
        this.appRepository.addCreateLog(appId, payload.appCreateLogs);
        this.pubsub.publish(SubscriptionTopics1.APP_CREATED, payload);
      },
    };

    $log1.info(`Iniciando el lanzamiento de la app ${appId}`);

    const app = await this.appRepository.get(appId);

    await this.appRepository.update(appId, {
      status: AppStatus1.BUILDING,
    });

    this.appRepository.clearCreateLogs(appId);

    const appMetaGithub = await this.appRepository.get(appId).AppMetaGithub();

    const { branch, repoName, repoOwner } = appMetaGithub;
    const branchName = branch ? branch : "main";

    await this.dokkuGitRepository.auth(userName, token);
    await this.dokkuGitRepository.unlock(app.name);

    await this.dokkuGitRepository.sync(
      app.name,
      `https://github.com/${repoOwner}/${repoName}.git`,
      branchName,
      sshOptions
    );

    const currentPorts = await this.dokkuProxyRepository
      .ports(app.name, sshOptions)
      .catch((err) => [] as ProxyPort[]);

    if (currentPorts.length > 0) {
      const webPort = currentPorts.find((it) => it.host === "80");

      if (!webPort) {
        await this.dokkuProxyRepository.add(
          app.name,
          "http",
          "80",
          currentPorts[0].container
        );
      }

      await this.dokkuAppRepository
        .enableSSL(app.name, sshOptions)
        .catch((e) => $log1.warn(e));
    }

    $log.info(
      `Finalizando de crear ${app.name} desde https://github.com/${repoOwner}/${repoName}.git`
    );

    return app;
  }

  async onSuccess(job: Job<QueueArgs, any, string>, result: App) {
    const payload = <AppCreatedPayload>{
      appCreateLogs: {
        message: "App created successfully! 🎉",
        type: "end:success",
      },
      appId: job.data.appId,
    };

    this.pubsub?.publish(SubscriptionTopics.APP_CREATED, payload);
    this.appRepository.addCreateLog(result.id, payload.appCreateLogs);

    const { repoOwner, repoName, branch } = await this.appRepository
      .get(job.data.appId)
      .AppMetaGithub();

    await this.appRepository.update(job.data.appId, {
      status: AppStatus.RUNNING,
    });

    if (job.data.databaseId) {
      const database = await this.databaseRepository.databaseWithApps(
        job.data.databaseId,
        job.data.appId
      );

      if (!database) {
        throw new NotFound(
          `La base de datos no existe con ID ${job.data.databaseId}`
        );
      }

      const isLinked = database.apps.length === 1;

      if (isLinked) {
        throw new Error(
          `${database.name} database is already linked to ${result.name} app`
        );
      }

      await this.linkDatabaseQueue.add({
        appId: job.data.appId,
        databaseId: job.data.databaseId,
      });
    }

    await this.activityRepository.add({
      name: `Proyecto "${result.name}" lanzado`,
      description: `Desde https://github.com/${repoOwner}/${repoName}/tree/${branch}`,
      referenceId: job.data.appId,
      refersToModel: "App",
      Modifier: {
        connect: {
          username: job.data.userName,
        },
      },
    });
  }

  async onFailed(job: Job<QueueArgs, any>, error: Error) {
    const { appId, deleteOnFailed = true } = job.data;

    const payload = <AppCreatedPayload>{
      appCreateLogs: {
        message: "Failed to create app! 😭",
        type: "end:failure",
      },
    };
    this.pubsub?.publish(SubscriptionTopics.APP_CREATED, payload);
    this.appRepository.addCreateLog(appId, payload.appCreateLogs);

    const app = await this.appRepository.get(appId);

    if (job.data.databaseId) {
      const database = await this.databaseRepository.databaseWithApps(
        job.data.databaseId,
        job.data.appId
      );

      if (!database) {
        throw new NotFound(
          `La base de datos no existe con ID ${job.data.databaseId}`
        );
      }

      const isLinked = database.apps.length === 1;

      if (isLinked) {
        throw new Error(
          `${database.name} database is already linked to ${app.name} app`
        );
      }

      await this.linkDatabaseQueue.add({
        appId: job.data.appId,
        databaseId: job.data.databaseId,
      });
    }

    if (deleteOnFailed) {
      $log.info(app);

      if (app) {
        await this.appRepository.delete(appId);

        await this.dokkuAppRepository.destroy(app.name);
      }
    } else {
      await this.appRepository.update(job.data.appId, {
        status: AppStatus.IDLE,
      });
      await this.activityRepository.add({
        name: `Lanzamiento de "${app.name}" fallido`,
        description: error.message,
        referenceId: job.data.appId,
        refersToModel: "App",
        Modifier: {
          connect: {
            username: job.data.userName,
          },
        },
      });
    }
  }
}
