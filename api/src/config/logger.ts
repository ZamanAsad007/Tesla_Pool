import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

let transport: pino.TransportSingleOptions | undefined = undefined;

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  try {
    require.resolve('pino-pretty');
    transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
      },
    };
  } catch {
    // Fall back to standard JSON logging if pino-pretty is not installed
    transport = undefined;
  }
}

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  transport,
  redact: ['req.headers.authorization', 'req.headers.cookie', 'password', 'passwordHash', 'token'],
});
