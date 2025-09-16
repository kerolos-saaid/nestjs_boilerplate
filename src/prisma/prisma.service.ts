import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RequestStorageService } from '../request-storage/request-storage.service';
import { createPrismaQueryMiddleware } from './prisma-query.middleware';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly storage: RequestStorageService) {
    super();
    this.$use(createPrismaQueryMiddleware(this.storage));
  }

  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
