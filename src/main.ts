import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Stripe webhook needs raw body on its specific path; everything else is JSON.
  app.use('/payments/webhook', json({ type: 'application/json', verify: (req: any, _res, buf) => { req.rawBody = buf; } }));

  const envOrigins =
    process.env.FRONTEND_ORIGIN?.split(',') ?? ['http://localhost:3000'];
  const vercelPreview = /\.vercel\.app$/;
  app.enableCors({
    origin: (origin, callback) => {
      // Non-browser tools (curl, server-to-server) send no Origin header.
      if (!origin) return callback(null, true);
      if (envOrigins.includes(origin) || vercelPreview.test(new URL(origin).hostname)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.setGlobalPrefix('api', { exclude: ['payments/webhook'] });

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Khata API')
      .setDescription(
        'REST API for the Dokan Loyalty & Event Platform. Lets shopkeepers (DOKANDAR) ' +
          'create events at their Dokan, customers (GRAHOK) book and pay, and earn loyalty tiers ' +
          '(NEW -> REGULAR -> VIP). Includes invitations, reviews, Stripe payments, and admin moderation.' +
          '\n\n**Auth:** JWT bearer token from `POST /auth/login`. Send as `Authorization: Bearer <token>`.' +
          '\n\n**Roles:** `GRAHOK` (customer), `DOKANDAR` (shopkeeper), `SUPER_ADMIN`.',
      )
      .setVersion('1.0.0')
      .setContact('Khata Team', '', '')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addServer('/api', 'API base path')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT obtained from POST /auth/login',
        },
        'bearer',
      )
      .addTag('auth', 'Register, login, and current-user lookup')
      .addTag('dokans', 'Public dokan listings + Dokandar self-management')
      .addTag('dokan-events', 'Public event listings + Dokandar event CRUD')
      .addTag('bookings', 'Customer booking flows + Dokandar approval queue')
      .addTag(
        'customer-khatas',
        'Loyalty ledger per (Customer, Dokan) pair',
      )
      .addTag(
        'invitations',
        'Dokandar-issued invites that bypass tier checks',
      )
      .addTag('reviews', 'Post-attendance reviews with 24h edit window')
      .addTag('admin', 'SUPER_ADMIN moderation endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Khata API Docs',
      customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title { font-family: 'Fraunces', Georgia, serif; }
        body { background: #FAF6F0; }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  console.log(`Khata API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
