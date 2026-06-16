import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsValidDeliveryDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidDeliveryDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (!value) return false;

          const datePart = value.split('T')[0];
          const deliveryDate = new Date(`${datePart}T00:00:00.000-05:00`);

          if (isNaN(deliveryDate.getTime())) {
            return false;
          }

          const peruDateString = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Lima',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date());

          const [month, day, year] = peruDateString.split('/');
          const currentPeruDate = new Date(
            `${year}-${month}-${day}T00:00:00.000-05:00`,
          );

          return deliveryDate >= currentPeruDate;
        },
        defaultMessage() {
          return `Date must be today or in the future based on Peru's local time (UTC-5)`;
        },
      },
    });
  };
}
