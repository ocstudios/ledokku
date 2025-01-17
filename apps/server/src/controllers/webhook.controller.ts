import { $log, BodyParams, HeaderParams, RawBodyParams } from "@tsed/common";
import { Controller } from "@tsed/di";
import { InternalServerError, Unauthorized } from "@tsed/exceptions";
import { ContentType, Post, Returns } from "@tsed/schema";
import { verifyWebhookSecret } from "../lib/webhooks/verifyGithubSecret";
import { GithubRepository } from "./../modules/github/data/repositories/github.repository";

type GitNode = {
  id: number;
  node_id: string;
};

@Controller("/webhooks")
export class WebhookController {
  constructor(private githubRepository: GithubRepository) {}

  @Post()
  @ContentType("application/json")
  @Returns(200)
  async onMessage(
    @HeaderParams("x-github-event") githubEvent: string,
    @HeaderParams("x-hub-signature-256") secret: string,
    @BodyParams("installation") installation: GitNode,
    @BodyParams("repository") repository: GitNode,
    @BodyParams("ref") ref: string,
    @BodyParams("pusher") pusher: any,
    @RawBodyParams()
    rawBody: any
  ): Promise<any> {
    $log.info("installation", installation);
    $log.info("repository", repository);

    if (githubEvent === "push") {
      try {
        await this.handleWebhooks(
          secret,
          rawBody,
          installation.id.toString(),
          repository.id.toString(),
          ref.replace("refs/heads/", ""),
          pusher.name
        );
      } catch (e) {
        throw new InternalServerError(e);
      }
    }

    return { success: true };
  }

  async handleWebhooks(
    secret: string,
    rawBody: Buffer,
    installation: string,
    repository: string,
    branch: string,
    userName: string
  ) {
    const requestVerified = verifyWebhookSecret(secret, rawBody);

    if (!requestVerified) {
      throw new Unauthorized("Invalid request");
    }

    return this.githubRepository.deployRepository(
      installation,
      repository,
      branch,
      userName,
      false
    );
  }
}
 