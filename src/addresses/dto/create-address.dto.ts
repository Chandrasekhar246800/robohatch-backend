import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateAddressDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  city!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  state!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  postalCode!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  country!: string;
}

