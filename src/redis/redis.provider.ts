
import { Provider } from '@nestjs/common';
import { Redis } from 'ioredis';
import * as fs from 'fs/promises';
import * as path from 'path';
import { RedisService } from './type/commands';

export const RedisProvider: Provider = {
  provide: RedisService,
  useFactory: async (): Promise<RedisService> => {
    const client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
    }) as RedisService;

    // Load reserve_seat.lua
    const luaPathReserve = path.join(process.cwd(), 'src', 'redis', 'lua', 'reserve_seat.lua');
    const luaScriptReserve = await fs.readFile(luaPathReserve, 'utf-8');

    // Load remove_seat.lua
    const luaPathRemove = path.join(process.cwd(), 'src', 'redis', 'lua', 'remove_seat.lua');
    const luaScriptRemove = await fs.readFile(luaPathRemove, 'utf-8');

    // Register custom command
    client.defineCommand(
      'reserveSeats', {
        lua: luaScriptReserve,
      },
    );

    client.defineCommand(
      'removeSeats', {
        lua: luaScriptRemove,
      },
    );

    // You can define more Lua scripts here in the future
    // client.defineCommand('releaseSeats', { lua: releaseScript });

    return client;
  },
};