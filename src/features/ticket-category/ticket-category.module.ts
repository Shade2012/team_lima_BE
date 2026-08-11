import { Module } from '@nestjs/common';
import { TicketCategoryService } from './ticket-category.service';
import { TicketCategoryController } from './ticket-category.controller';
import { EventModule } from 'src/features/event/event.module';

@Module({
  imports: [EventModule],
  controllers: [TicketCategoryController],
  providers: [TicketCategoryService],
  exports: [TicketCategoryService],
})
export class TicketCategoryModule {}
