import { Module } from '@nestjs/common';
import {
  ConfigService,
  ConfigModule as NestConfigModule,
} from '@nestjs/config';
import * as config from './env';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: [
        '.env.local',
        '.env.development.local',
        '.env.production.local',
      ],
      isGlobal: true,
      load: [
        config.typeormConfig,
        config.cookieConfig,
        config.apiConfig,
        config.pinoLoggerConfig,
        config.s3Config,
        config.emailConfig,
        config.cognitoConfig,
      ],
    }),
    LoggerModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return configService.get('pino-logger');
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return configService.get('typeorm');
      },
      inject: [ConfigService],
    }),
  ],
})
export class ConfigModule {}
