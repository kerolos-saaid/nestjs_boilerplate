import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('OAuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/google (GET)', () => {
    it('should redirect to Google for authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/google')
        .expect(302);

      expect(response.headers.location).toContain('accounts.google.com');
    });
  });

  describe('/auth/apple (GET)', () => {
    it('should redirect to Apple for authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/apple')
        .expect(302);

      expect(response.headers.location).toContain('appleid.apple.com');
    });
  });
});
