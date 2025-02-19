import { DokkuProxyRepository } from "../lib/dokku/dokku.proxy.repository";
import { App, AppStatus } from "@prisma/client";
import { $log } from "@tsed/common";
import { Job } from "bullmq";
import { PubSub } from "graphql-subscriptions";
import { SubscriptionTopics } from "../data/models/subscription_topics";
import { IQueue, Queue } from "../lib/queues/queue.decorator";
import { AppCreatedPayload } from "../modules/apps/data/models/app_created.payload";
import { DokkuAppRepository } from "../lib/dokku/dokku.app.repository";
import { DokkuGitRepository } from "../lib/dokku/dokku.git.repository";
import { ActivityRepository } from "../modules/activity/data/repositories/activity.repository";
import { AppRepository } from "../modules/apps/data/repositories/app.repository";
import { SSHExecOptions } from "node-ssh";
import { ProxyPort } from "../lib/dokku/models/proxy_ports.model";
import { DatabaseRepository } from "../modules/databases/data/repositories/database.repository";
import { DokkuDatabaseRepository } from "../repositories";

interface QueueArgs {
  appId: string;
  userName: string;
  image: string;
  deleteOnFailed?: boolean;
  databaseId?: string;
}

@Queue()
export class DeployImageQueue extends IQueue<QueueArgs, App> {
  constructor(
    private appRepository: AppRepository,
    private databaseRepository: DatabaseRepository,
    private pubsub: PubSub,
    private activityRepository: ActivityRepository,
    private dokkuDatabaseRepository: DokkuDatabaseRepository,
    private dokkuAppRepository: DokkuAppRepository,
    private dokkuProxyRepository: DokkuProxyRepository
  ) {
    super();
  }

  sshOptions = (appId: string): SSHExecOptions => ({
    onStdout: (chunk) => {
      const payload = {
        appCreateLogs: {
          message: chunk.toString(),
          type: "stdout",
        },
        appId,
      } as AppCreatedPayload;
      this.appRepository.addCreateLog(appId, payload.appCreateLogs);
      this.pubsub.publish(SubscriptionTopics.APP_CREATED, payload);
    },
    onStderr: (chunk) => {
      const payload = {
        appCreateLogs: {
          message: chunk.toString(),
          type: "stderr",
        },
        appId,
      } as AppCreatedPayload;
      this.appRepository.addCreateLog(appId, payload.appCreateLogs);
      this.pubsub.publish(SubscriptionTopics.APP_CREATED, payload);
    },
  });

  protected async execute(job: Job<QueueArgs, any>) {
    const { appId, userName, image } = job.data;

    $log.info(`Iniciando el lanzamiento de la imagen ${appId}`);

    const app = await this.appRepository.get(appId);

    await this.appRepository.update(appId, {
      status: AppStatus.BUILDING,
    });

    this.appRepository.clearCreateLogs(appId);

    await this.dokkuAppRepository.createFromImage(
      app.name,
      image,
      this.sshOptions(appId)
    );

    const currentPorts = await this.dokkuProxyRepository
      .ports(app.name, this.sshOptions(appId))
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
        .enableSSL(app.name, this.sshOptions(appId))
        .catch((e) => $log.warn(e));
    }

    $log.info(`Finalizando de crear ${app.name} desde la imagen ${image}`);

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

    if (job.data.databaseId) {
      const database = await this.databaseRepository.databaseWithApps(
        job.data.databaseId,
        job.data.appId
      );

      if (!database) {
        this.pubsub.publish(SubscriptionTopics.APP_CREATED, <AppCreatedPayload>{
          appCreateLogs: {
            message: "Database not found! 🤔",
            type: "end:failure",
          },
        });
      }

      const isLinked = database.apps.find((it) => it.id === job.data.appId);

      if (!isLinked) {
        await this.dokkuDatabaseRepository.link(
          database.name,
          database.type,
          result.name,
          this.sshOptions(result.id)
        );
        await this.databaseRepository.update(database.id, {
          apps: {
            connect: { id: result.id },
          },
        });

        await this.activityRepository.add({
          name: `Base de datos "${database.name}" enlazada con "${result.name}"`,
          description: database.id,
          referenceId: database.id,
          refersToModel: "Database",
          Modifier: {
            connect: {
              username: job.data.userName,
            },
          },
        });
      } else {
        this.pubsub.publish(SubscriptionTopics.APP_CREATED, <AppCreatedPayload>{
          appCreateLogs: {
            message: "Database already linked! 🫡",
            type: "end:failure",
          },
        });
      }
    }
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
