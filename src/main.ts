import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  const configService = app.get(ConfigService);
  app.enableCors();
  app.setGlobalPrefix(configService.get('api').prefix);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  let config = new DocumentBuilder()
    .setTitle('Telar API')
    .setDescription('API documentation for the Telar application')
    .addBearerAuth()
    .setVersion('1.0.0');

  const apiStage = configService.get('api').stage;
  config = apiStage ? config.addServer(`/${apiStage}`) : config;

  const documentFactory = () =>
    SwaggerModule.createDocument(app, config.build());

  SwaggerModule.setup('docs', app, documentFactory, {
    useGlobalPrefix: true,
  });

  const PORT = configService.get('api').port;
  console.log(`Starting server on port ${PORT}...`);
  await app.listen(PORT);
}
bootstrap();
