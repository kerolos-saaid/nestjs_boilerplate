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
  can(Action.Manage, 'all');
} else {
  // Public, read-only access for everyone
  can(Action.Read, 'all');

  if (user) {
    // Authenticated users can...
    // Create new posts
    can(Action.Create, 'Post');

    // Manage their own posts
    can(Action.Manage, 'Post', { authorId: user.id });

    // They cannot delete posts that are not theirs (example of explicit denial)
    cannot(Action.Delete, 'Post', { authorId: { not: user.id } });
  }
}
```

---

## 2. Securing Endpoints (API-Level Security)

You can protect your controller endpoints using a combination of Guards and the `@CheckPolicies` decorator. For most protected routes, you'll want to apply guards at the controller level.

```typescript
// src/post/post.controller.ts
@Controller('posts')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class PostController {
  // ...
}
```

- **`JwtAuthGuard`**: This guard, provided by `@nestjs/passport`, ensures that the request has a valid JWT. It populates `req.user` with the user payload.
- **`PoliciesGuard`**: This is our custom guard that works with the `CaslAbilityFactory` to check permissions.

With these guards in place, you can now use the following patterns to secure individual endpoints.

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

One of the most powerful features of this boilerplate is the **automatic filtering of database queries**. You don't need to manually add `where` clauses to your service methods to ensure a user can only access the data they are permitted to see.

### How it Works

This is achieved through a combination of request-scoped storage and a custom Prisma middleware.

1.  **Request-Scoped Storage (`src/request-storage/request-storage.service.ts`)**
    - This service uses Node.js's `AsyncLocalStorage` to store data that is available for the entire lifecycle of a single request.
    - The `PoliciesGuard` (which runs on protected routes) calculates the current user's abilities using `CaslAbilityFactory`.
    - It then stores this `AppAbility` object in the `RequestStorageService`.

2.  **Prisma Middleware (`src/prisma/prisma-query.middleware.ts`)**
    - The `PrismaService` is also request-scoped. When it's instantiated for a request, it retrieves the user's `AppAbility` object from the `RequestStorageService`.
    - It then applies a custom middleware to its `PrismaClient` instance.
    - This middleware intercepts incoming Prisma queries (like `findMany`, `findUnique`, `update`, etc.).
    - It maps the Prisma action to a CASL `Action` (e.g., `findMany` -> `Action.Read`).
    - It then uses CASL's `accessibleBy(ability, action)` function to generate a Prisma `WHERE` clause based on the user's permissions for that action.
    - This `WHERE` clause is automatically merged into the original query's `where` condition using an `AND` operator.

**The result:** Any query executed via `PrismaService` is automatically filtered. For example, when you call `postService.findAll()`, the Prisma middleware transparently adds a condition like `{ authorId: currentUserId }` to the `findMany` query if the user is only allowed to see their own posts. This provides robust data-level security without any extra effort in your service files.

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
In `src/casl/casl-ability.factory.ts`, add your new model to the `AppSubjects` type. This makes CASL aware of the new entity.

```typescript
// src/casl/casl-ability.factory.ts
import { User, Post, Comment } from '@prisma/client'; // Add Comment
import { Subjects } from '@casl/prisma';

type AppSubjects = Subjects<{
  User: User;
  Post: Post;
  Comment: Comment; // Add Comment
}>;
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