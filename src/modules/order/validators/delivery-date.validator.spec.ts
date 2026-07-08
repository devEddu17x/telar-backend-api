import { validate } from 'class-validator';
import { IsValidDeliveryDate } from './delivery-date.validator';

class DummyDTO {
  @IsValidDeliveryDate({
    message: `Date must be today or in the future based on Peru's local time (UTC-5)`,
  })
  deliveryDate: string;
}

describe('IsValidDeliveryDate', () => {
  const buildDto = (deliveryDate: any): DummyDTO => {
    const dto = new DummyDTO();
    dto.deliveryDate = deliveryDate;
    return dto;
  };

  it('falla si el valor está vacío', async () => {
    const errors = await validate(buildDto(''));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('falla si el valor no es una fecha válida', async () => {
    const errors = await validate(buildDto('no-es-una-fecha'));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('falla si la fecha es anterior al día de hoy en Perú (UTC-5)', async () => {
    const ayer = new Date();
    ayer.setUTCDate(ayer.getUTCDate() - 2); // margen de sobra para cubrir el offset de zona horaria
    const fechaPasada = ayer.toISOString().split('T')[0];

    const errors = await validate(buildDto(fechaPasada));

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toEqual(
      expect.objectContaining({
        isValidDeliveryDate: `Date must be today or in the future based on Peru's local time (UTC-5)`,
      }),
    );
  });

  it('pasa si la fecha es futura', async () => {
    const futuro = new Date();
    futuro.setUTCDate(futuro.getUTCDate() + 10);
    const fechaFutura = futuro.toISOString().split('T')[0];

    const errors = await validate(buildDto(fechaFutura));

    expect(errors.length).toBe(0);
  });

  it('pasa si se envía la fecha con formato ISO completo (con hora)', async () => {
    const futuro = new Date();
    futuro.setUTCDate(futuro.getUTCDate() + 10);
    const fechaFutura = `${futuro.toISOString().split('T')[0]}T15:30:00.000Z`;

    const errors = await validate(buildDto(fechaFutura));

    expect(errors.length).toBe(0);
  });
});
