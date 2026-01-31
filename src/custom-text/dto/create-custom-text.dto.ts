import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCustomTextDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  customizationText: string;

  @IsString()
  @MaxLength(300)
  @Transform(({ value }) => value?.trim())
  notes?: string;
}
