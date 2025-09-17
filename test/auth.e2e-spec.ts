import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('/auth/signup (POST)', () => {
    it('should create a new user and return it', async () => {
      const signupDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.email).toEqual(signupDto.email);
      expect(response.body.password).toBeUndefined();
    });

    it('should return a 400 error if the email is already taken', async () => {
      const signupDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(400);
    });
  });

  describe('/auth/signin (POST)', () => {
    it('should return a JWT token', async () => {
      const signupDto = {
        name: 'Signin User',
        email: 'signin@example.com',
        password: 'password123',
      };

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(201);

      const signinDto = {
        email: 'signin@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .send(signinDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.access_token).toBeDefined();
    });

    it('should return a 401 error with invalid credentials', async () => {
      const signinDto = {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      };

      await request(app.getHttpServer())
        .post('/auth/signin')
        .send(signinDto)
        .expect(401);
    });
  });
});
