import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsUniqueSeats(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUniqueSeats',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(seats: any[]) {
          if (!Array.isArray(seats)) return true;

          const seatIds = seats
            .map((seat) => seat?.seatId)
            .filter((id): id is string => Boolean(id));
          return new Set(seatIds).size === seatIds.length;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} contains duplicate seat selections`;
        },
      },
    });
  };
}