import { Module } from "@nestjs/common";
import { RedisProvider } from "./redis.provider";
import { RedisService } from "./type/commands";

@Module({
  providers: [RedisProvider],
  exports: [RedisService],
})
export class RedisIoModule {}