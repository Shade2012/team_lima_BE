import 'reflect-metadata';
import { validate } from 'class-validator';
import { IsAfter } from './is-after.validator';
import { Type } from 'class-transformer';

class TestEventDto {
  @Type(() => Date)
  startTime?: Date;

  @IsAfter('startTime', { message: 'endTime must be after startTime' })
  @Type(() => Date)
  endTime?: Date;
}

describe('IsAfter Validator', () => {
  it('should pass when endTime is after startTime', async () => {
    const dto = new TestEventDto();
    dto.startTime = new Date('2026-09-01T10:00:00.000Z');
    dto.endTime = new Date('2026-09-02T10:00:00.000Z');

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when endTime is before startTime', async () => {
    const dto = new TestEventDto();
    dto.startTime = new Date('2026-09-05T10:00:00.000Z');
    dto.endTime = new Date('2026-09-01T10:00:00.000Z');

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isAfter).toBe('endTime must be after startTime');
  });

  it('should fail when endTime is equal to startTime', async () => {
    const dto = new TestEventDto();
    dto.startTime = new Date('2026-09-01T10:00:00.000Z');
    dto.endTime = new Date('2026-09-01T10:00:00.000Z');

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass on partial update when endTime is provided but startTime is undefined', async () => {
    const dto = new TestEventDto();
    dto.endTime = new Date('2026-09-10T10:00:00.000Z');

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass on partial update when endTime is undefined', async () => {
    const dto = new TestEventDto();
    dto.startTime = new Date('2026-09-01T10:00:00.000Z');

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
