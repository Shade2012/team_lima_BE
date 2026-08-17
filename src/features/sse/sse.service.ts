import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable, merge, interval } from 'rxjs';
import { map, finalize } from 'rxjs/operators';
import { PrismaService } from 'src/prisma/prisma.service';

export interface SeatUpdatePayload {
  type: 'SEAT_UPDATE';
  data: {
    seats: Array<{
      seatId: string | null;
      seatCode: string | null;
      categoryId: string;
      status: 'AVAILABLE' | 'HELD' | 'BOOKED';
    }>;
    categories: Array<{
      categoryId: string;
      categoryName: string;
      availableQuota: number;
      totalQuota: number;
    }>;
  };
  timestamp: string;
}

export interface DashboardUpdatePayload {
  type: 'DASHBOARD_UPDATE';
  action: 'ORDER_CREATED' | 'ORDER_PAID' | 'ORDER_CANCELLED' | 'ORDER_EXPIRED' | 'REFUND_APPROVED';
  data: {
    categories: Array<{
      categoryId: string;
      categoryName: string;
      availableQuota: number;
      totalQuota: number;
    }>;
    totalAvailable: number;
    totalQuota: number;
    totalRevenue: number;
    totalTicketsSold: number;
  };
  timestamp: string;
}

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);

  // Channels per eventId
  private seatSubjects = new Map<string, Subject<MessageEvent>>();
  private dashboardSubjects = new Map<string, Subject<MessageEvent>>();

  constructor(private readonly prisma: PrismaService) {}

  private getSeatSubject(eventId: string): Subject<MessageEvent> {
    if (!this.seatSubjects.has(eventId)) {
      this.seatSubjects.set(eventId, new Subject<MessageEvent>());
    }
    return this.seatSubjects.get(eventId)!;
  }

  private getDashboardSubject(eventId: string): Subject<MessageEvent> {
    if (!this.dashboardSubjects.has(eventId)) {
      this.dashboardSubjects.set(eventId, new Subject<MessageEvent>());
    }
    return this.dashboardSubjects.get(eventId)!;
  }

  // --- Emit Methods ---

  async emitSeatUpdate(
    eventId: string,
    seats: Array<{ seatId: string | null; seatCode: string | null; categoryId: string; status: 'AVAILABLE' | 'HELD' | 'BOOKED' }>,
  ) {
    if (!this.seatSubjects.has(eventId)) {
      return; // No active listeners
    }

    try {
      const categories = await this.getCategoryQuotas(eventId);
      
      const payload: SeatUpdatePayload = {
        type: 'SEAT_UPDATE',
        data: {
          seats,
          categories,
        },
        timestamp: new Date().toISOString(),
      };

      this.seatSubjects.get(eventId)!.next({ data: payload } as MessageEvent);
      this.logger.debug(`Emitted SEAT_UPDATE for event ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to emit seat update for event ${eventId}`, error);
    }
  }

  async emitDashboardUpdate(
    eventId: string,
    action: DashboardUpdatePayload['action']
  ) {
    if (!this.dashboardSubjects.has(eventId)) {
      return;
    }

    try {
      const { categories, totalAvailable, totalQuota, totalRevenue, totalTicketsSold } = await this.getDashboardAggregates(eventId);

      const payload: DashboardUpdatePayload = {
        type: 'DASHBOARD_UPDATE',
        action,
        data: {
          categories,
          totalAvailable,
          totalQuota,
          totalRevenue,
          totalTicketsSold,
        },
        timestamp: new Date().toISOString(),
      };

      this.dashboardSubjects.get(eventId)!.next({ data: payload } as MessageEvent);
      this.logger.debug(`Emitted DASHBOARD_UPDATE (${action}) for event ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to emit dashboard update for event ${eventId}`, error);
    }
  }

  // --- Subscription Methods ---

  subscribeSeat(eventId: string): Observable<MessageEvent> {
    this.logger.log(`New subscriber for seats of event ${eventId}`);
    
    const subject = this.getSeatSubject(eventId);
    const keepAlive = this.createKeepAlive();
    
    return merge(subject.asObservable(), keepAlive).pipe(
      finalize(() => this.handleClientDisconnect(eventId, 'seats'))
    );
  }

  subscribeDashboard(eventId: string): Observable<MessageEvent> {
    this.logger.log(`New subscriber for dashboard of event ${eventId}`);
    
    const subject = this.getDashboardSubject(eventId);
    const keepAlive = this.createKeepAlive();
    
    return merge(subject.asObservable(), keepAlive).pipe(
      finalize(() => this.handleClientDisconnect(eventId, 'dashboard'))
    );
  }

  // --- Helpers ---

  private createKeepAlive(): Observable<MessageEvent> {
    // Send a keep-alive ping every 30 seconds
    return interval(30_000).pipe(
      map(() => ({ data: { type: 'ping', message: 'keep-alive' } } as any as MessageEvent))
    );
  }

  private handleClientDisconnect(eventId: string, type: 'seats' | 'dashboard') {
    this.logger.log(`Client disconnected from ${type} of event ${eventId}`);
  }

  private async getCategoryQuotas(eventId: string) {
    const categories = await this.prisma.ticketCategory.findMany({
      where: { eventId },
      select: { id: true, name: true, totalQuota: true },
    });

    const activeTicketsCount = await this.prisma.ticket.groupBy({
      by: ['categoryId'],
      where: {
        categoryId: { in: categories.map(c => c.id) },
        status: { not: 'REFUND' },
        order: { status: { in: ['HELD', 'PAYMENT_PENDING', 'PAID', 'PARTIAL_REFUND'] } },
      },
      _count: true,
    });

    const activeMap = new Map<string, number>();
    for (const group of activeTicketsCount) {
      activeMap.set(group.categoryId, group._count);
    }

    return categories.map(cat => {
      const active = activeMap.get(cat.id) || 0;
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        availableQuota: Math.max(0, cat.totalQuota - active),
        totalQuota: cat.totalQuota,
      };
    });
  }

  private async getDashboardAggregates(eventId: string) {
    const categories = await this.getCategoryQuotas(eventId);
    
    let totalAvailable = 0;
    let totalQuota = 0;
    
    for (const cat of categories) {
      totalAvailable += cat.availableQuota;
      totalQuota += cat.totalQuota;
    }

    const revenueResult = await this.prisma.payment.aggregate({
      where: { order: { eventId }, status: 'SUCCESS' },
      _sum: { amount: true },
    });

    const ticketsSoldResult = await this.prisma.ticket.count({
      where: {
        category: { eventId },
        status: { not: 'REFUND' },
        order: { status: { in: ['PAID', 'PARTIAL_REFUND'] } }
      }
    });

    return {
      categories,
      totalAvailable,
      totalQuota,
      totalRevenue: revenueResult._sum.amount || 0,
      totalTicketsSold: ticketsSoldResult,
    };
  }
}
