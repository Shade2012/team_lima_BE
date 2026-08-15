import { Prisma } from "@prisma/client";

export type EventWithCategories = Prisma.EventGetPayload<{
  include: {
    categories:true
  };
}>;