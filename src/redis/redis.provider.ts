import { Provider } from "@nestjs/common"
import Redis from 'ioredis'
import * as fs from 'fs/promises';
import * as path from 'path';

export const REDIS_CLIENT = 'REDIS_CLIENT'

export const RedisProvider: Provider = {
    provide: REDIS_CLIENT,
    useFactory: async () =>  {
        const client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
            maxRetriesPerRequest: null
        })

        const luaPath = path.join(process.cwd(),'src', 'redis', 'lua', 'reserve_seat.lua');
        const luaScript = await fs.readFile(luaPath, 'utf-8');

        client.defineCommand('reserveSeats',{
            numberOfKeys:undefined,
            lua:luaScript
        })
        return client
    }
}