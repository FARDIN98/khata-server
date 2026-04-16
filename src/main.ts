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
      .setDescription('Dokan Loyalty & Event Platform API')
      .setVersion('1.0')
      .addServer('/api')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Khata API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
