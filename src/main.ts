import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { apiReference } from '@scalar/nestjs-api-reference';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter());

  // 创建Swagger文档配置
  const config = new DocumentBuilder()
    .setTitle('FlowInOne API')
    .setDescription('FlowInOne API文档')
    .setVersion('1.0')
    .build();

  // 创建Swagger文档
  const document = SwaggerModule.createDocument(app, config);
  app.use(
    '/api-reference',
    apiReference({
      content: document,
      withFastify: true,
    }),
  );

  //   // 配置Scalar API文档
  //   // 注册Scalar API Reference作为Fastify插件
  //   app
  //     .getHttpAdapter()
  //     .getInstance()
  //     .register(async (fastifyInstance: any, _opts: any) => {
  //       fastifyInstance.get('/api-reference', async (_req: any, res: any) => {
  //         const html = `<!DOCTYPE html>
  // <html>
  // <head>
  //   <title>Scalar API Reference</title>
  //   <meta charset="utf-8" />
  //   <meta name="viewport" content="width=device-width, initial-scale=1" />
  // </head>
  // <body>
  //   <div id="api-reference"></div>
  //   <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  //   <script>
  //     const spec = ${JSON.stringify(document)};
  //     Scalar.createApiReference('#api-reference', {
  //       theme: 'default',
  //       spec: spec
  //     });
  //   </script>
  // </body>
  // </html>`;
  //         res.header('Content-Type', 'text/html; charset=utf-8');
  //         res.send(html);
  //       });
  //     });

  await app.listen(process.env.PORT ?? 5000, '0.0.0.0');
  console.log(`应用已在端口 ${process.env.PORT ?? 5000} 上启动`);
}
bootstrap();
