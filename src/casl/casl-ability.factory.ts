import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  createPrismaAbility,
  PrismaQuery,
  AbilityClass,
  ExtractSubjectType,
  InferSubjects,
} from '@casl/prisma';
import { User, Post } from '@prisma/client';

// Define the actions users can perform
export enum Action {
  Manage = 'manage', // Special keyword in CASL for "any action"
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

// Define the subjects (entities) that can have permissions
// We use InferSubjects to automatically infer the subject types from our Prisma models
// and explicitly add 'all' for global permissions.
type Subjects = InferSubjects<typeof User | typeof Post> | 'all';

// Define the Ability type for our application, including Prisma-specific extensions
export type AppAbility = AbilityClass<[Action, Subjects], PrismaQuery>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: User | undefined) {
    // AbilityBuilder allows us to define rules in a declarative way
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      createPrismaAbility,
    );

    if (user && user.role === 'ADMIN') {
      // Admins can perform any action on any subject
      can(Action.Manage, 'all');
    } else {
      // Public, read-only access for everyone
      can(Action.Read, 'all');

      if (user) {
        // Authenticated users can...
        // Create new posts
        can(Action.Create, 'Post');

        // Manage their own posts
        // The second argument is a condition object that will be used for checking permissions
        // and for creating Prisma WHERE clauses.
        can(Action.Manage, 'Post', { authorId: user.id });

        // They cannot delete posts that are not theirs (example of explicit denial)
        cannot(Action.Delete, 'Post', { authorId: { not: user.id } });
      }
    }

    // Build and return the final ability object
    return build({
      // This function is used to detect the subject type for a given object
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
