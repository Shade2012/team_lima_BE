import { Prisma } from "@prisma/client";

export type TicketCategoryWithCount = Prisma.TicketCategoryGetPayload<{
  include: {
    _count: {
      select: {
        tickets: true;
      };
    };
  };
}>;