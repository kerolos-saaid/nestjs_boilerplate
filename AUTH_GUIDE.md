# Authentication & Authorization Boilerplate Guide

This guide explains the robust, type-safe, and scalable authorization system built into this NestJS boilerplate. It uses a powerful combination of **CASL** for permission management and **Prisma** for database interaction, providing both API-level and data-level security.

## Core Concepts

The authorization system is built on a few key concepts from CASL:

- **Abilities**: Represents what a user *can* or *cannot* do. In our app, this is represented by the `AppAbility` object.
- **Actions**: The operations a user can perform. We have a standard set defined in `src/casl/casl-ability.factory.ts` (`Manage`, `Create`, `Read`, `Update`, `Delete`).
- **Subjects**: The objects or entities the actions are performed on (e.g., `Post`, `User`, or `'all'`). These are automatically inferred from your Prisma schema.

---

## 1. Defining Permissions (`CaslAbilityFactory`)

The heart of the authorization logic lives in `src/casl/casl-ability.factory.ts`. This is where you define all permission rules for your application.

### How it Works

The `createForUser` method receives a `user` object and builds an `AppAbility` object for them using a `AbilityBuilder`.

**Example Rules:**

```typescript
// src/casl/casl-ability.factory.ts

// An ADMIN can do anything
if (user && user.role === 'ADMIN') {
  can(Action.Manage, 'all'); // 'manage' is a special keyword for any action
} else {
  // Anyone (even unauthenticated users) can read all posts
  can(Action.Read, 'Post');

  if (user) {
    // Authenticated users can create posts
    can(Action.Create, 'Post');

    // They can only manage posts they own.
    // This condition is used for both API-level checks and data-level filtering.
    can(Action.Manage, 'Post', { authorId: user.id });
  }
}
```

---

## 2. Securing Endpoints (API-Level Security)

You can protect your controller endpoints using the `PoliciesGuard` and the `@CheckPolicies` decorator.

### Pattern 1: Simple, Role-Based Checks

For actions that don't depend on a specific instance of a model (e.g., creating a post or listing all posts), you can use the `@CheckPolicies` decorator.

```typescript
// src/post/post.controller.ts

@Post()
@CheckPolicies((ability) => ability.can(Action.Create, 'Post'))
create(@Body() createPostDto: CreatePostDto, @Req() req: any) {
  // ...
}

@Get()
@CheckPolicies((ability) => ability.can(Action.Read, 'Post'))
findAll() {
  // ...
}
```

### Pattern 2: Instance-Based Checks (Ownership)

For actions that depend on the *state* of an object (e.g., updating or deleting a specific post), you must perform the check programmatically inside the controller method.

This pattern ensures you are checking against the actual database record.

```typescript
// src/post/post.controller.ts
import { subject } from '@casl/ability';

@Patch(':id')
async update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto, @Req() req: any) {
  // 1. Get the current user and their abilities
  const ability = this.caslAbilityFactory.createForUser(req.user);

  // 2. Fetch the resource from the database
  const postToUpdate = await this.postService.findOne({ id: +id });

  // 3. Check permission against the actual object
  if (ability.cannot(Action.Update, subject('Post', postToUpdate))) {
    throw new ForbiddenException('You do not have permission to update this post.');
  }

  // 4. Proceed with the update
  return this.postService.update({ where: { id: +id }, data: updatePostDto });
}
```
**Note**: The `subject()` helper from `@casl/ability` is used to correctly associate the plain object from Prisma with its subject type (`'Post'`).

---

## 3. Automatic Data-Level Security

One of the most powerful features of this boilerplate is the **automatic filtering of database queries**. You don't need to manually add `where` clauses to your service methods to hide data a user shouldn't see.

### How it Works

A custom **Prisma Middleware** (`src/prisma/prisma-query.middleware.ts`) intercepts every query sent by the `PrismaClient`.

1.  An `AuthMiddleware` runs on every request, determines the user's abilities, and stores them in a request-scoped context using `AsyncLocalStorage`.
2.  The Prisma Middleware retrieves the abilities for the current request.
3.  It uses CASL's `accessibleBy` function to generate a Prisma `WHERE` clause based on the user's `read` permissions.
4.  This `WHERE` clause is automatically appended to any `find`, `update`, or `delete` query, ensuring users can only see or modify records they have access to.

This means your `postService.findAll()` method is automatically secure without any extra code.

---

## 4. How to Extend the Boilerplate (e.g., Add `Comment`)

Adding authorization for a new entity is straightforward. Follow these steps:

**1. Update Prisma Schema:**
Add your new model to `prisma/schema.prisma`.

```prisma
model Comment {
  id        Int      @id @default(autoincrement())
  content   String
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  post      Post     @relation(fields: [postId], references: [id])
  postId    Int
  // ...
}
```
Then run `npx prisma migrate dev --name add_comment`.

**2. Update CASL Subjects:**
In `src/casl/casl-ability.factory.ts`, add your new model to the `Subjects` type.

```typescript
// src/casl/casl-ability.factory.ts
import { User, Post, Comment } from '@prisma/client'; // Add Comment

type Subjects = InferSubjects<typeof User | typeof Post | typeof Comment> | 'all'; // Add Comment
```

**3. Add New Rules:**
Still in `casl-ability.factory.ts`, add the rules for your new `Comment` subject.

```typescript
// src/casl/casl-ability.factory.ts

// Inside the createForUser method...
if (user) {
  // ... existing rules
  can(Action.Create, 'Comment');
  can(Action.Manage, 'Comment', { authorId: user.id }); // Users can manage their own comments
}
```

**4. Create the Module:**
Create the `CommentModule`, `CommentController`, and `CommentService` as you would for any other resource.

**5. Secure the Endpoints:**
Apply the security patterns described in **Section 2** to your new `CommentController`.

That's it! Both API-level and data-level security will now apply to the `Comment` entity.
