import { Prisma } from "@prisma/client";

export type OrderWithTickets = Prisma.OrderGetPayload<{
  include: {
    tickets: {
      select: { id: true; categoryId: true };
    };
  };
}>;