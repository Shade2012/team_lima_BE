import { Controller, Get, Param, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';
import { Public } from 'src/decorators/public.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoleExt } from 'src/decorators/user_role_ext.decorator';
import { Role } from '@prisma/client';

@ApiTags('SSE')
@Controller('sse/events/:eventId')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Get('seats')
  @Public()
  @Sse()
  @ApiOperation({ summary: 'Stream seat availability updates for an event (Public)' })
  streamSeats(@Param('eventId') eventId: string): Observable<MessageEvent> {
    return this.sseService.subscribeSeat(eventId);
  }

  @Get('dashboard')
  @ApiBearerAuth()
  @UserRoleExt(Role.ORGANIZER, Role.ADMIN)
  @Sse()
  @ApiOperation({ summary: 'Stream aggregate dashboard updates for an event (Organizer/Admin only)' })
  streamDashboard(@Param('eventId') eventId: string): Observable<MessageEvent> {
    return this.sseService.subscribeDashboard(eventId);
  }
}
