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

  it('fails when the value is empty', async () => {
    const errors = await validate(buildDto(''));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails when the value is not a valid date', async () => {
    const errors = await validate(buildDto('not-a-date'));
    expect(errors.length).toBeGreaterThan(0);
  });

  it("fails when the date is before today's date in Peru (UTC-5)", async () => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 2);
    const pastDate = yesterday.toISOString().split('T')[0];

    const errors = await validate(buildDto(pastDate));

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toEqual(
      expect.objectContaining({
        isValidDeliveryDate: `Date must be today or in the future based on Peru's local time (UTC-5)`,
      }),
    );
  });

  it('passes when the date is in the future', async () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 10);
    const futureDate = future.toISOString().split('T')[0];

    const errors = await validate(buildDto(futureDate));

    expect(errors.length).toBe(0);
  });

  it('passes when the date uses a full ISO timestamp', async () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 10);
    const futureDate = `${future.toISOString().split('T')[0]}T15:30:00.000Z`;

    const errors = await validate(buildDto(futureDate));

    expect(errors.length).toBe(0);
  });
});
