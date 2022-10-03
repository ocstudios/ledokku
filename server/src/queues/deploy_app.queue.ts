import { PrismaClient } from '@prisma/client';
import { $log } from '@tsed/common';
import { Job } from 'bullmq';
import { PubSub } from 'graphql-subscriptions';
import { SubscriptionTopics } from '../data/models/subscription_topics';
import { IQueue, Queue } from '../lib/queues/queue.decorator';
import { sshConnect } from '../lib/ssh';
import { AppCreatedPayload } from '../modules/apps/data/models/app_created.payload';
import { DokkuGitRepository } from './../lib/dokku/dokku.git.repository';
import { AppRepository } from './../modules/apps/data/repositories/app.repository';

interface QueueArgs {
  appId: string;
  userName: string;
  token: string;
}

@Queue()
export class DeployAppQueue extends IQueue<QueueArgs> {
  constructor(
    private appRepository: AppRepository,
    private dokkuGitRepository: DokkuGitRepository,
    private pubsub: PubSub,
    private prisma: PrismaClient
  ) {
    super();
  }

  /*protected async execute(job: Job<QueueArgs, any>) {
    const { appId, userName, token } = job.data;

    $log.debug(`Iniciando el lanzamiento de la app ${appId}`);

    const app = await this.appRepository.get(appId);
    const appMetaGithub = await this.appRepository.get(appId).AppMetaGithub();

    const { branch, repoName, repoOwner } = appMetaGithub;
    const branchName = branch ? branch : 'main';

    const ssh = await sshConnect();

    await this.dokkuGitRepository.auth(ssh, userName, token);
    await this.dokkuGitRepository.unlock(ssh, app.name);

    const res = await this.dokkuGitRepository.sync(
      ssh,
      app.name,
      `https://github.com/${repoOwner}/${repoName}.git`,
      branchName,
      {
        onStdout: (chunk) => {
          this.pubsub.publish(SubscriptionTopics.APP_CREATED, <
            AppCreatedPayload
          >{
            appCreateLogs: {
              message: chunk.toString(),
              type: 'stdout',
            },
          });
        },
        onStderr: (chunk) => {
          this.pubsub.publish(SubscriptionTopics.APP_CREATED, <
            AppCreatedPayload
          >{
            appCreateLogs: {
              message: chunk.toString(),
              type: 'stderr',
            },
          });
        },
      }
    );

    $log.debug(
      `Finalizando de crear ${app.name} desde https://github.com/${repoOwner}/${repoName}.git`
    );

    if (!res.stderr) {
      this.pubsub.publish(SubscriptionTopics.APP_CREATED, <AppCreatedPayload>{
        appCreateLogs: {
          message: appId,
          type: 'end:success',
        },
      });
    } else if (res.stderr) {
      this.pubsub.publish(SubscriptionTopics.APP_CREATED, <AppCreatedPayload>{
        appCreateLogs: {
          message: 'Failed to create app',
          type: 'end:failure',
        },
      });
    }
  }*/

  onFailed(job: Job<QueueArgs, any>, error: Error) {
    this.pubsub.publish(SubscriptionTopics.APP_CREATED, <AppCreatedPayload>{
      appCreateLogs: {
        message: 'Failed to create an app',
        type: 'end:failure',
      },
    });
  }
}
