import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';

export class UpdateVariantDTO {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(1000)
  additional: number;
}
