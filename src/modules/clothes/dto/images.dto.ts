import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ALLOWED_IMAGES } from 'src/modules/clothes/enum/allowed-images.enum';

export class AllowedImagesDTO {
  @IsNotEmpty()
  @IsString()
  @MinLength(1, { message: 'Filename must be at least 1 character long' })
  @MaxLength(255, { message: 'Filename must be at most 255 characters long' })
  filename: string;
  @IsNotEmpty()
  @IsEnum(ALLOWED_IMAGES)
  contentType: ALLOWED_IMAGES;
}
