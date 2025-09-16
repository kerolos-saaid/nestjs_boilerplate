import { Module } from '@nestjs/common';
import { RequestStorageService } from './request-storage.service';

@Module({
  providers: [RequestStorageService],
  exports: [RequestStorageService],
})
export class RequestStorageModule {}
