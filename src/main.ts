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
        :root, html, body { color-scheme: light only !important; }
        body { background: #FAF6F0 !important; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title { font-family: 'Fraunces', Georgia, serif; }

        /* Neutralize Swagger UI 5's built-in dark mode (prefers-color-scheme: dark). */
        @media (prefers-color-scheme: dark) {
          html, body { background: #FAF6F0 !important; color: #1a1a1a !important; }
          .swagger-ui, .swagger-ui .info, .swagger-ui .info .title,
          .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info table,
          .swagger-ui .scheme-container, .swagger-ui .scheme-container .schemes > label,
          .swagger-ui .opblock-tag, .swagger-ui .opblock-tag small,
          .swagger-ui .opblock .opblock-summary-description,
          .swagger-ui .opblock .opblock-summary-path,
          .swagger-ui .opblock .opblock-summary-path__deprecated,
          .swagger-ui .opblock .opblock-section-header h4,
          .swagger-ui .opblock-description-wrapper, .swagger-ui .opblock-external-docs-wrapper,
          .swagger-ui .opblock-title_normal, .swagger-ui .responses-inner h4,
          .swagger-ui .responses-inner h5, .swagger-ui .response-col_status,
          .swagger-ui .response-col_description, .swagger-ui .response-col_links,
          .swagger-ui .parameter__name, .swagger-ui .parameter__type,
          .swagger-ui .parameter__in, .swagger-ui .parameter__deprecated,
          .swagger-ui .tab li, .swagger-ui .tab li button.tablinks,
          .swagger-ui table thead tr td, .swagger-ui table thead tr th,
          .swagger-ui table tbody tr td, .swagger-ui label,
          .swagger-ui .servers > label, .swagger-ui .servers-title,
          .swagger-ui .filter .operation-filter-input,
          .swagger-ui .model, .swagger-ui .model-title, .swagger-ui section.models h4,
          .swagger-ui section.models h5, .swagger-ui .model-toggle::after,
          .swagger-ui .markdown p, .swagger-ui .markdown li,
          .swagger-ui .renderedMarkdown p, .swagger-ui .renderedMarkdown li,
          .swagger-ui .btn, .swagger-ui .dialog-ux .modal-ux-header h3,
          .swagger-ui .dialog-ux .modal-ux-content p,
          .swagger-ui .auth-container h4, .swagger-ui .auth-container label {
            color: #1a1a1a !important;
          }
          .swagger-ui .scheme-container, .swagger-ui .opblock-tag,
          .swagger-ui section.models, .swagger-ui .opblock,
          .swagger-ui .opblock .opblock-section-header,
          .swagger-ui .filter-container, .swagger-ui .dialog-ux .modal-ux,
          .swagger-ui .dialog-ux .modal-ux-header, .swagger-ui .dialog-ux .modal-ux-content,
          .swagger-ui .auth-container, .swagger-ui select {
            background: #ffffff !important;
          }
          .swagger-ui input[type=text], .swagger-ui input[type=password],
          .swagger-ui input[type=search], .swagger-ui input[type=email],
          .swagger-ui textarea, .swagger-ui select {
            background: #ffffff !important; color: #1a1a1a !important;
            border: 1px solid #d9d2c4 !important;
          }
          .swagger-ui .info code, .swagger-ui .markdown code,
          .swagger-ui .renderedMarkdown code, .swagger-ui .response-col_description code {
            background: #f3efe7 !important; color: #1a1a1a !important;
          }
          .swagger-ui .info a, .swagger-ui a { color: #0a6b6b !important; }
          .swagger-ui svg:not(:root) { fill: #1a1a1a !important; }
          .swagger-ui .opblock-summary-method { color: #ffffff !important; }
        }
      `,
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
                      rule.media.mediaText.indexOf('prefers-color-scheme: dark') !== -1 &&
                      sheets[i].href && sheets[i].href.indexOf('swagger-ui') !== -1) {
                    sheets[i].deleteRule(j);
                  }
                }
              } catch (e) { /* CORS-restricted sheet, skip */ }
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
