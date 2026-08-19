export type EventWithImage = {
  id: string;
  organizerId: string;
  name: string;
  imageKey: string | null;
  description: string | null;
  salesStartTime: Date;
  salesEndTime: Date;
  eventDate: Date;
  refundEndDate: Date;
  refundPolicy: string;
  createdAt: Date;
  updatedAt: Date;
};