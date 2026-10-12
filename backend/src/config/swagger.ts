import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureSwagger(app: INestApplication): void {
  if (process.env.SWAGGER_ENABLED === 'false') return;
  const config = new DocumentBuilder()
    .setTitle('English Academy API')
    .setVersion('0.1.0')
    .setDescription('Local API testing: create an account using AUTH.md, execute login, copy data.accessToken into Authorize (token only), then call me. Use data.refreshToken for refresh/logout. Replace BOTH tokens after refresh. Responses follow BE-003; roles are enforced by the backend. No default accounts are seeded.')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: '/docs-json', raw: ['json'],
    customSiteTitle: 'English Academy — API',
    swaggerOptions: { persistAuthorization: false, displayRequestDuration: true, supportedSubmitMethods: ['get', 'post', 'patch', 'delete'] },
  });
}
