import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CaslModule } from './casl/casl.module';
import { PostModule } from './post/post.module';
import { PrismaModule } from './prisma/prisma.module';
import { RequestStorageModule } from './request-storage/request-storage.module';
import { AuthMiddleware } from './auth/auth.middleware';

@Module({
  imports: [
    CaslModule,
    PostModule,
    PrismaModule,
    RequestStorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
