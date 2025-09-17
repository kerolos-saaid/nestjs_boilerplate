import { Prisma } from '@prisma/client';

export type PrismaClientWithMiddleware = {
  $use(middleware: Prisma.Middleware): void;
};
