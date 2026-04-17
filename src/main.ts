import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true makes Nest's default JSON + urlencoded parsers also save
  // req.rawBody as a Buffer — which is what the Stripe webhook handler needs.
  // Adding a separate app.use('/payments/webhook', json(...)) here would register
  // body-parser's jsonParser in the router stack; Nest's isMiddlewareApplied check
  // would then skip registering its GLOBAL json parser, breaking body parsing on
  // every other route.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

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
      .addTag('health', 'Liveness probe for orchestrators')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Khata API Docs',
      customCss: ':root { color-scheme: light only; }',
      customJsStr: `
        (function () {
          function stripDarkMediaRules() {
            var sheets = Array.prototype.slice.call(document.styleSheets);
            for (var i = 0; i < sheets.length; i++) {
              try {
                var rules = sheets[i].cssRules;
                if (!rules) continue;
                for (var j = rules.length - 1; j >= 0; j--) {
                  var rule = rules[j];
                  if (rule.type === CSSRule.MEDIA_RULE &&
                      rule.media && rule.media.mediaText &&
                      /prefers-color-scheme:\\s*dark/i.test(rule.media.mediaText)) {
                    sheets[i].deleteRule(j);
                  }
                }
              } catch (e) { /* cross-origin sheet, skip */ }
            }
          }
          if (document.readyState === 'complete') stripDarkMediaRules();
          else window.addEventListener('load', stripDarkMediaRules);
        })();
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
