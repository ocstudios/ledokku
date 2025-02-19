import { User as UserClass } from "@prisma/client";
import { Field, ID, ObjectType, registerEnumType } from "type-graphql";
import { GraphQLDateTime } from "../../utils";

@ObjectType()
export class User implements UserClass {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  email: string;

  @Field(() => Boolean)
  emailVerified: boolean;

  @Field(() => String, { nullable: true })
  image: string | null;

  @Field(() => String, { nullable: true })
  role: string | null;

  @Field(() => Boolean, { nullable: true })
  banned: boolean | null;

  @Field(() => String, { nullable: true })
  banReason: string | null;

  @Field(() => GraphQLDateTime, { nullable: true })
  banExpires: Date | null;

  @Field(() => GraphQLDateTime)
  createdAt: Date;

  @Field(() => GraphQLDateTime)
  updatedAt: Date;
}
