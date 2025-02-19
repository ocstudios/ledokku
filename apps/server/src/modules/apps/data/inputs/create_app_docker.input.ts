import { Field, ID, InputType } from "type-graphql";
import { BuildEnvVar } from "./build_env_var.input";

@InputType()
export class CreateAppDockerInput {
  @Field((type) => String)
  name: string;

  @Field((type) => String)
  image: string;

  @Field((type) => String)
  version: string;

  @Field((type) => ID, { nullable: true })
  databaseId?: string;

  @Field((type) => [BuildEnvVar], { nullable: true })
  envVars?: BuildEnvVar[];

  @Field((type) => [String], { nullable: true })
  tags?: string[];
}
