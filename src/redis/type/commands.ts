import { Redis as IoredisClient } from 'ioredis';

export interface CustomRedisCommands {
  reserveSeats(
    ...args: (string | number)[]
  ): Promise<[status: number, messageOrTtl: string, extraInfo?: string]>;

  removeSeats(
    ...args: (string | number)[]
  ): Promise<[status: number, messageOrTtl: string, extraInfo?: string]>;
  
  // You can add your future Lua script here later:
  // releaseSeats(...args: (string | number)[]): Promise<any>;
}
export abstract class RedisService extends IoredisClient {}

export interface RedisService extends CustomRedisCommands {}