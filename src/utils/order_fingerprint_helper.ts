import { createHash } from 'crypto';
import { CreateTicketDto } from 'src/features/transaction/ticket/dto/create-ticket.dto';

export interface ReservationFingerprintSeat {
  seatId: string | null;
  categoryId: string;
}

export interface ReservationFingerprintData {
  customerId: string;
  eventId: string;
  seats: ReservationFingerprintSeat[];
}

export function createReservationFingerprintData(
  customerId: string,
  eventId: string,
  seats: CreateTicketDto[],
): ReservationFingerprintData {
  return {
    customerId,
    eventId,
    seats: seats
      .map(({ seatId, categoryId }) => ({
        seatId: seatId ?? null,
        categoryId,
      }))
      .sort((a, b) => {
        const aKey = `${a.categoryId}:${a.seatId ?? ''}`;
        const bKey = `${b.categoryId}:${b.seatId ?? ''}`;

        return aKey.localeCompare(bKey);
      }),
  };
}

export function createReservationFingerprint(
  data: ReservationFingerprintData,
): string {
  return createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
}