الدليل الكامل لإنشاء NestJS Boilerplate احترافيهذا الدليل يوفر لك خطوات مفصلة لإنشاء مشروع أساس (Boilerplate) قوي وقابل للتطوير باستخدام NestJS، مع التركيز على أفضل الممارسات في هيكلة المشروع، الأمان، التعامل مع قاعدة البيانات، والنشر.المتطلبات الأساسيةقبل البدء، تأكد من تثبيت الأدوات التالية على جهازك:Node.js (إصدار 18 أو أحدث)Docker و Docker ComposeNestJS CLI: npm i -g @nestjs/cliالخطوة 1: تهيئة المشروع الأساسيلنبدأ بإنشاء مشروع NestJS جديد.أنشئ المشروع:nest new nestjs-boilerplate
(عندما يسألك، اختر npm كمدير للحزم)ادخل إلى مجلد المشروع:cd nestjs-boilerplate
الخطوة 2: إعداد Prisma وقاعدة البياناتسنقوم بإعداد قاعدة بيانات PostgreSQL لتعمل داخل Docker ونهيئ Prisma للتواصل معها.ثبّت اعتماديات Prisma:npm install @prisma/client
npm install prisma --save-dev
هيّئ Prisma:npx prisma init --datasource-provider postgresql
(سينتج عن هذا الأمر مجلد prisma وملف .env)أنشئ ملف docker-compose.yml في المجلد الرئيسي للمشروع. هذا الملف سيسمح لك بتشغيل قاعدة البيانات وتطبيقك معًا بسهولة.# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:15
    container_name: postgres_db_dev
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
عدّل prisma/schema.prisma لتعريف الموديلات الأساسية.// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  posts     Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
}

enum Role {
  USER
  ADMIN
}
املأ ملف .env بالبيانات التالية. (من الجيد أيضًا إنشاء نسخة باسم .env.example بدون القيم الفعلية لوضعها على Git).# .env
# Application Config
NODE_ENV=development
PORT=3000

# Database Config - Should match docker-compose.yml
POSTGRES_DB=nestjs_db
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
DATABASE_URL="postgresql://admin:admin@localhost:5432/nestjs_db?schema=public" # For local migration

# JWT Config
JWT_SECRET=your-super-secret-key-that-is-at-least-32-characters-long
JWT_EXPIRATION_TIME=3600s
ملاحظة هامة: الـ DATABASE_URL هنا يستخدم localhost لتشغيل أوامر migrate من جهازك. سنحتاج إلى نسخة أخرى عند التشغيل داخل Docker لاحقًا.شغّل قاعدة البيانات وقم بأول تهجير (Migration):docker-compose up -d db
npx prisma migrate dev --name init
الخطوة 3: إعداد الوحدات الأساسية والأدوات المشتركةسنبني الآن الهيكل الذي سيجعل تطبيقنا قويًا ومتسقًا.ثبّت الاعتماديات اللازمة:npm install @nestjs/config joi class-validator class-transformer @nestjs/passport @nestjs/jwt passport passport-local passport-jwt bcrypt
npm install @types/joi @types/passport-local @types/passport-jwt @types/bcrypt --save-dev
أنشئ الهيكل العام للمجلدات:mkdir -p src/common/{filters,interceptors}
mkdir -p src/core/auth
mkdir -p src/providers/database
أنشئ أدوات عالمية لمعالجة الاستجابات والأخطاء في مجلد src/common/.(استخدم الكود الذي أنشأناه سابقًا لملفات all-exceptions.filter.ts و transform.interceptor.ts)حدّث src/main.ts لتطبيق هذه الأدوات عالميًا.حدّث src/app.module.ts لتضمين ConfigModule مع التحقق من صحة متغيرات البيئة باستخدام Joi.الخطوة 4: بناء نظام الصلاحيات المتقدم باستخدام CASLسنستبدل أنظمة الحماية التقليدية بنظام CASL الأكثر قوة ومرونة.ثبّت CASL:npm install @casl/ability
أنشئ مجلد casl داخل src/core/auth.أنشئ "مصنع القدرات" casl-ability.factory.ts:(استخدم الكود الموجود في الملف الذي نعمل عليه src/core/auth/casl/casl-ability.factory.ts). هذا هو الملف الذي يعرّف من يمكنه فعل ماذا.أنشئ مجلد guards و decorators داخل src/core/auth.أنشئ PoliciesGuard و CheckPolicies decorator:(استخدم الكود الذي أنشأناه سابقًا لهذين الملفين). هذه هي الأدوات التي ستسمح لنا بتطبيق القواعد في الـ controllers.أنشئ CaslModule لتوفير الـ CaslAbilityFactory لبقية التطبيق.// src/core/auth/casl/casl.module.ts
import { Module } from '@nestjs/common';
import { CaslAbilityFactory } from './casl-ability.factory';

@Module({
  providers: [CaslAbilityFactory],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
الخطوة 5: بناء وحدة المصادقة (Authentication)سنقوم ببناء وحدة Auth كاملة مع JwtStrategy و LocalStrategy.أنشئ وحدة AuthModule في src/core/auth. قم بتضمين PassportModule, JwtModule و CaslModule.أنشئ JwtStrategy للتحقق من صحة التوكنات.أنشئ AuthService الذي سيحتوي على منطق تسجيل الدخول والتحقق من كلمة المرور.أنشئ AuthController الذي سيحتوي على endpoint لتسجيل الدخول (/auth/login).الخطوة 6: Dockerize The Applicationالآن، لنجعل تطبيقنا قابلاً للنقل والنشر في أي مكان.أنشئ ملف .dockerignore:.git
node_modules
dist
.env
أنشئ ملف Dockerfile للإنتاج.# Dockerfile
# ---- Builder Stage ----
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Production Stage ----
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
# نسخ الـ schema ضروري لتشغيل Prisma Client في بيئة الإنتاج
COPY --from=builder /app/prisma ./prisma

# استخدم مستخدمًا غير الـ root لمزيد من الأمان
USER node

CMD ["node", "dist/main"]
الخطوة 7: التشغيل والاختبارللتشغيل في بيئة التطوير:تأكد من تعديل DATABASE_URL في ملف .env ليشير إلى db (اسم الخدمة في docker-compose.yml) بدلاً من localhost.DATABASE_URL="postgresql://admin:admin@db:5432/nestjs_db?schema=public"
ثم شغّل الأمر:docker-compose up --build
للنشر في بيئة الإنتاج:docker build -t nestjs-api-prod .
docker run -p 3000:3000 --env-file .env nestjs-api-prod
بهذه الخطوات، تكون قد أنشأت مشروع أساس قوي، آمن، وقابل للتطوير، جاهز ليكون نقطة انطلاق لأي مشروع NestJS مستقبلي.