import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RequestStorageModule } from '../request-storage/request-storage.module';

@Module({
  imports: [RequestStorageModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
