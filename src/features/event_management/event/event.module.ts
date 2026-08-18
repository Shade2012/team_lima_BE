import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { R2StorageModule } from 'src/r2/r2-storage/r2-storage.module';

@Module({
  imports:[R2StorageModule],
  controllers: [EventController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
