import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(Logger);
  app.useLogger(logger);
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
    .setDescription('API documentation for the Telar web application')
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
  await app.listen(PORT);
  logger.log(`App is listening on port ${PORT}`);
}
bootstrap();
