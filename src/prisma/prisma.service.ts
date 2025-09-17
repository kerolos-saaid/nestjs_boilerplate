import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RequestStorageService } from '../request-storage/request-storage.service';
import { createPrismaQueryMiddleware } from './prisma-query.middleware';
import { PrismaClientWithMiddleware } from './prisma-client.interface';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly storage: RequestStorageService) {
    super();
  }

  async onModuleInit() {
    (this as unknown as PrismaClientWithMiddleware).$use(
      createPrismaQueryMiddleware(this.storage),
    );
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
