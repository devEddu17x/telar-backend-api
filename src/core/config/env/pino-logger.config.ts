import { registerAs } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import type { LoggerOptions } from 'pino';

export const pinoLoggerConfig = registerAs('pino-logger', (): Params => {
  const logFormat = process.env.LOG_FORMAT ?? 'json';
  const logLevel = process.env.LOG_LEVEL ?? 'info';

  if (logFormat !== 'json' && logFormat !== 'pretty') {
    throw new Error('LOG_FORMAT must be either "json" or "pretty"');
  }

  // Base configuration for Pino HTTP
  const baseConfig: Params = {
    pinoHttp: {
      level: logLevel,
      autoLogging: {
        ignore: (req) => (req.url as string)?.includes('/health'),
      },
      quietReqLogger: true,
      customProps: (req: any) => ({
        context: 'HTTP',
        userAgent: req.headers['user-agent'],
        endpoint: `${req.method} ${req.url?.split('?')[0]}`,
      }),
      customSuccessMessage: (req: any, res: any) => {
        return `${req.method} ${req.url?.split('?')[0]} completed with ${res.statusCode}`;
      },
      customErrorMessage: (req: any, res: any, error: any) => {
        return `${req.method} ${req.url?.split('?')[0]} failed with ${res.statusCode}: ${error.message}`;
      },
      serializers: {
        req(req: any) {
          return {
            id: req.id,
            method: req.method,
            path: req.url?.split('?')[0],
            userAgent: req.headers['user-agent'],
            // Body is NOT logged here for security reasons (passwords, tokens, etc.)
            // Log body manually in controllers for specific safe endpoints only
          };
        },
        res(res: any) {
          return {
            statusCode: res.statusCode,
          };
        },
        err(error: any) {
          return {
            type: error.type,
            message: error.message,
            stack: error.stack,
          };
        },
      },
    } as LoggerOptions,
  };

  // Pino writes JSON to stdout by default. Pretty output is local-only by convention.
  if (logFormat === 'pretty') {
    (baseConfig.pinoHttp as any).transport = {
      level: 'debug',
      target: 'pino-pretty',
      options: {
        colorize: true,
        singleLine: true,
        translateTime: 'SYS:hh:MM:ss TT Z',
        messageFormat: '[{context}] {msg}',
        ignore: 'pid,hostname,context',
      },
    };
  }

  return baseConfig;
});

export default pinoLoggerConfig;
