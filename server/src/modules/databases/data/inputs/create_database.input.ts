import { DbTypes } from '@prisma/client';
import { Field, InputType } from 'type-graphql';

@InputType()
export class CreateDatabaseInput {
  @Field((type) => String)
  name: string;

  @Field((type) => DbTypes)
  type: DbTypes;
}