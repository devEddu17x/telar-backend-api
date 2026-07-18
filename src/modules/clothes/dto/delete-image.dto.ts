import {
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class DeleteImageDTO {
  @IsNotEmpty()
  @IsString()
  @MinLength(1, { message: 'Name must be at least 1 character long' })
  @MaxLength(1000, { message: 'Name must be at most 1000 characters long' })
  @IsUrl()
  url: string;
}
